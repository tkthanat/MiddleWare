from pydantic import BaseModel

class SettingsModel(BaseModel):
    account_no: str
    pin: str
    trade_mode: str
    budget_per_trade: float
    fixed_volume: int
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    is_max_loss_active: bool = False
    max_loss_amount: float = 0.0

class SystemStatusModel(BaseModel):
    is_active: bool