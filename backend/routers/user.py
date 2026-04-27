from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import User, UserSecurity, LoginActivity
from passlib.context import CryptContext
import random
import string
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- Email Configuration ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "test.0002.data@gmail.com"
SENDER_PASSWORD = "ebgv oazx vyfo bgao"

router = APIRouter(prefix="/api/user", tags=["User"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- Schemas ---
class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None

class OtpRequest(BaseModel):
    action: str 

class VerifyOtpChangePassword(BaseModel):
    otp_code: str
    new_password: str

class TwoFaUpdate(BaseModel):
    enabled: bool

# --- Helper Function ---
def send_real_email(to_email: str, otp_code: str):
    try:
        subject = "รหัสยืนยันความปลอดภัย (Verification Code)"

        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
                .email-container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }}
                .header {{ background-color: #0f172a; padding: 30px; text-align: center; }}
                .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; font-weight: 600; }}
                .content {{ padding: 40px 30px; color: #334155; line-height: 1.6; }}
                .otp-box {{ background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
                .otp-code {{ font-size: 36px; font-weight: 700; color: #0f172a; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
                .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
                .warning {{ color: #dc2626; font-size: 13px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>MIDDLEWARE</h1>
                </div>
                
                <div class="content">
                    <h2 style="color: #0f172a; margin-top: 0;">คำร้องขอเปลี่ยนรหัสผ่าน</h2>
                    <p>เรียน ผู้ใช้งาน,</p>
                    <p>ระบบได้รับคำร้องขอเพื่อทำการเปลี่ยนแปลงรหัสผ่านสำหรับบัญชีของคุณ เพื่อดำเนินการต่อ กรุณาใช้รหัสยืนยันตัวตน (OTP) ด้านล่างนี้:</p>
                    
                    <div class="otp-box">
                        <span class="otp-code">{otp_code}</span>
                    </div>
                    
                    <p>รหัสนี้มีอายุการใช้งาน <strong>3 นาที</strong> เท่านั้น</p>
                    
                    <div class="warning">
                        หากคุณไม่ได้เป็นผู้ร้องขอทำรายการนี้ โปรดเพิกเฉยต่ออีเมลฉบับนี้และอย่าเปิดเผยรหัสให้ผู้อื่นทราบ
                    </div>
                </div>
                
                <div class="footer">
                    <p>&copy; {datetime.now().year} Middleware Trading System. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart()
        msg['From'] = f"Middleware Security <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        
        print(f"✅ Email sent to {to_email} successfully!")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

# --- Endpoints ---

@router.get("/me")
async def get_my_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    is_2fa = False
    if user.security:
        is_2fa = user.security.is_2fa_enabled

    return {
        "username": user.username,
        "full_name": user.full_name or "",
        "email": user.email or "",
        "phone": user.phone or "",
        "is_2fa_enabled": is_2fa 
    }

@router.put("/me")
async def update_my_profile(username: str, data: UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    user.full_name = data.full_name
    user.email = data.email
    user.phone = data.phone
    db.commit()
    return {"status": "success", "message": "Profile updated"}

@router.post("/request-otp")
async def request_otp(username: str, data: OtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.email:
        raise HTTPException(status_code=400, detail="ไม่พบอีเมลในระบบ กรุณาอัปเดตอีเมลก่อน")

    chars = string.ascii_uppercase + string.digits
    otp = ''.join(random.choice(chars) for _ in range(6))
    expiry = datetime.now() + timedelta(minutes=3)
    
    if not user.security:
        new_sec = UserSecurity(user_id=user.id)
        db.add(new_sec)
        db.commit()
        db.refresh(user)

    user.security.otp_code = otp
    user.security.otp_expires_at = expiry
    db.commit()

    success = send_real_email(user.email, otp)
    
    if not success:
        raise HTTPException(status_code=500, detail="ไม่สามารถส่งอีเมลได้ (ตรวจสอบการตั้งค่า SMTP)")

    return {"status": "sent", "message": f"ส่งรหัส OTP ไปที่ {user.email} แล้ว"}

@router.post("/verify-change-password")
async def verify_change_password(username: str, data: VerifyOtpChangePassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")

    sec = user.security
    if not sec: raise HTTPException(status_code=400, detail="กรุณากดขอ OTP ก่อน")

    if sec.otp_code != data.otp_code:
        raise HTTPException(status_code=400, detail="รหัส OTP ไม่ถูกต้อง")

    if not sec.otp_expires_at or datetime.now() > sec.otp_expires_at:
        raise HTTPException(status_code=400, detail="รหัส OTP หมดอายุแล้ว")

    user.hashed_password = pwd_context.hash(data.new_password)
    sec.otp_code = None 
    sec.otp_expires_at = None
    db.commit()

    return {"status": "success", "message": "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"}

@router.put("/toggle-2fa")
async def toggle_2fa(username: str, data: TwoFaUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user.security:
        new_sec = UserSecurity(user_id=user.id)
        db.add(new_sec)
        db.commit()
        db.refresh(user)

    user.security.is_2fa_enabled = data.enabled
    db.commit()
    return {"status": "success", "enabled": user.security.is_2fa_enabled}

# --- ดึงประวัติการ Login ---
@router.get("/login-activity")
async def get_login_activity(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    activities = db.query(LoginActivity).filter(LoginActivity.user_id == user.id).order_by(LoginActivity.timestamp.desc()).limit(10).all()
    
    result = []
    for idx, act in enumerate(activities):
        date_str = act.timestamp.strftime("%d %B %Y") if act.timestamp else "Unknown"
        result.append({
            "id": act.id,
            "device_name": act.device_name,
            "location": act.location,
            "timestamp": date_str,
            "is_current": idx == 0
        })
    return result