from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from datetime import datetime, time, timezone, timedelta
import asyncio
import traceback
import json
import models
from sqlalchemy.orm import Session
from database import SessionLocal
from config import load_user_settings
from services.notification import send_notification_smart, processed_signal_ids
from services.logger import save_trade_log
from services.settrade_client import get_equity_instance, get_derivatives_instance, get_market_data
from services.risk_control import check_circuit_breaker, get_or_set_initial_equity
from services import tfex_margin
from services.market_status import check_market_status

router = APIRouter()

# ฟังก์ชันเช็คว่าเป็นหุ้น หรือ TFEX
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

async def monitor_order_status(
    account_no: str, order_no: str, symbol: str, action: str,
    market_type: str, bot_token: str, chat_id: str,
    target_username: str, log_id: int, user_id: int
):
    print(f"🔄 [Monitor] Tracking {market_type} Order {order_no}...")
    
    if market_type == "TFEX":
        api = get_derivatives_instance(user_id, account_no)
    else:
        api = get_equity_instance(user_id, account_no)
        
    has_notified_submitted = False
    
    for i in range(60):
        try:
            # ดึงข้อมูลออเดอร์ทั้งหมดจาก Settrade
            order_info = api.get_order(order_no)
            current_status = str(order_info.get('showOrderStatus', order_info.get('showStatus', order_info.get('status', 'Pending'))))
            reject_reason = str(order_info.get('rejectReason', '-'))
            reject_code = int(order_info.get('rejectCode', 0))
            match_vol_api = int(order_info.get('showMatchedVolume', order_info.get('matchQty', 0)))
            cancel_vol_api = int(order_info.get('showCancelledVolume', order_info.get('cancelQty', 0)))
            executed_price = float(order_info.get('showPrice', 0) or order_info.get('price', 0))
            order_type = str(order_info.get('tradeType', order_info.get('priceType', 'Normal')))
            
            db = SessionLocal()
            log_entry = db.query(models.TradeLog).filter(models.TradeLog.id == log_id).first()
            should_break = False

            if log_entry:
                log_entry.order_no = str(order_no)
                log_entry.account_no = str(account_no)
                log_entry.matched_volume = match_vol_api
                log_entry.cancelled_volume = cancel_vol_api
                log_entry.reject_code = reject_code
                log_entry.reject_reason = reject_reason
                log_entry.order_type = order_type

                fail_keywords = ['REJECTED', 'CANCELLED', 'FAILED', 'ERROR', 'EXPIRED']
                current_status_upper = current_status.upper()
                
                if any(k in current_status_upper for k in fail_keywords):
                    msg = f"❌ *Order Rejected!* \nSymbol: `{symbol}` \nStatus: {current_status} \nReason: {reject_reason}"
                    await send_notification_smart(bot_token, chat_id, msg, "ERROR")
                    
                    if "CANCELLED" in current_status_upper:
                        log_entry.status = "Cancelled"
                    else:
                        log_entry.status = "Failed"
                        
                    log_entry.detail = f"{current_status}: {reject_reason}"
                    db.commit()
                    should_break = True

                elif "MATCH" in current_status_upper or match_vol_api > 0:
                    msg = f"✅ *Order Matched* \nSymbol: `{symbol}` \nSide: {action} \nVol: {match_vol_api} \nPrice: {executed_price} \nStatus: {current_status}"
                    await send_notification_smart(bot_token, chat_id, msg, "INFO")
                    
                    log_entry.status = "Success"
                    log_entry.volume = match_vol_api
                    if executed_price > 0: log_entry.price = executed_price
                    log_entry.detail = f"Matched ({current_status})"
                    db.commit()
                    should_break = True

                else:
                    if not has_notified_submitted:
                        init_msg = f"🚀 *Order Submitted*\nSymbol: `{symbol}`\nStatus: {current_status}"
                        await send_notification_smart(bot_token, chat_id, init_msg, "INFO")
                        has_notified_submitted = True

                    log_entry.status = "Submitted"
                    db.commit()

            db.close()
            if should_break: break
            await asyncio.sleep(1)

        except Exception as e:
            # ดักจับ Token หมดอายุระหว่างรอ Status
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

        # Duplicate Signal Guard
        signal_id = data.get('signal_id')
        if signal_id:
            if signal_id in processed_signal_ids:
                return {"status": "Rejected", "message": "Duplicate Signal"}
            processed_signal_ids.append(signal_id)

        # ดึงข้อมูล User และตั้งค่าระบบ (User Configurations)
        user_setting_db = db.query(models.SystemSetting).filter(models.SystemSetting.webhook_token == webhook_token).first()
        if not user_setting_db:
            db.close()
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid Webhook Token")
            
        target_user = db.query(models.User).filter(models.User.id == user_setting_db.user_id, models.User.is_active == True).first()
        if not target_user:
            db.close()
            return {"status": "Error", "message": "User not found or inactive"}

        # Emergency Kill Switch
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

        # Rate Limit
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
                print(f"🛑 [Rate Limit] บล็อกคำสั่งซ้ำ: {symbol} {raw_action}")
                db.close()
                return {"status": "Rejected", "message": "Rate limit exceeded"}

        # เชื่อมต่อ Settrade API (Equity / TFEX)
        if req_market == "TFEX" or is_tfex(symbol, raw_action):
            market_type = "TFEX"
            account_no = current_settings.get("derivatives_account")
            api_instance = get_derivatives_instance(target_user.id, account_no)
        else:
            market_type = "SET"
            account_no = current_settings.get("account_no")
            api_instance = get_equity_instance(target_user.id, account_no)

        if not account_no or not api_instance:
            msg = f"⚠️ *Config Error* \nNo account or API connection for {market_type}."
            background_tasks.add_task(send_notification_smart, bot_token, chat_id, msg, "ERROR")
            db.close()
            return {"status": "Error", "message": f"Setup failed for {market_type}"}

        # Volume Calculation & Risk Control Logic
        calculated_volume = req_volume
        is_insufficient_funds = False
        warn_reason = ""

        if calculated_volume < 1:
            allocation_type = current_settings.get("allocation_type", "FIX")
            
            temp_price = price if price > 0 else 1
            if price == 0:
                try:
                    mkt = get_market_data(target_user.id)
                    if mkt: temp_price = float(mkt.get_quote_symbol(symbol).get('last', 0))
                except: pass
                if temp_price == 0: temp_price = 1

            # ดึงเงินในพอร์ตล่าสุดเพื่อเช็ค Risk
            capital = 0.0
            excess_equity = 0.0
            try:
                acc_info = api_instance.get_account_info()
                if market_type == "TFEX":
                    excess_equity = float(acc_info.get('excessEquity', 0))
                else:
                    capital = float(acc_info.get('lineAvailable', acc_info.get('equity', 0)))
            except Exception as e:
                print(f"⚠️ Account Info Check Error: {e}")

            if allocation_type == "FIX":
                if market_type == "TFEX":
                    calculated_volume = int(current_settings.get("tfex_volume", 1))
                    
                    im_rate = tfex_margin.TFEX_MARGIN_CACHE.get(symbol)
                    if im_rate and im_rate > 0:
                        required_margin = calculated_volume * im_rate
                        if excess_equity < required_margin:
                            is_insufficient_funds = True
                            warn_reason = f"ต้องการหลักประกัน {required_margin:,.2f} ฿ แต่พอร์ตมี EE {excess_equity:,.2f} ฿"
                else:
                    if current_settings.get("trade_mode") == "VOLUME":
                        calculated_volume = current_settings.get("fixed_volume", 100)
                    else:
                        budget = float(current_settings.get("budget_per_trade", 0))
                        raw_vol = int(budget // temp_price)
                        # บังคับปัดลงเป็น Board Lot (100) หรือ ปล่อยเป็น Odd Lot ถ้าน้อยกว่า 100
                        calculated_volume = (raw_vol // 100) * 100 if raw_vol >= 100 else raw_vol
                        
                        if capital < budget:
                            is_insufficient_funds = True
                            warn_reason = f"งบ {budget:,.2f} ฿ แต่พอร์ตมี Line Available {capital:,.2f} ฿"
            
            elif allocation_type == "DYNAMIC":
                percent = float(current_settings.get("dynamic_percent", 10.0))
                
                if market_type == "TFEX":
                    budget_tfex = excess_equity * (percent / 100)
                    im_rate = tfex_margin.TFEX_MARGIN_CACHE.get(symbol)
                    if im_rate and im_rate > 0:
                        calculated_volume = int(budget_tfex // im_rate)
                        if calculated_volume < 1:
                            is_insufficient_funds = True
                            warn_reason = f"งบ {percent}% ({budget_tfex:,.2f} ฿) ไม่พอจ่ายค่า IM 1 สัญญา ({im_rate:,.2f} ฿)"
                    else:
                        calculated_volume = 1
                else:
                    budget_set = capital * (percent / 100)
                    raw_vol = int(budget_set // temp_price)
                    # บังคับปัดลงเป็น Board Lot (100) หรือ ปล่อยเป็น Odd Lot ถ้าน้อยกว่า 100
                    calculated_volume = (raw_vol // 100) * 100 if raw_vol >= 100 else raw_vol
                    
                    if calculated_volume < 1:
                        is_insufficient_funds = True
                        warn_reason = f"งบ {percent}% ({budget_set:,.2f} ฿) ไม่พอซื้อหุ้น (ขั้นต่ำ 1 หุ้น)"

        # Risk Guard
        if is_insufficient_funds or calculated_volume < 1:
            warn_msg = f"⚠️ *Trade Skipped (ยอดเงินไม่พอ)*\nSymbol: `{symbol}`\nAction: {raw_action}\nDetail: {warn_reason}"
            print(f"🛑 [Risk Control] {warn_msg.replace('*', '').replace('`', '')}")
            
            if target_user and bot_token and chat_id:
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, warn_msg, "WARNING")
                
            save_trade_log({
                "timestamp": timestamp, "symbol": symbol, "action": raw_action,
                "volume": 0, "price": price,
                "status": "SKIPPED", "detail": f"Insufficient funds: {warn_reason}",
                "user_id": target_user.id
            })
            db.close()
            return {"status": "Skipped", "message": "Insufficient funds"}

        # Price Type และ Validity
        user_price_type = current_settings.get("price_type", "MP-MKT")
        
        if user_price_type == "Limit" and price > 0:
            final_price_type = "Limit"
            final_validity = "Day"
            exec_price = price
        else:
            final_price_type = user_price_type if user_price_type != "Limit" else "MP-MKT"
            final_validity = "IOC" if final_price_type in ["MP-MKT", "MP-MTL"] else "Day"
            exec_price = 0.0

        # Market Close Protection
        if not check_market_status(market_type=market_type, user_id=target_user.id, check_symbol=symbol):
            warn_msg = f"⏳ *Market Closed (Order Queued)*\nSymbol: `{symbol}`\nAction: {raw_action}\nVol: {calculated_volume}\nPrice: {price}"
            print(f"🛑 [Market Close] {symbol} ถูกจัดเก็บลง Database เพื่อรอตลาดเปิด")
            
            if target_user and bot_token and chat_id:
                background_tasks.add_task(send_notification_smart, bot_token, chat_id, warn_msg, "INFO")
                
            save_trade_log({
                "timestamp": timestamp, "symbol": symbol, "action": raw_action,
                "volume": calculated_volume, "price": price,
                "status": "WAITING_MARKET_OPEN", 
                "detail": json.dumps({
                    "market": market_type, 
                    "price_type": final_price_type, 
                    "validity": final_validity
                }),
                "user_id": target_user.id
            })
            db.close()
            return {"status": "Queued", "message": "Market is closed. Order saved for later."}

        # Execution Logic
        print(f"🚀 Executing {market_type}: {raw_action} {symbol} Vol:{calculated_volume}")
        order_result = {}
        
        def execute_order(current_api):
            if market_type == "TFEX":
                tfex_side = "Long"
                tfex_position = "Open"
                if "SHORT" in raw_action: tfex_side = "Short"
                if "CLOSE" in raw_action: tfex_position = "Close"
                if raw_action == "CLOSE_LONG": tfex_side = "Short"
                if raw_action == "CLOSE_SHORT": tfex_side = "Long"
                if raw_action == "BUY": tfex_side = "Long"
                if raw_action == "SELL": tfex_side = "Short"

                return current_api.place_order(
                    symbol=symbol, side=tfex_side, position=tfex_position, volume=calculated_volume,
                    price=exec_price, price_type=final_price_type, pin=pin, validity_type=final_validity
                )
            else: 
                final_side = "Buy" if "BUY" in raw_action else "Sell"
                return current_api.place_order(
                    symbol=symbol, side=final_side, volume=calculated_volume, price=exec_price,
                    price_type=final_price_type, pin=pin, validity_type=final_validity
                )

        # ยิงคำสั่งโดยใช้ Session เดิม ถ้าพัง จะเด้งไปเข้า Exception ของ Webhook หลักเพื่อบันทึกเป็น Error
        order_result = execute_order(api_instance)

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
                chat_id=chat_id, target_username=target_user.username, log_id=log_id,
                user_id=target_user.id
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