from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import auth_handler
from services.email_service import send_otp_email, send_forgot_password_email 
import models
from passlib.context import CryptContext
import random
import string
from datetime import datetime, timedelta
import uuid

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class VerifyOTPRequest(BaseModel):
    username: str
    otp: str

class TokenResponse(BaseModel):
    status: str 
    access_token: str
    token_type: str
    username: str
    full_name: str
    role: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str = None
    email: str | None = None
    phone: str | None = None

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

def generate_otp(length=5):
    return ''.join(random.choices(string.digits, k=length))

# --- Login Tracker Helper ---
def parse_user_agent(user_agent: str):
    if not user_agent: return "Unknown Device"
    ua = user_agent.lower()
    if "iphone" in ua: return "iPhone"
    if "ipad" in ua: return "iPad"
    if "android" in ua: return "Android Device"
    if "macintosh" in ua or "mac os" in ua: return "Mac"
    if "windows" in ua: return "Windows PC"
    return "Unknown Device"

def record_login(db: Session, user_id: int, req: Request):
    user_agent = req.headers.get("user-agent", "")
    device_name = parse_user_agent(user_agent)
    ip_address = req.client.host if req.client else "Unknown"
    
    new_login = models.LoginActivity(
        user_id=user_id,
        device_name=device_name,
        location="Thailand",
        ip_address=ip_address
    )
    db.add(new_login)
    db.commit()

# --- Login API ---
@router.post("/login")
async def login(
    req: Request,
    request: LoginRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = auth_handler.authenticate_user(db, request.username, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()

    if security_setting and security_setting.is_2fa_enabled:
        otp_code = generate_otp(5)
        expiry_time = datetime.now() + timedelta(seconds=90)
        
        security_setting.otp_code = otp_code
        security_setting.otp_expiry = expiry_time
        db.commit()
        
        if user.email:
            background_tasks.add_task(send_otp_email, user.email, user.username, otp_code)

        return {
            "status": "2fa_required",
            "message": "OTP sent to email",
            "ref_user": user.username,
            "access_token": "",
            "token_type": "",
            "username": user.username,
            "full_name": user.full_name or "",
            "role": user.role
        }

    # บันทึกประวัติการ Login เมื่อผ่านสำเร็จ
    record_login(db, user.id, req)

    access_token = auth_handler.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "full_name": user.full_name or "",
        "role": user.role
    }

# --- Verify OTP API ---
@router.post("/verify-login-otp")
async def verify_login_otp(req: Request, request: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()

    if not security_setting or not security_setting.otp_code:
        raise HTTPException(status_code=400, detail="No OTP request found (Please login again)")

    if str(security_setting.otp_code).strip() != str(request.otp).strip():
        raise HTTPException(status_code=400, detail="Invalid OTP Code")

    try:
        if security_setting.otp_expiry:
            expiry = security_setting.otp_expiry
            if isinstance(expiry, str):
                expiry = datetime.fromisoformat(expiry)
            
            if datetime.now() > expiry:
                raise HTTPException(status_code=400, detail="OTP Expired")
    except Exception as e:
        print(f"⚠️ Date comparison error: {e}")

    security_setting.otp_code = None 
    db.commit()

    # บันทึกประวัติการ Login หลังยืนยัน OTP สำเร็จ
    record_login(db, user.id, req)

    access_token = auth_handler.create_access_token(data={"sub": user.username, "role": user.role})
    
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "full_name": user.full_name or "",
        "role": user.role
    }

# --- Register API ---
@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = pwd_context.hash(request.password)
    
    new_user = models.User(
        username=request.username,
        hashed_password=hashed_password,
        full_name=request.full_name,
        email=request.email,
        phone=request.phone,
        is_active=True,
        role="user"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    new_security = models.UserSecurity(user_id=new_user.id, is_2fa_enabled=False)
    db.add(new_security)
    
    new_system_setting = models.SystemSetting(
        user_id=new_user.id,
        webhook_token=str(uuid.uuid4())
    )
    db.add(new_system_setting)

    db.commit()

    return {"status": "success", "message": "User created successfully", "username": new_user.username}

# --- Forgot Password API ---
@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        return {"status": "success", "message": "If email exists, OTP has been sent."}

    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()
    if not security_setting:
        security_setting = models.UserSecurity(user_id=user.id)
        db.add(security_setting)

    otp_code = generate_otp(5)
    expiry_time = datetime.now() + timedelta(minutes=5)
    
    security_setting.otp_code = otp_code
    security_setting.otp_expiry = expiry_time
    db.commit()

    background_tasks.add_task(send_forgot_password_email, user.email, user.username, otp_code)

    return {"status": "success", "message": "If email exists, OTP has been sent."}

@router.post("/verify-reset-otp")
async def verify_reset_otp(request: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()
    if not security_setting or not security_setting.otp_code:
        raise HTTPException(status_code=400, detail="No active password reset request")

    if str(security_setting.otp_code).strip() != str(request.otp).strip():
        raise HTTPException(status_code=400, detail="Invalid OTP Code")

    try:
        expiry = security_setting.otp_expiry
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry)
        
        if datetime.now() > expiry:
            raise HTTPException(status_code=400, detail="OTP Expired")
    except Exception as e:
        print(f"⚠️ Date comparison error: {e}")

    return {"status": "success", "message": "OTP Verified"}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()
    if not security_setting or not security_setting.otp_code:
        raise HTTPException(status_code=400, detail="No active password reset request")

    if str(security_setting.otp_code).strip() != str(request.otp).strip():
        raise HTTPException(status_code=400, detail="Invalid OTP Code")

    try:
        expiry = security_setting.otp_expiry
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry)
        
        if datetime.now() > expiry:
            raise HTTPException(status_code=400, detail="OTP Expired")
    except Exception as e:
        pass

    user.hashed_password = pwd_context.hash(request.new_password)
    security_setting.otp_code = None 
    db.commit()

    return {"status": "success", "message": "Password reset successfully"}