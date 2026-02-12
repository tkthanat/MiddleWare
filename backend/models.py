from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class SettingsModel(BaseModel):
    account_no: str = ""
    derivatives_account: str = ""
    active_symbols: str = ""
    pin: str = ""
    trade_mode: str = "AMOUNT"
    budget_per_trade: float = 5000.0
    fixed_volume: int = 100
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    is_max_loss_active: bool = False
    max_loss_amount: float = 0.0

class SystemStatusModel(BaseModel):
    is_active: bool

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    system_settings = relationship("SystemSetting", back_populates="user", uselist=False)
    security = relationship("UserSecurity", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserSecurity(Base):
    __tablename__ = "user_security"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    otp_code = Column(String, nullable=True)
    otp_ref = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    two_fa_secret = Column(String, nullable=True)
    user = relationship("User", back_populates="security")

class TradeLog(Base):
    __tablename__ = "trade_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) 
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    symbol = Column(String, nullable=True)
    action = Column(String, nullable=True)
    volume = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    status = Column(String, nullable=True)
    detail = Column(String, nullable=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    is_active_system = Column(Boolean, default=False) 
    account_no = Column(String, default="")
    derivatives_account = Column(String, default="")
    active_symbols = Column(String, default="")
    pin = Column(String, default="")
    trade_mode = Column(String, default="AMOUNT")
    budget_per_trade = Column(Float, default=5000.0)
    fixed_volume = Column(Integer, default=100)
    telegram_bot_token = Column(String, default="")
    telegram_chat_id = Column(String, default="")
    is_max_loss_active = Column(Boolean, default=False)
    max_loss_amount = Column(Float, default=0.0)
    user = relationship("User", back_populates="system_settings")