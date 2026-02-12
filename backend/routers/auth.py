from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import auth_handler
from services.email_service import send_otp_email 
import models
from passlib.context import CryptContext
import random
import string
from datetime import datetime, timedelta

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

def generate_otp(length=5):
    return ''.join(random.choices(string.digits, k=length))

# --- Login API ---
@router.post("/login")
async def login(
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
        
        print(f"🔹 Generated OTP for {user.username}: {otp_code}")

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
async def verify_login_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    security_setting = db.query(models.UserSecurity).filter(models.UserSecurity.user_id == user.id).first()
    
    print(f"🔍 Verifying OTP for {user.username}")
    print(f"   Input: {request.otp}")
    print(f"   DB Code: {security_setting.otp_code if security_setting else 'None'}")

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
    db.commit()

    return {"status": "success", "message": "User created successfully", "username": new_user.username}