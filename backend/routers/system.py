from fastapi import APIRouter, BackgroundTasks
from models import SystemStatusModel
from config import SYSTEM_STATUS
from services.notification import send_notification_smart

router = APIRouter(prefix="/api/system", tags=["System"])

@router.post("/status")
async def set_system_status(status: SystemStatusModel, background_tasks: BackgroundTasks):
    global SYSTEM_STATUS
    
    if SYSTEM_STATUS["is_active"] != status.is_active:
        SYSTEM_STATUS["is_active"] = status.is_active
        
        if status.is_active:
            msg = "▶ *SYSTEM RESUMED* \nUser manually activated the system."
            SYSTEM_STATUS["triggered_by"] = "USER_RESUME"
        else:
            msg = "🚨 *SYSTEM STOPPED* \nUser manually pressed Emergency Stop."
            SYSTEM_STATUS["triggered_by"] = "USER_STOP"
            
        background_tasks.add_task(send_notification_smart, msg, "INFO")
    
    return {"status": "success", "system_status": SYSTEM_STATUS}

@router.get("/status")
async def get_system_status():
    return SYSTEM_STATUS