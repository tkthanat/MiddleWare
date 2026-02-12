from sqlalchemy.orm import Session
from database import SessionLocal
import models

def clean_slate():
    db: Session = SessionLocal()
    try:
        # หาออเดอร์ทั้งหมดที่ยัง SUBMITTED อยู่
        ghost_orders = db.query(models.TradeLog).filter(
            models.TradeLog.status == "SUBMITTED"
        ).all()

        if not ghost_orders:
            print("✅ Database สะอาดแล้ว! ไม่มีออเดอร์ค้าง")
            return

        print(f"👻 เจอออเดอร์ผี {len(ghost_orders)} รายการ กำลังเคลียร์...")

        # เปลี่ยนสถานะเป็น EXPIRED ให้หมด
        for log in ghost_orders:
            log.status = "EXPIRED"
            log.detail = f"{log.detail} (Cleaned by Script)"
            print(f"   - Clear Order ID: {log.id}")
        
        db.commit()
        print("✨ เคลียร์เรียบร้อย! พร้อมสำหรับการเทสใหม่แล้วครับ")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_slate()