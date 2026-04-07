import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# --- Configuration ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "test.0002.data@gmail.com"
SENDER_PASSWORD = "ebgv oazx vyfo bgao"   

def send_otp_email(to_email: str, username: str, otp_code: str):
    if not to_email:
        print("❌ [Email] No recipient email provided.")
        return

    subject = "รหัสยืนยันการเข้าสู่ระบบ (2FA Verification)"
    
    # HTML Template
    html_content = f"""
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
                <h2 style="color: #0f172a; margin-top: 0;">ยืนยันการเข้าสู่ระบบ (2FA)</h2>
                <p>เรียนคุณ <strong>{username}</strong>,</p>
                <p>ระบบตรวจพบการเข้าสู่ระบบบัญชีของคุณ เพื่อความปลอดภัย กรุณาใช้รหัสยืนยันตัวตน (OTP) ด้านล่างนี้เพื่อเข้าใช้งาน:</p>
                
                <div class="otp-box">
                    <span class="otp-code">{otp_code}</span>
                </div>
                
                <p>รหัสนี้มีอายุการใช้งาน <strong>1 นาที 30 วินาที</strong> เท่านั้น</p>
                
                <div class="warning">
                    หากคุณไม่ได้เป็นผู้พยายามเข้าสู่ระบบ กรุณาเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัยของบัญชี
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
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ [Email] 2FA OTP sent to {to_email}")
    except Exception as e:
        print(f"❌ [Email] Failed to send: {e}")

def send_forgot_password_email(to_email: str, username: str, otp_code: str):
    if not to_email:
        return

    subject = "รหัสยืนยันการเปลี่ยนรหัสผ่าน (Password Reset)"
    
    html_content = f"""
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
                <h2 style="color: #0f172a; margin-top: 0;">เปลี่ยนรหัสผ่านของคุณ</h2>
                <p>เรียนคุณ <strong>{username}</strong>,</p>
                <p>เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กรุณาใช้รหัส (OTP) ด้านล่างนี้เพื่อดำเนินการต่อ:</p>
                
                <div class="otp-box">
                    <span class="otp-code">{otp_code}</span>
                </div>
                
                <p>รหัสนี้มีอายุการใช้งาน <strong>5 นาที</strong></p>
                
                <div class="warning">
                    หากคุณไม่ได้เป็นผู้ขอเปลี่ยนรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านของคุณจะยังคงปลอดภัย
                </div>
            </div>
            
            <div class="footer">
                <p>&copy; {datetime.now().year} Middleware Trading System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = f"Middleware Support <{SENDER_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ [Email] Password Reset OTP sent to {to_email}")
    except Exception as e:
        print(f"❌ [Email] Failed to send: {e}")