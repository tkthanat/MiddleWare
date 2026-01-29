from fastapi import APIRouter, HTTPException
from models import SettingsModel
from config import load_user_settings, save_user_settings
from services.logger import get_trade_logs
from services.settrade_client import get_equity_instance
from datetime import datetime

router = APIRouter()

@router.get("/api/settings")
async def get_settings():
    return await load_user_settings()

@router.post("/api/settings")
async def save_settings(settings: SettingsModel):
    try:
        await save_user_settings(settings.dict())
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
        current_settings = await load_user_settings()
        equity = get_equity_instance(current_settings["account_no"])
        info = equity.get_account_info()
        print(f"[{timestamp}] 🟢 Health Check: ONLINE")
        return {"status": "ok", "message": "Active", "timestamp": timestamp}
    except Exception as e:
        print(f"[{timestamp}] 🔴 Health Check: OFFLINE | {e}")
        raise HTTPException(status_code=503, detail=str(e))