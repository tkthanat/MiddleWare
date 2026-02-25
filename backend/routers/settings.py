from fastapi import APIRouter, HTTPException, Depends
from models import SettingsModel, User 
from config import load_user_settings, save_user_settings
from services.logger import get_trade_logs
from services.settrade_client import get_equity_instance, get_derivatives_instance, setup_client
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
        
        # Reload Settrade Client
        print(f"🔄 Reloading Settrade Client based on new settings...")
        setup_client(
            app_id=settings.app_id,
            app_secret=settings.app_secret,
            broker_id=settings.broker_id,
            app_code=settings.app_code,
            is_sandbox=settings.is_sandbox
        )
        
        return {"status": "success", "message": "Settings saved & System Reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/logs")
async def read_logs():
    return get_trade_logs()

@router.get("/health/settrade")
async def health_check(current_user: User = Depends(get_current_user)):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        current_settings = await load_user_settings(current_user.id)
        
        acc_no = current_settings.get("account_no")
        tfex_no = current_settings.get("derivatives_account")
        is_sandbox = current_settings.get("is_sandbox", True)
        
        if not acc_no and not tfex_no:
             return {"status": "warning", "message": "No Account Configured", "timestamp": timestamp}

        # แยกเช็ค TFEX หรือ SET
        if tfex_no:
            client = get_derivatives_instance(tfex_no)
        else:
            client = get_equity_instance(acc_no)
        
        if client:
            mode_label = "SANDBOX" if is_sandbox else "PRODUCTION"
            print(f"[{timestamp}] 🟢 Health Check: ONLINE ({mode_label})")
            return {"status": "ok", "message": f"Active ({mode_label})", "timestamp": timestamp}
        else:
            return {"status": "error", "message": "Client Not Initialized", "timestamp": timestamp}
        
    except Exception as e:
        print(f"[{timestamp}] 🔴 Health Check: OFFLINE | {e}")
        return {"status": "error", "message": str(e), "timestamp": timestamp}