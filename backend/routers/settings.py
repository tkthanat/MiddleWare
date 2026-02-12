from fastapi import APIRouter, HTTPException, Depends
from models import SettingsModel, User 
from config import load_user_settings, save_user_settings
from services.logger import get_trade_logs
from services.settrade_client import get_equity_instance
from datetime import datetime
from services.auth_handler import get_current_user

router = APIRouter()

@router.get("/api/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    return await load_user_settings(current_user.id)

@router.post("/api/settings")
async def save_settings(settings: SettingsModel, current_user: User = Depends(get_current_user)):
    try:
        await save_user_settings(current_user.id, settings.dict())
        return {"status": "success", "message": "Settings saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/logs")
async def read_logs():
    return get_trade_logs()

@router.get("/health/settrade")
async def health_check():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        current_settings = await load_user_settings(1)
        
        acc_no = current_settings.get("account_no")
        tfex_no = current_settings.get("derivatives_account")
        
        if not acc_no and not tfex_no:
             return {"status": "warning", "message": "No Account Configured", "timestamp": timestamp}

        check_acc = acc_no if acc_no else tfex_no
        equity = get_equity_instance(check_acc)
        info = equity.get_account_info()
        
        print(f"[{timestamp}] 🟢 Health Check: ONLINE ({check_acc})")
        return {"status": "ok", "message": "Active", "timestamp": timestamp}
        
    except Exception as e:
        print(f"[{timestamp}] 🔴 Health Check: OFFLINE | {e}")
        return {"status": "error", "message": str(e), "timestamp": timestamp}