import re
import json
import asyncio
import time
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from config import load_user_settings
from services.settrade_client import get_equity_instance, get_derivatives_instance, get_market_data, force_reconnect
from services.notification import send_notification_smart
from services.market_status import check_market_status

# --- Global Variables ---
NOTIFIED_CACHE = set()
IS_FIRST_RUN = True  
LAST_HEARTBEAT = {}

async def sync_pending_orders():
    global IS_FIRST_RUN, LAST_HEARTBEAT
    
    if IS_FIRST_RUN:
        print("🚀 [Scheduler] Initializing Cache... (Silent Mode)")
    
    db: Session = SessionLocal()
    try:
        # Multi-User Logic
        users = db.query(models.User).filter(models.User.is_active == True).all()

        for user in users:
            try:
                settings = await load_user_settings(user.id)

                if not settings.get("is_active_system", False):
                    continue
                    
                account_no = settings.get("account_no")
                deriv_account = settings.get("derivatives_account")

                # Logic Heartbeat & Token Keep-Alive (ทำงานทุกๆ 5 นาที)
                current_time = time.time()
                if current_time - LAST_HEARTBEAT.get(user.id, 0) > 300:
                    try:
                        # ยิง Ping เบาๆ ไปที่ Settrade (ดึงข้อมูลพอร์ต) เพื่อรักษาสถานะ Active
                        api_response = None
                        if account_no:
                            eq = get_equity_instance(user.id, account_no)
                            if eq: api_response = eq.get_account_info()
                        elif deriv_account:
                            tf = get_derivatives_instance(user.id, deriv_account)
                            if tf: api_response = tf.get_account_info()

                        # เช็คว่าใน Response มีข้อความ Error ซ่อนอยู่ไหม
                        if api_response:
                            res_str = str(api_response).lower()
                            if "token" in res_str or "expired" in res_str or "invalid" in res_str or "unauthorized" in res_str:
                                raise Exception(f"Token Expired Response: {api_response}")

                        LAST_HEARTBEAT[user.id] = current_time
                        print(f"💓 [Heartbeat] เช็ค Token ของ {user.username} สำเร็จ! (พร้อมยิง 100%)")
                        
                    except Exception as e:
                        err_str = str(e).lower()
                        if "token" in err_str or "expired" in err_str or "invalid" in err_str or "unauthorized" in err_str:
                            print(f"🔄 [Heartbeat] Token ของ {user.username} หมดอายุ! กำลังต่ออายุอัตโนมัติ (Proactive Reconnect)...")
                            force_reconnect(user.id)
                            LAST_HEARTBEAT[user.id] = current_time
                        else:
                            print(f"⚠️ [Heartbeat] ตรวจพบปัญหาการเชื่อมต่อ: {e}")

                # Market Close Protection
                waiting_orders = db.query(models.TradeLog).filter(
                    models.TradeLog.user_id == user.id,
                    models.TradeLog.status == "WAITING_MARKET_OPEN"
                ).all()

                for w_order in waiting_orders:
                    try:
                        detail_data = json.loads(w_order.detail)
                        market_type = detail_data.get("market", "SET")
                        final_price_type = detail_data.get("price_type", "MP-MKT")
                        final_validity = detail_data.get("validity", "Day")
                    except: 
                        continue
                        
                    # ตรวจสอบสถานะตลาดผ่าน API
                    if not check_market_status(market_type=market_type, user_id=user.id, check_symbol=w_order.symbol):
                        continue
                        
                    # ตลาดเปิด เช็คราคาปัจจุบันจาก Settrade
                    current_price = 0
                    fetch_success = False
                    
                    try:
                        mkt = get_market_data(user.id)
                        if mkt:
                            quote = mkt.get_quote_symbol(w_order.symbol)
                            if quote and 'last' in quote:
                                current_price = float(quote.get('last', 0))
                                fetch_success = True
                    except Exception as e: 
                        print(f"⚠️ [Scheduler] ดึงราคาล่าสุดของ {w_order.symbol} ไม่สำเร็จ: {e}")
                        
                    # ถ้าดึงราคาไม่ได้ ให้ข้ามลูปไปก่อน (รอเช็ครอบถัดไป)
                    if not fetch_success and w_order.price != 0:
                        continue
                        
                    # เช็คเงื่อนไขตามที่บรีฟ (ถ้าราคาเดิม = 0 แปลว่าเป็น MP-MKT อนุญาตให้ผ่านเลย)
                    is_price_matched = False
                    if w_order.price == 0:
                        is_price_matched = True
                    elif current_price == w_order.price:
                        is_price_matched = True
                        
                    if not is_price_matched:
                        # เงื่อนไขไม่ตรง ยกเลิกทิ้งทันที
                        w_order.status = "CANCELLED"
                        w_order.detail = f"Price mismatch: Original={w_order.price}, Current={current_price}"
                        db.commit()
                        
                        msg = f"🚫 *Queued Order Cancelled*\nSymbol: `{w_order.symbol}`\nReason: ราคาตลาดไม่ตรงกับตอนเกิดสัญญาณ ({w_order.price} -> {current_price})"
                        await send_notification_smart(settings.get("telegram_bot_token"), settings.get("telegram_chat_id"), msg, "WARNING")
                        continue
                        
                    # ถ้าเงื่อนไขผ่านหมดแล้ว ส่งคำสั่งจริงเข้าสู่ตลาด
                    try:
                        order_result = {}
                        pin = settings.get("pin")
                        exec_price = round(w_order.price, 2) if final_price_type == "Limit" else 0.0

                        if market_type == "TFEX":
                            api = get_derivatives_instance(user.id, settings.get("derivatives_account"))
                            raw_action = w_order.action
                            tfex_side = "Long"
                            tfex_position = "Open"
                            if "SHORT" in raw_action: tfex_side = "Short"
                            if "CLOSE" in raw_action: tfex_position = "Close"
                            if raw_action == "CLOSE_LONG": tfex_side = "Short"
                            if raw_action == "CLOSE_SHORT": tfex_side = "Long"
                            if raw_action == "BUY": tfex_side = "Long"
                            if raw_action == "SELL": tfex_side = "Short"

                            order_result = api.place_order(
                                symbol=w_order.symbol, side=tfex_side, position=tfex_position, volume=w_order.volume,
                                price=exec_price, price_type=final_price_type, pin=pin, validity_type=final_validity
                            )
                        else:
                            api = get_equity_instance(user.id, settings.get("account_no"))
                            final_side = "Buy" if "BUY" in w_order.action else "Sell"
                            order_result = api.place_order(
                                symbol=w_order.symbol, side=final_side, volume=w_order.volume, price=exec_price,
                                price_type=final_price_type, pin=pin, validity_type=final_validity
                            )
                            
                        order_no = order_result.get('orderNo')
                        w_order.status = "SUBMITTED"
                        w_order.detail = f"Order No: {order_no} (Queued Exec)"
                        db.commit()
                        
                        msg = f"🚀 *Queued Order Submitted*\nSymbol: `{w_order.symbol}`\nVol: {w_order.volume}\nStatus: Sent to Market"
                        await send_notification_smart(settings.get("telegram_bot_token"), settings.get("telegram_chat_id"), msg, "INFO")
                        
                    except Exception as e:
                        w_order.status = "ERROR"
                        w_order.detail = f"Queued Exec Error: {str(e)}"
                        db.commit()

                # Targeted Polling
                has_pending = db.query(models.TradeLog).filter(
                    models.TradeLog.user_id == user.id,
                    models.TradeLog.status.in_(["SUBMITTED", "PENDING", "UNKNOWN"])
                ).first()

                if not IS_FIRST_RUN and not has_pending:
                    continue

                # Rate Limit Smoothing
                if not IS_FIRST_RUN:
                    await asyncio.sleep(0.2)

                all_orders = []

                # Equity Orders
                if account_no:
                    try:
                        equity = get_equity_instance(user.id, account_no)
                        if equity:
                            all_orders.extend(equity.get_orders())
                    except Exception as ex:
                        # ดักจับ Token หมดอายุระหว่างเช็คออเดอร์
                        err_str = str(ex).lower()
                        if "token" in err_str or "expired" in err_str:
                            force_reconnect(user.id)

                # TFEX Orders
                if deriv_account:
                    try:
                        tfex = get_derivatives_instance(user.id, deriv_account)
                        if tfex:
                            all_orders.extend(tfex.get_orders())
                    except Exception as ex:
                        # ดักจับ Token หมดอายุระหว่างเช็คออเดอร์
                        err_str = str(ex).lower()
                        if "token" in err_str or "expired" in err_str:
                            force_reconnect(user.id)

                if not all_orders: continue

                for order in all_orders:
                    order_no = str(order.get("orderNo", "")).strip()

                    if not order_no: 
                        continue

                    status = str(order.get("showOrderStatus", order.get("showStatus", order.get("status", "Unknown"))))
                    symbol = str(order.get("symbol", ""))

                    raw_side = str(order.get("side", "")).upper()
                    raw_pos = str(order.get("position", "")).upper()
                    
                    if raw_pos in ["OPEN", "CLOSE"]:
                        side = f"{raw_pos} {raw_side}"
                    else:
                        side = raw_side

                    match_vol = int(order.get("showMatchedVolume", order.get("matchQty", 0)))
                    reject_reason = str(order.get("rejectReason", "-"))

                    raw_price = float(order.get("price", 0))
                    price_str = str(raw_price) if raw_price > 0 else "MKT"
                    
                    # แยก Cache Key ตาม User 
                    cache_key = f"{user.id}_{order_no}_{status}"

                    if cache_key in NOTIFIED_CACHE:
                        continue

                    # เช็คว่าบอทสั่ง หรือ กดมือ
                    log = db.query(models.TradeLog).filter(models.TradeLog.detail.contains(order_no)).first()
                    is_bot_order = bool(log)
                    
                    is_handled_by_webhook = False
                    if log:
                        if log.status in ["Success", "SUCCESS", "Failed", "ERROR", "CANCELLED"]:
                            is_handled_by_webhook = True

                    if is_handled_by_webhook and not IS_FIRST_RUN:
                        NOTIFIED_CACHE.add(cache_key)
                        continue

                    if IS_FIRST_RUN:
                        NOTIFIED_CACHE.add(cache_key)
                        continue

                    notify_msg = ""
                    notify_type = "INFO"
                    should_notify = False
                    new_status_db = None

                    status_upper = status.upper()
                    tag = "(Auto)" if is_bot_order else "(Manual)"

                    # Cancelled
                    if "CANCEL" in status_upper:
                        should_notify = True
                        new_status_db = "CANCELLED"
                        notify_msg = (
                            f"⚠️ *Order Cancelled {tag}*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Side: {side}\n"
                            f"Order No: `{order_no}`\n"
                            f"Status: {status}"
                        )
                        notify_type = "WARNING"

                    # Matched
                    elif "MATCH" in status_upper or match_vol > 0:
                        should_notify = True 
                        new_status_db = "SUCCESS"
                        notify_msg = (
                            f"✅ *Order Matched {tag}*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Side: {side}\n"
                            f"Order No: `{order_no}`\n"
                            f"Price: {price_str}\n"
                            f"Vol: {match_vol}\n"
                            f"Status: {status}"
                        )
                    
                    # Rejected
                    elif any(k in status_upper for k in ['REJECT', 'FAIL', 'ERROR', 'EXPIRE']):
                        should_notify = True
                        new_status_db = "ERROR"
                        notify_msg = (
                            f"❌ *Order Rejected {tag}*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Side: {side}\n"
                            f"Order No: `{order_no}`\n"
                            f"Reason: {reject_reason}"
                        )
                        notify_type = "ERROR"
                        
                    # Pending (Manual)
                    elif any(k in status_upper for k in ['PENDING', 'OPEN', 'NEW', 'W']) and not is_bot_order:
                        should_notify = True
                        notify_msg = (
                            f"📝 *Order Submitted (Manual)*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Side: {side}\n"
                            f"Order No: `{order_no}`\n"
                            f"Price: {price_str}\n"
                            f"Status: {status}"
                        )

                    if should_notify:
                        print(f"🔔 [User {user.username}] Sending Noti for {order_no} ({status})")
                        await send_notification_smart(
                            settings.get("telegram_bot_token"),
                            settings.get("telegram_chat_id"),
                            notify_msg,
                            notify_type
                        )
                        
                        if new_status_db and log:
                            log.status = new_status_db
                            log.detail = f"{status}: {reject_reason} (Synced)"
                            db.commit()

                    NOTIFIED_CACHE.add(cache_key)

            except Exception as e:
                print(f"⚠️ Error loop user {user.username}: {e}")
                continue

        if IS_FIRST_RUN:
            print("✅ Cache Initialized. Ready for Real-time updates.")
            IS_FIRST_RUN = False

    except Exception as e:
        print(f"❌ Scheduler Main Error: {e}")
    finally:
        db.close()