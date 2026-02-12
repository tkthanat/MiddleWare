import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from config import load_user_settings
from services.settrade_client import get_equity_instance
from services.notification import send_notification_smart

async def sync_pending_orders():
    print("⏰ [Scheduler] Checking for pending orders...")
    
    db: Session = SessionLocal()
    try:
        # รอ Webhook Monitor ทำงานให้จบก่อน
        cutoff_time = datetime.now() - timedelta(minutes=2)

        # หาออเดอร์ที่สถานะยังค้างอยู่ และ เก่ากว่า 2 นาที
        pending_logs = db.query(models.TradeLog).filter(
            models.TradeLog.status == "SUBMITTED",
            models.TradeLog.timestamp < cutoff_time 
        ).all()

        if not pending_logs:
            print("✅ No pending orders to sync.")
            return

        print(f"🔍 Found {len(pending_logs)} old pending orders. Syncing...")

        for log in pending_logs:
            try:
                # หาเจ้าของออเดอร์
                user = db.query(models.User).filter(models.User.id == log.user_id).first()
                if not user: continue

                settings = await load_user_settings(user.id)
                account_no = settings.get("account_no")
                
                if not account_no: continue

                # เชื่อมต่อ Settrade
                equity = get_equity_instance(account_no)
                
                # แกะ Order No จากช่อง Detail
                match = re.search(r"Order No: (\S+)", log.detail)
                if not match:
                    print(f"⚠️ Cannot parse Order No from log {log.id}")
                    continue
                
                order_no = match.group(1)
                
                # เช็ค Status ล่าสุดจากตลาด
                order_info = equity.get_order(order_no)
                current_status = order_info.get('showOrderStatus', 'Unknown')
                match_vol = order_info.get('showMatchedVolume', 0)
                reject_reason = order_info.get('rejectReason', '-')

                # วิเคราะห์ Status (Matched / Cancelled / Rejected)
                is_finished = False
                new_status_db = "SUBMITTED"
                notify_msg = ""
                notify_type = "INFO"

                # Matched
                if "Matched" in current_status or match_vol > 0:
                    is_finished = True
                    new_status_db = "SUCCESS"
                    notify_msg = (
                        f"✅ *Order Matched! (Late Update)*\n"
                        f"Symbol: `{log.symbol}`\n"
                        f"Order No: {order_no}\n"
                        f"Status: {current_status}"
                    )

                # Cancelled
                elif "Cancelled" in current_status:
                    is_finished = True
                    new_status_db = "CANCELLED"
                    notify_msg = (
                        f"⚠️ *Order Cancelled (Manual)*\n"
                        f"Symbol: `{log.symbol}`\n"
                        f"Order No: {order_no}\n"
                        f"Status: {current_status}"
                    )
                    notify_type = "WARNING"

                # Rejected
                elif any(k in current_status for k in ['Rejected', 'Failed', 'Error', 'Expired']):
                    is_finished = True
                    new_status_db = "ERROR"
                    notify_msg = (
                        f"❌ *Order Rejected*\n"
                        f"Symbol: `{log.symbol}`\n"
                        f"Order No: {order_no}\n"
                        f"Reason: {reject_reason}"
                    )
                    notify_type = "ERROR"

                # ถ้าสถานะเปลี่ยน อัปเดต DB และแจ้งเตือน
                if is_finished:
                    print(f"🔄 Updating Log {log.id}: {log.status} -> {new_status_db}")
                    
                    log.status = new_status_db
                    log.detail = f"{current_status}: {reject_reason} (Updated by Scheduler)"
                    log.volume = match_vol if match_vol > 0 else log.volume
                    
                    db.commit()

                    await send_notification_smart(
                        settings.get("telegram_bot_token"),
                        settings.get("telegram_chat_id"),
                        notify_msg,
                        notify_type
                    )

            except Exception as e:
                print(f"⚠️ Error syncing log {log.id}: {e}")
                continue

    except Exception as e:
        print(f"❌ Scheduler Error: {e}")
    finally:
        db.close()