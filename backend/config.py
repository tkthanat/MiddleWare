from database import SessionLocal
import models

async def load_user_settings(user_id: int):
    db = SessionLocal()
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.user_id == user_id).first()
        
        if not setting:
            return {}
            
        return {
            "account_no": setting.account_no,
            "derivatives_account": setting.derivatives_account or "",
            "active_symbols": setting.active_symbols or "",
            "pin": setting.pin,
            "trade_mode": setting.trade_mode,
            "budget_per_trade": setting.budget_per_trade,
            "fixed_volume": setting.fixed_volume,
            "telegram_bot_token": setting.telegram_bot_token,
            "telegram_chat_id": setting.telegram_chat_id,
            "is_max_loss_active": setting.is_max_loss_active,
            "max_loss_amount": setting.max_loss_amount,
            "app_id": setting.app_id or "",
            "app_secret": setting.app_secret or "",
            "broker_id": setting.broker_id or "SANDBOX",
            "app_code": setting.app_code or "SANDBOX",
            "is_sandbox": setting.is_sandbox,
            "webhook_token": setting.webhook_token
        }
    except Exception as e:
        print(f"Load Config Error: {e}")
        return {}
    finally:
        db.close()

async def save_user_settings(user_id: int, new_settings: dict):
    db = SessionLocal()
    try:
        settings = db.query(models.SystemSetting).filter(models.SystemSetting.user_id == user_id).first()
        if not settings:
            settings = models.SystemSetting(user_id=user_id)
            db.add(settings)
        
        for key, value in new_settings.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        if "is_active_system" in new_settings:
            settings.is_active_system = new_settings["is_active_system"]

        db.commit()
        return True
    except Exception as e:
        print(f"Save Error: {e}")
        return False
    finally:
        db.close()