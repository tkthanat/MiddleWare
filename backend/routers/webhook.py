from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from datetime import datetime
import asyncio
import traceback
import models
from sqlalchemy.orm import Session
from database import SessionLocal
from config import load_user_settings
from services.notification import send_notification_smart, processed_signal_ids
from services.logger import save_trade_log
from services.settrade_client import get_equity_instance, get_derivatives_instance, market
from services.risk_control import check_circuit_breaker, get_or_set_initial_equity

router = APIRouter()

# Helper Function ตรวจสอบว่าเป็น TFEX ไหม
def is_tfex(symbol: str, action: str) -> bool:
    symbol = symbol.upper().strip()
    action = action.upper().strip()

    tfex_actions = ["LONG", "SHORT", "OPEN_LONG", "OPEN_SHORT", "CLOSE_LONG", "CLOSE_SHORT"]
    if action in tfex_actions:
        return True

    has_digit = any(char.isdigit() for char in symbol)
    if has_digit and len(symbol) >= 4:
        return True
        
    return False

# Monitor Function
async def monitor_order_status(
    account_no: str,
    order_no: str,
    symbol: str,
    action: str,
    market_type: str,
    bot_token: str,
    chat_id: str,
    target_username: str,
    log_id: int
):
    print(f"🔄 [Monitor] Tracking {market_type} Order {order_no}...")
    
    if market_type == "TFEX":
        api = get_derivatives_instance(account_no)
    else:
        api = get_equity_instance(account_no)
        
    has_notified_submitted = False
    
    for i in range(60):
        try:
            order_info = api.get_order(order_no)
            current_status = order_info.get('showOrderStatus', 'Pending')
            reject_reason = order_info.get('rejectReason', '-')

            match_vol_api = int(order_info.get('showMatchedVolume', 0))
            executed_price = float(order_info.get('showPrice', 0) or order_info.get('price', 0))
            
            db = SessionLocal()
            log_entry = db.query(models.TradeLog).filter(models.TradeLog.id == log_id).first()
            should_break = False

            fail_keywords = ['Rejected', 'Cancelled', 'Failed', 'Error', 'Expired']
            if any(k in current_status for k in fail_keywords):
                msg = (
                    f"❌ *Order Rejected!* \n"
                    f"Symbol: `{symbol}` \n"
                    f"Status: {current_status} \n"
                    f"Reason: {reject_reason}"
                )
                await send_notification_smart(bot_token, chat_id, msg, "ERROR")
                
                if log_entry:
                    log_entry.status = "Failed"
                    log_entry.detail = f"{current_status}: {reject_reason}"
                    db.commit()
                should_break = True

            elif "Matched" in current_status or match_vol_api > 0:
                msg = (
                    f"✅ *Order Matched!* \n"
                    f"Symbol: `{symbol}` \n"
                    f"Side: {action} \n"
                    f"Vol: {match_vol_api} \n"
                    f"Price: {executed_price} \n"
                    f"Status: {current_status}"
                )
                await send_notification_smart(bot_token, chat_id, msg, "INFO")
                
                if log_entry:
                    log_entry.status = "Success"
                    log_entry.volume = match_vol_api
                    if executed_price > 0:
                        log_entry.price = executed_price
                    log_entry.detail = f"Matched ({current_status})"
                    db.commit()
                should_break = True

            else:
                if not has_notified_submitted:
                    init_msg = f"🚀 *Order Submitted*\nSymbol: `{symbol}`\nStatus: {current_status}"
                    await send_notification_smart(bot_token, chat_id, init_msg, "INFO")
                    has_notified_submitted = True

            db.close()
            if should_break: break
            await asyncio.sleep(1)

        except Exception as e:
            print(f"⚠️ [Monitor Error] {e}") 
            await asyncio.sleep(1)
            continue

# Webhook Endpoint
@router.post("/webhook/{webhook_token}")
async def tradingview_webhook(webhook_token: str, request: Request, background_tasks: BackgroundTasks):
    db = SessionLocal()
    target_user = None
    bot_token = None
    chat_id = None
    symbol = "UNKNOWN"
    raw_action = "UNKNOWN"
    price = 0.0

    try:
        data = await request.json()
        timestamp = datetime.now()
        
        raw_action = data.get('action', data.get('side', '')).strip().upper()
        symbol = str(data.get('symbol', '')).strip().upper()
        price = float(data.get('price', 0))
        
        req_volume = int(data.get('volume', 0))
        req_market = str(data.get('market', '')).strip().upper()

        print(f"📩 Webhook Signal | Token: {webhook_token[:6]}... | Action: {raw_action} | Symbol: {symbol} | Vol: {req_volume}")

        # ป้องกัน Signal ซ้ำ (แบบใช้ ID แนบมา)
        signal_id = data.get('signal_id')
        if signal_id:
            if signal_id in processed_signal_ids:
                return {"status": "Rejected", "message": "Duplicate Signal"}
            processed_signal_ids.append(signal_id)

        # Authentication หา User จาก Token
        user_setting_db = db.query(models.SystemSetting).filter(models.SystemSetting.webhook_token == webhook_token).first()
        
        if not user_setting_db:
            db.close()
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid Webhook Token")
            
        target_user = db.query(models.User).filter(
            models.User.id == user_setting_db.user_id, 
            models.User.is_active == True
        ).first()
        
        if not target_user:
            db.close()
            return {"status": "Error", "message": "User not found or inactive"}

        # ตรวจสอบสถานะและตั้งค่าของ User
        if not user_setting_db.is_active_system:
            print(f"🚫 System OFF for {target_user.username}")
            db.close()
            return {"status": "Ignored", "message": "System is OFF"}

        current_settings = await load_user_settings(target_user.id)
        bot_token = current_settings.get("telegram_bot_token")
        chat_id = current_settings.get("telegram_chat_id")
        pin = current_settings.get("pin")

        # Whitelist
        whitelist_raw = current_settings.get("active_symbols", "")
        if whitelist_raw:
            allowed_list = [s.strip().upper() for s in whitelist_raw.split(',') if s.strip()]
            if symbol not in allowed_list:
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, f"🚫 Blocked: {symbol}", "WARNING")
                db.close()
                return {"status": "Rejected", "message": "Symbol not in whitelist"}

        # Time-based Rate Limiting
        last_trade = db.query(models.TradeLog).filter(
            models.TradeLog.user_id == target_user.id,
            models.TradeLog.symbol == symbol,
            models.TradeLog.action == raw_action
        ).order_by(models.TradeLog.timestamp.desc()).first()

        if last_trade and last_trade.timestamp:
            t_now = timestamp.replace(tzinfo=None)
            t_last = last_trade.timestamp.replace(tzinfo=None)
            diff_seconds = abs((t_now - t_last).total_seconds())
            
            if diff_seconds < 10:
                print(f"🛑 [Rate Limit] บล็อกคำสั่งซ้ำ: {symbol} {raw_action} (ห่างกันแค่ {diff_seconds:.1f} วินาที)")
                db.close()
                return {"status": "Rejected", "message": f"Rate limit exceeded. Please wait {10 - diff_seconds:.1f}s"}

        # Market Selection Logic
        if req_market == "TFEX" or is_tfex(symbol, raw_action):
            market_type = "TFEX"
            account_no = current_settings.get("derivatives_account")
            api_instance = get_derivatives_instance(account_no)
        else:
            market_type = "SET"
            account_no = current_settings.get("account_no")
            api_instance = get_equity_instance(account_no)

        if not account_no or not api_instance:
            msg = f"⚠️ *Config Error* \nNo account or API connection for {market_type}."
            background_tasks.add_task(send_notification_smart, bot_token, chat_id, msg, "ERROR")
            db.close()
            return {"status": "Error", "message": f"Setup failed for {market_type}"}

        # Volume Calculation Logic
        calculated_volume = req_volume
        if calculated_volume < 1:
            if market_type == "TFEX":
                calculated_volume = 1 
            else:
                if current_settings["trade_mode"] == "VOLUME":
                    calculated_volume = current_settings["fixed_volume"]
                elif current_settings["trade_mode"] == "AMOUNT":
                    temp_price = price if price > 0 else 1
                    if price == 0:
                        try:
                            q = market.get_quote_symbol(symbol)
                            temp_price = float(q.get('last', 0))
                        except: pass
                    budget = current_settings["budget_per_trade"]
                    calculated_volume = (int(budget // temp_price) // 100) * 100

        if calculated_volume < 1:
            print(f"⚠️ Volume Invalid: {calculated_volume}")
            db.close()
            return {"status": "Skipped", "message": "Volume too low"}
        
        # Execution Logic
        print(f"🚀 Executing {market_type}: {raw_action} {symbol} Vol:{calculated_volume}")
        order_result = {}
        
        if market_type == "TFEX":
            tfex_side = "Long"
            tfex_position = "Open"
            if "SHORT" in raw_action: tfex_side = "Short"
            if "CLOSE" in raw_action: tfex_position = "Close"
            if raw_action == "CLOSE_LONG": tfex_side = "Short"
            if raw_action == "CLOSE_SHORT": tfex_side = "Long"
            if raw_action == "BUY": tfex_side = "Long"
            if raw_action == "SELL": tfex_side = "Short"

            is_market_price = (price <= 0)
            final_price_type = "Limit"
            final_validity = "Day"
            if is_market_price:
                final_price_type = "MP-MKT" 
                final_validity = "IOC"      

            order_result = api_instance.place_order(
                symbol=symbol, side=tfex_side, position=tfex_position, volume=calculated_volume,
                price=price, price_type=final_price_type, pin=pin, validity_type=final_validity
            )
        else: 
            final_side = "Buy" if "BUY" in raw_action else "Sell"
            is_market_price = (price <= 0)
            validity = "Day"
            if is_market_price: validity = "IOC"

            order_result = api_instance.place_order(
                symbol=symbol, side=final_side, volume=calculated_volume, price=price,
                price_type="Limit" if price > 0 else "MP-MKT", pin=pin, validity_type=validity
            )

        order_no = order_result.get('orderNo')

        log_id = save_trade_log({
            "timestamp": timestamp, "symbol": symbol, "action": raw_action,
            "volume": calculated_volume, "price": price,
            "status": "SUBMITTED", "detail": f"Order No: {order_no} ({market_type})",
            "user_id": target_user.id
        })

        if log_id:
            background_tasks.add_task(
                monitor_order_status,
                account_no=account_no, order_no=order_no, symbol=symbol,
                action=raw_action, market_type=market_type, bot_token=bot_token,
                chat_id=chat_id, target_username=target_user.username, log_id=log_id
            )

        db.close()
        return {"status": "processed", "market": market_type, "order_no": order_no}

    except HTTPException as he:
        raise he
    except Exception as u_err:
        error_msg = f"Execution Error: {str(u_err)}"
        print(f"❌ {error_msg}")
        if target_user and bot_token and chat_id:
            background_tasks.add_task(send_notification_smart, bot_token, chat_id, f"⚠️ *Failed*\n`{error_msg}`", "ERROR")
            save_trade_log({
                "timestamp": datetime.now(), "symbol": symbol, "action": raw_action,
                "volume": 0, "price": price, "status": "ERROR", 
                "detail": str(u_err), "user_id": target_user.id
            })
        db.close()
        return {"status": "Error", "message": str(u_err)}