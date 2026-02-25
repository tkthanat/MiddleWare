import re
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from config import load_user_settings
from services.settrade_client import get_equity_instance, get_derivatives_instance, get_settrade_credentials
from services.notification import send_notification_smart

# --- Global Variables ---
NOTIFIED_CACHE = set()
IS_FIRST_RUN = True  

async def sync_pending_orders():
    global IS_FIRST_RUN
    
    if IS_FIRST_RUN:
        print("🚀 [Scheduler] Initializing Cache... (Silent Mode)")
    else:
        print("⏰ [Scheduler] Scanning Portfolio for updates...")
    
    db: Session = SessionLocal()
    try:
        active_setting = get_settrade_credentials()
        if not active_setting:
            return
            
        active_user_id = active_setting.user_id

        users = db.query(models.User).all()

        for user in users:
            if user.id != active_user_id:
                continue
                
            try:
                settings = await load_user_settings(user.id)
                account_no = settings.get("account_no")
                deriv_account = settings.get("derivatives_account")

                all_orders = []

                # Equity Orders
                if account_no:
                    try:
                        equity = get_equity_instance(account_no)
                        if equity:
                            all_orders.extend(equity.get_orders())
                    except Exception as ex:
                        print(f"⚠️ Equity API Error for {user.username}: {ex}")

                # TFEX Orders
                if deriv_account:
                    try:
                        tfex = get_derivatives_instance(deriv_account)
                        if tfex:
                            all_orders.extend(tfex.get_orders())
                    except Exception as ex:
                        print(f"⚠️ TFEX API Error for {user.username}: {ex}")

                if not all_orders: continue

                for order in all_orders:
                    order_no = order.get("orderNo")
                    status = order.get("showOrderStatus", "Unknown")
                    symbol = order.get("symbol")
                    side = order.get("side")
                    match_vol = order.get("vol", 0)
                    reject_reason = order.get("rejectReason", "-")
                    
                    cache_key = f"{order_no}_{status}"

                    if cache_key in NOTIFIED_CACHE:
                        continue

                    # เช็คว่า Webhook จัดการไปยัง (ดูจาก DB)
                    log = db.query(models.TradeLog).filter(models.TradeLog.detail.contains(order_no)).first()
                    
                    is_handled_by_webhook = False
                    if log:
                        if log.status in ["Success", "SUCCESS", "Failed", "ERROR"]:
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

                    # Cancelled
                    if "Cancel" in status:
                        should_notify = True
                        new_status_db = "CANCELLED"
                        notify_msg = (
                            f"⚠️ *Order Cancelled (Detected)*\n"
                            f"Symbol: `{symbol}` ({side})\n"
                            f"Order No: `{order_no}`\n"
                            f"Status: {status}"
                        )
                        notify_type = "WARNING"

                    # Matched
                    elif "Matched" in status or (isinstance(match_vol, int) and match_vol > 0):
                        should_notify = True 
                        new_status_db = "SUCCESS"
                        notify_msg = (
                            f"✅ *Order Matched!*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Order No: `{order_no}`\n"
                            f"Status: {status}\n"
                            f"Vol: {match_vol}"
                        )
                    
                    # Rejected
                    elif any(k in status for k in ['Rejected', 'Failed', 'Error', 'Expired']):
                        should_notify = True
                        new_status_db = "ERROR"
                        notify_msg = (
                            f"❌ *Order Rejected*\n"
                            f"Symbol: `{symbol}`\n"
                            f"Order No: `{order_no}`\n"
                            f"Reason: {reject_reason}"
                        )
                        notify_type = "ERROR"

                    if should_notify:
                        print(f"🔔 Sending Noti for {order_no} ({status})")
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