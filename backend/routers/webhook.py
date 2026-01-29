from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from datetime import datetime
import time
import traceback

from config import SYSTEM_STATUS, load_user_settings
from services.notification import send_notification_smart, processed_signal_ids
from services.logger import save_trade_log
from services.settrade_client import get_equity_instance, market
from services.risk_control import check_circuit_breaker, get_or_set_initial_equity

router = APIRouter()

@router.post("/webhook")
async def tradingview_webhook(request: Request, background_tasks: BackgroundTasks):
    # Gatekeeper Check
    if not SYSTEM_STATUS["is_active"]:
        print("⛔ Signal Rejected: Emergency Stop Active.")
        return {"status": "stopped", "message": "System is offline."}

    try:
        data = await request.json()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] Received: {data}")

        # Check Duplicate
        signal_id = data.get('signal_id')
        if signal_id:
            if signal_id in processed_signal_ids:
                return {"status": "Rejected", "message": "Duplicate Signal"}
            processed_signal_ids.append(signal_id)

        # Load Settings & Init Equity
        current_settings = await load_user_settings()
        equity = get_equity_instance(current_settings["account_no"])

        # Circuit Breaker Check
        initial_equity = get_or_set_initial_equity(equity)
        is_safe, guard_msg = check_circuit_breaker(equity, current_settings, initial_equity)
        
        if not is_safe:
            log_data = {
                "timestamp": timestamp, "symbol": data.get('symbol', 'Unknown'),
                "action": "GUARD", "volume": 0, "price": 0,
                "status": "STOPPED", "detail": guard_msg
            }
            save_trade_log(log_data)
            
            alert_msg = f"🚨 *EMERGENCY STOP* 🚨\nReason: `{guard_msg}`"
            background_tasks.add_task(send_notification_smart, alert_msg, "ERROR")
            return {"status": "error", "message": guard_msg}

        # Calculate Volume (Max Guard)
        symbol = data['symbol']
        action = data['action'].capitalize()
        last_price = data.get('price', 0)
        calculated_volume = 0

        if current_settings["trade_mode"] == "VOLUME":
            calculated_volume = current_settings["fixed_volume"]
        elif current_settings["trade_mode"] == "AMOUNT":
            try:
                market_data = market.get_quote_symbol(symbol)
                m_price = market_data.get('last')
                if m_price and m_price > 0: last_price = m_price
            except: pass
            
            if last_price > 0:
                budget = current_settings["budget_per_trade"]
                calculated_volume = (int(budget // last_price) // 100) * 100

        # Min Guard
        if calculated_volume < 100:
            msg = f"⚠️ Skipped: {symbol} Vol {calculated_volume} < 100"
            background_tasks.add_task(send_notification_smart, msg, "INFO")
            return {"status": "skipped", "message": "Min Guard Triggered"}

        # Execute Order
        print(f"Executing: {action} {symbol} -> {calculated_volume} Shares")
        
        try:
            print(f"Sending Order (Single Attempt)...")

            place_order_result = equity.place_order(
                symbol=symbol,
                price_type="MP-MKT",
                side=action,
                volume=calculated_volume,
                price=0,
                pin=current_settings["pin"],
                validity_type="IOC"
            )
            
            # Check Status
            order_no = place_order_result.get('orderNo')
            time.sleep(5.0) 

            actual_info = equity.get_order(order_no)
            order_status = actual_info.get('showOrderStatus', 'Pending')
            reject_reason = actual_info.get('rejectReason', '-')

            if 'Cancelled' in order_status or 'Rejected' in order_status or 'Failed' in order_status:
                # REJECTED
                msg = (
                    f"❌ *Order Rejected!* \n"
                    f"Symbol: `{symbol}` \n"
                    f"Status : {order_status} \n"
                    f"Reason : {reject_reason} \n\n"
                    f"⚠️ *Action Required:* Please check manual."
                )
                background_tasks.add_task(send_notification_smart, msg, "ERROR")
                
                return {"status": "rejected", "message": f"{order_status}: {reject_reason}", "data": actual_info}

            else:
                # SUCCESS
                msg = (
                    f"✅ *Order Executed!* \n"
                    f"Symbol : `{symbol}`\n"
                    f"Side : {action} \n"
                    f"Vol : {calculated_volume} \n"
                    f"Status : {order_status}"
                )
                background_tasks.add_task(send_notification_smart, msg, "INFO")
                
                return {"status": "success", "data": actual_info}

        except Exception as e:
            # NETWORK ERROR
            msg = (
                f"❓ *Order Lost / Connection Failed* \n"
                f"Symbol: `{symbol}` \n"
                f"Action: {action} {calculated_volume} Vol \n"
                f"Error: `{str(e)}` \n \n"
                f"🛑 *Auto-Retry Stopped for Safety.* \n"
                f"👉 *Do you want to Resend?* \n"
                f"(Check App first, then resend manually.)"
            )
            background_tasks.add_task(send_notification_smart, msg, "ERROR")
            return {"status": "error", "message": str(e)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))