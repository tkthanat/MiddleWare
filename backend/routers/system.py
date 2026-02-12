from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from services.notification import send_notification_smart
from services.auth_handler import get_current_user
from models import SystemStatusModel, User 

router = APIRouter(prefix="/api/system", tags=["System"])

@router.post("/status")
async def set_system_status(
    status: SystemStatusModel, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(models.SystemSetting).filter(models.SystemSetting.user_id == current_user.id).first()
    
    if not settings:
        return {"status": "error", "message": "Settings not found"}

    if settings.is_active_system != status.is_active:
        settings.is_active_system = status.is_active
        db.commit()
        
        if status.is_active:
            msg = f"▶ *SYSTEM RESUMED* ({current_user.username}) \nActive Trading Mode ON."
        else:
            msg = f"🚨 *SYSTEM STOPPED* ({current_user.username}) \nManual Stop by User."
        
        if settings.telegram_bot_token and settings.telegram_chat_id:
            background_tasks.add_task(
                send_notification_smart, 
                settings.telegram_bot_token, 
                settings.telegram_chat_id, 
                msg, 
                "INFO"
            )

    return {"status": "success", "is_active": settings.is_active_system}

@router.get("/status")
async def get_system_status(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    settings = db.query(models.SystemSetting).filter(models.SystemSetting.user_id == current_user.id).first()
    is_active = settings.is_active_system if settings else False
    
    return {
        "is_active": is_active,
        "triggered_by": "USER"
    }

@router.get("/logs")
def get_trade_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(models.TradeLog)\
             .filter(models.TradeLog.user_id == current_user.id)\
             .order_by(models.TradeLog.timestamp.desc())\
             .all()

    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "-",
            "symbol": log.symbol,
            "action": log.action,
            "volume": log.volume,
            "price": log.price,
            "status": log.status,
            "detail": log.detail
        }
        for log in logs
    ]