from fastapi import APIRouter, HTTPException, Depends
from models import SettingsModel, User 
from config import load_user_settings, save_user_settings
from services.logger import get_trade_logs
from services.settrade_client import get_equity_instance, get_derivatives_instance, setup_client
from datetime import datetime
from services.auth_handler import get_current_user
from services import tfex_margin
from pydantic import BaseModel
from services.notification import send_telegram_message

router = APIRouter()

@router.get("/api/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    return await load_user_settings(current_user.id)

@router.get("/api/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    try:
        from services.settrade_client import get_investor
        cfg = await load_user_settings(current_user.id)
        inv = get_investor(current_user.id)
        if inv and cfg.get("account_no"):
            return {"balance": float(inv.Equity(account_no=cfg["account_no"]).get_account_info().get("lineAvailable", 0))}
    except:
        pass
    return {"balance": 0}

@router.post("/api/settings")
async def save_settings(settings: SettingsModel, current_user: User = Depends(get_current_user)):
    try:
        if getattr(settings, "allocation_type", "") == "FIX" and getattr(settings, "trade_mode", "") == "AMOUNT" and getattr(settings, "budget_per_trade", 0) > 0:
            from services.settrade_client import get_investor
            inv = get_investor(current_user.id)
            if inv and getattr(settings, "account_no", None):
                try:
                    cap = float(inv.Equity(account_no=settings.account_no).get_account_info().get('lineAvailable', 0))
                    if settings.budget_per_trade > cap:
                        html_msg = (
                            f"<div style='text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #dee2e6;'>"
                            f"<div style='display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;'>"
                            f"<span style='white-space: nowrap; margin-right: 15px;'><b>Budget Per Trade :</b></span> "
                            f"<span style='color: #dc3545; font-weight: bold; text-align: right; word-break: break-word;'>{settings.budget_per_trade:,.2f} THB</span>"
                            f"</div>"
                            f"<div style='display: flex; justify-content: space-between; align-items: flex-start;'>"
                            f"<span style='white-space: nowrap; margin-right: 15px;'><b>Line Available :</b></span> "
                            f"<span style='color: #198754; font-weight: bold; text-align: right; word-break: break-word;'>{cap:,.2f} THB</span>"
                            f"</div>"
                            f"</div>"
                            f"<div style='margin-top: 15px; font-size: 0.85em; color: #6c757d;'>กรุณาระบุงบประมาณไม่ให้เกิน Line Available ของบัญชี {settings.account_no}</div>"
                        )
                        raise HTTPException(status_code=400, detail=html_msg)
                except HTTPException as he:
                    raise he
                except:
                    pass

        if settings.is_sandbox:
            settings.broker_id = "SANDBOX"
            settings.app_code = "SANDBOX"
            if not settings.app_id or settings.app_id.strip() == "":
                settings.app_id = "MHxt6BcfwjzEDyEI"
                settings.app_secret = "CpIs5Aw+mCx9WZqETJZilmvNRc5pcm5NqRQgRtvYmoY="

        await save_user_settings(current_user.id, settings.dict())
        print(f"🔄 Reloading Settrade Client based on new settings...")
        setup_client(
            user_id=current_user.id,
            app_id=settings.app_id,
            app_secret=settings.app_secret,
            broker_id=settings.broker_id,
            app_code=settings.app_code,
            is_sandbox=settings.is_sandbox
        )
        return {"status": "success", "message": "Settings saved & System Reloaded"}
        
    except HTTPException as he:
        raise he 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API สำหรับเช็คข้อมูลใน Cache
@router.get("/api/test-cache")
async def check_margin_cache():
    return {
        "status": "success",
        "total_contracts": len(tfex_margin.TFEX_MARGIN_CACHE),
        "data": tfex_margin.TFEX_MARGIN_CACHE
    }

@router.get("/api/logs")
async def read_logs():
    return get_trade_logs()

@router.get("/health/settrade")
async def health_check(current_user: User = Depends(get_current_user)):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        from services.settrade_client import get_investor
        current_settings = await load_user_settings(current_user.id)
        is_sandbox = current_settings.get("is_sandbox", True)
        inv = get_investor(current_user.id)
        if inv is None:
            print(f"[{timestamp}] 🔴 Health Check: OFFLINE (Disconnected)")
            raise HTTPException(status_code=503, detail="Settrade Client Disconnected")
        mode_label = "SANDBOX" if is_sandbox else "PRODUCTION"
        return {"status": "ok", "message": f"Active ({mode_label})", "timestamp": timestamp}
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        print(f"[{timestamp}] 🔴 Health Check: ERROR | {e}")
        raise HTTPException(status_code=500, detail=str(e))

# สร้าง Model สำหรับรับค่า Test Telegram
class TelegramTestRequest(BaseModel):
    telegram_bot_token: str
    telegram_chat_id: str

# API TEST Notification Telegram
@router.post("/api/test-telegram")
async def test_telegram(data: TelegramTestRequest):
    if not data.telegram_bot_token or not data.telegram_chat_id:
        raise HTTPException(status_code=400, detail="กรุณากรอก Bot Token และ Chat ID ให้ครบถ้วน")
    
    msg = (
        "🟢 *System Integration Successful* \n"
        "━━━━━━━━━━━━━━━━━━━━━━ \n"
        "ระบบ *Middleware Trading System* เชื่อมต่อกับบัญชี Telegram ของคุณเสร็จสมบูรณ์ \n\n"
        "🔹 *Status:* Active & Ready 🚀\n"
        "🔹 *Module:* Notification Service \n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "_คุณจะได้รับการแจ้งเตือนคำสั่งซื้อขายและสถานะของระบบแบบ Real-time ผ่านช่องทางนี้_"
    )
    
    try:
        await send_telegram_message(data.telegram_bot_token, data.telegram_chat_id, msg)
        return {"status": "success", "message": "Message sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ส่งข้อความไม่สำเร็จ: {str(e)}")