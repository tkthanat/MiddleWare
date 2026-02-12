from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timedelta

def force_age_latest_order():
    db: Session = SessionLocal()
    try:
        # หาออเดอร์ล่าสุดที่ยัง SUBMITTED อยู่
        latest_order = db.query(models.TradeLog).filter(
            models.TradeLog.status == "SUBMITTED"
        ).order_by(models.TradeLog.timestamp.desc()).first()

        if not latest_order:
            print("❌ ไม่พบออเดอร์ที่สถานะเป็น 'SUBMITTED' เลย")
            print("💡 คำแนะนำ: ลองยิง Signal Buy เข้ามาก่อน 1 ไม้ครับ")
            return

        print(f"🔎 เจอออเดอร์ล่าสุด: {latest_order.symbol} (Order No: {latest_order.detail})")
        print(f"⏰ เวลาเดิม: {latest_order.timestamp}")

        # แก้เวลาให้ย้อนหลังไป 10 นาที (เพื่อให้ Scheduler คิดว่าเป็นออเดอร์เก่า)
        fake_old_time = datetime.now() - timedelta(minutes=10)
        latest_order.timestamp = fake_old_time
        
        db.commit()
        
        print(f"✅ แก้ไขเวลาเสร็จสิ้น! -> เป็นเวลา: {fake_old_time}")
        print("---------------------------------------------------")
        print("🚀 วิธีทดสอบต่อ:")
        print("1. ไปที่แอป Streaming -> กด Cancel ออเดอร์นี้ทิ้งซะ")
        print("2. รอประมาณ 1 นาที (ให้ Scheduler ทำงาน)")
        print("3. ดูผลใน Telegram หรือหน้าเว็บ Log")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force_age_latest_order()