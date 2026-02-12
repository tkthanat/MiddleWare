from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TradeLog

def save_trade_log(log_entry: dict):
    db: Session = SessionLocal()
    try:
        ts = log_entry.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
            except:
                ts = datetime.now()
        elif not isinstance(ts, datetime):
            ts = datetime.now()

        new_log = TradeLog(
            timestamp=ts,
            symbol=log_entry.get("symbol", "-"),
            action=log_entry.get("action", "-"),
            volume=int(log_entry.get("volume", 0)),
            price=float(log_entry.get("price", 0.0)),
            status=log_entry.get("status", "UNKNOWN"),
            detail=log_entry.get("detail", ""),
            user_id=log_entry.get("user_id") 
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log.id
    except Exception as e:
        print(f"❌ Failed to save log: {e}")
        return None
    finally:
        db.close()

def get_trade_logs():
    db: Session = SessionLocal()
    try:
        logs = db.query(TradeLog).order_by(TradeLog.timestamp.desc()).all()
        return [
            {
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "symbol": log.symbol,
                "action": log.action,
                "volume": log.volume,
                "price": log.price,
                "status": log.status,
                "detail": log.detail
            }
            for log in logs
        ]
    finally:
        db.close()