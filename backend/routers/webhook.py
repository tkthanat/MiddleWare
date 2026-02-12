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
from services.settrade_client import get_equity_instance, market
from services.risk_control import check_circuit_breaker, get_or_set_initial_equity

router = APIRouter()

# Monitor Function
async def monitor_order_status(
    account_no: str,
    order_no: str,
    symbol: str,
    action: str,
    bot_token: str,
    chat_id: str,
    target_username: str,
    log_id: int
):
    print(f"🔄 [Monitor] Tracking Order {order_no} (Log ID: {log_id})...")
    equity = get_equity_instance(account_no)
    has_notified_submitted = False
    
    for i in range(60):
        try:
            order_info = equity.get_order(order_no)
            current_status = order_info.get('showOrderStatus', 'Pending')
            reject_reason = order_info.get('rejectReason', '-')

            original_vol = int(order_info.get('vol', 0))
            balance_vol = int(order_info.get('balance', 0))
            match_vol_api = int(order_info.get('showMatchedVolume', 0))
            
            # ดึงราคาที่ Match
            executed_price = float(order_info.get('showPrice', 0) or order_info.get('price', 0))
            
            real_match_vol = match_vol_api if match_vol_api > 0 else (original_vol - balance_vol)

            db = SessionLocal()
            log_entry = db.query(models.TradeLog).filter(models.TradeLog.id == log_id).first()
            
            should_break = False

            # --- FAILED ---
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
                
                print(f"❌ [Monitor] {target_username} Order {order_no} -> DONE ({current_status})")
                should_break = True

            # --- MATCHED ---
            elif "Matched" in current_status or real_match_vol > 0:
                msg = (
                    f"✅ *Order Matched!* \n"
                    f"Symbol: `{symbol}` \n"
                    f"Side: {action} \n"
                    f"Matched Vol: {real_match_vol} \n"
                    f"Price: {executed_price} \n"
                    f"Status: {current_status}"
                )
                await send_notification_smart(bot_token, chat_id, msg, "INFO")
                
                if log_entry:
                    log_entry.status = "Success"
                    log_entry.volume = real_match_vol
                    if executed_price > 0:
                        log_entry.price = executed_price
                    log_entry.detail = f"Matched ({current_status})"
                    db.commit()
                
                print(f"✅ [Monitor] {target_username} Order {order_no} -> DONE (Matched @ {executed_price})")
                should_break = True

            # --- PENDING ---
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
@router.post("/webhook")
async def tradingview_webhook(request: Request, background_tasks: BackgroundTasks):

    try:
        data = await request.json()
        timestamp = datetime.now()
        timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        target_username = data.get('username')
        # Clean Data
        symbol = str(data.get('symbol', '')).strip().upper()
        
        print(f"[{timestamp_str}] 📩 Signal Received: {target_username} | {symbol}")

        if not target_username:
            return {"status": "Rejected", "message": "Missing 'username' in payload."}

        # Check Duplicate
        signal_id = data.get('signal_id')
        if signal_id:
            if signal_id in processed_signal_ids:
                return {"status": "Rejected", "message": "Duplicate Signal"}
            processed_signal_ids.append(signal_id)

        db = SessionLocal()
        target_user = db.query(models.User).filter(
            models.User.username == target_username, 
            models.User.is_active == True
        ).first()
        
        if not target_user:
            db.close()
            return {"status": "Error", "message": "User not found"}

        try:
            # Check Status
            user_setting_db = db.query(models.SystemSetting).filter(models.SystemSetting.user_id == target_user.id).first()
            if not user_setting_db or not user_setting_db.is_active_system:
                print(f"🚫 [Webhook] System is OFF for {target_user.username}")
                db.close()
                return {"status": "Ignored", "message": "System is OFF"}

            current_settings = await load_user_settings(target_user.id)
            bot_token = current_settings.get("telegram_bot_token")
            chat_id = current_settings.get("telegram_chat_id")
            pin = current_settings.get("pin")

            # Whitelist Check
            whitelist_raw = current_settings.get("active_symbols", "")
            if whitelist_raw:
                allowed_list = [s.strip().upper() for s in whitelist_raw.split(',') if s.strip()]
                if symbol not in allowed_list:
                    msg = f"🚫 *Signal Blocked* \nSymbol `{symbol}` not in whitelist."
                    background_tasks.add_task(send_notification_smart, bot_token, chat_id, msg, "WARNING")
                    print(f"🚫 [Whitelist] Blocked: {symbol}")
                    db.close()
                    return {"status": "Rejected", "message": "Symbol not in whitelist"}

            # Market & Account
            market_type = "TFEX" if any(char.isdigit() for char in symbol) else "SET"
            
            if market_type == "TFEX":
                account_no = current_settings.get("derivatives_account")
            else:
                account_no = current_settings.get("account_no")

            if not account_no:
                msg = f"⚠️ *Config Error* \nNo account configured for {market_type} market."
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, msg, "ERROR")
                print(f"❌ [Config] Missing account for {market_type}")
                db.close()
                return {"status": "Error", "message": f"No {market_type} account"}

            equity = get_equity_instance(account_no)
            if not equity:
                print(f"❌ [API] Failed to get instance for {account_no}")
                db.close()
                return {"status": "Error", "message": "Settrade instance error"}

            # Circuit Breaker
            initial_equity = get_or_set_initial_equity(equity)
            is_safe, guard_msg = check_circuit_breaker(equity, current_settings, initial_equity)
            
            if not is_safe:
                user_setting_db.is_active_system = False
                db.commit()
                msg = f"🚨 *MAX LOSS TRIGGERED* 🚨\nReason: `{guard_msg}`\n\n🔴 *System Auto-OFF*"
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, msg, "ERROR")
                db.close()
                return {"status": "Stopped", "message": guard_msg}

            # Prepare Order Data
            action = data.get('action', data.get('side', 'Buy')).capitalize()
            last_price = float(data.get('price', 0))
            
            if last_price == 0:
                try:
                    q = market.get_quote_symbol(symbol)
                    last_price = float(q.get('last', 0))
                except:
                    pass

            calculated_volume = 0
            if current_settings["trade_mode"] == "VOLUME" or market_type == "TFEX":
                calculated_volume = current_settings["fixed_volume"]
            elif current_settings["trade_mode"] == "AMOUNT":
                if market_type == "SET" and last_price > 0:
                    budget = current_settings["budget_per_trade"]
                    calculated_volume = (int(budget // last_price) // 100) * 100
                else:
                    calculated_volume = current_settings["fixed_volume"]

            if calculated_volume < 1:
                print(f"⚠️ [Skip] Volume {calculated_volume} invalid")
                db.close()
                return {"status": "Skipped", "message": "Volume invalid"}

            # Execution
            print(f"👤 {target_user.username} Executing ({market_type}): {action} {symbol} -> {calculated_volume} @ {last_price} on {account_no}")
            
            try:
                place_order_result = equity.place_order(
                    symbol=symbol,
                    price_type="MP-MKT",
                    side=action,
                    volume=calculated_volume,
                    price=0,
                    pin=pin,
                    validity_type="IOC"
                )
                order_no = place_order_result.get('orderNo')

                # บันทึก Log แรก
                log_id = save_trade_log({
                    "timestamp": timestamp, "symbol": symbol, "action": action,
                    "volume": calculated_volume, "price": last_price,
                    "status": "SUBMITTED", "detail": f"Order No: {order_no}",
                    "user_id": target_user.id
                })

                if log_id:
                    background_tasks.add_task(
                        monitor_order_status,
                        account_no=account_no,
                        order_no=order_no,
                        symbol=symbol,
                        action=action,
                        bot_token=bot_token,
                        chat_id=chat_id,
                        target_username=target_user.username,
                        log_id=log_id
                    )

                db.close()
                return {"status": "processed", "order_no": order_no}

            except Exception as api_err:
                error_msg = f"API Error: {str(api_err)}"
                print(f"❌ [Execution Error] {error_msg}")
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, f"❓ *Execution Failed*\n`{error_msg}`", "ERROR")
                save_trade_log({
                    "timestamp": timestamp, "symbol": symbol, "action": action,
                    "volume": calculated_volume, "price": last_price, "status": "ERROR", 
                    "detail": str(api_err), "user_id": target_user.id
                })
                db.close()
                return {"status": "Error", "message": str(api_err)}

        except Exception as u_err:
            print(f"❌ Process Error: {u_err}")
            db.close()
            return {"status": "Error", "message": str(u_err)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))