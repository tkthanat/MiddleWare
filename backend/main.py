import uvicorn
import json
import traceback
import os
import requests
import time
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from settrade_v2 import Investor
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# --- Set up CORS ---
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- สร้าง Model สำหรับรับข้อมูลจาก React ---
class SettingsModel(BaseModel):
    account_no: str
    pin: str
    trade_mode: str
    budget_per_trade: float
    fixed_volume: int
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

# เชื่อมต่อ Settrade Open API
investor = Investor(
    app_id="CsLams6tdsldFqAJ",
    app_secret="AKrMzIFvev1Vr8m2bjHXG/O5N5DigwRt5H0VN2fV5ej6",
    broker_id="SANDBOX",
    app_code="SANDBOX",
    is_auto_queue=False
)

# User Settings
USER_SETTINGS = {
    "account_no": "test0001-E",
    "pin": "000000",
    "trade_mode": "AMOUNT",
    "trade_value": 5000,
    "is_simulation": True
}

# Init Instances
try:
    equity = investor.Equity(account_no=USER_SETTINGS["account_no"])
    market = investor.MarketData()
except Exception as e:
    print(f"Init Error (Expected if settings not loaded): {e}")


# --- ฟังก์ชันสำหรับอ่านค่า Setting จากไฟล์ ---
def load_user_settings():
    try:
        with open("settings.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "account_no": "SANDBOX",
            "pin": "000000",
            "trade_mode": "AMOUNT",
            "budget_per_trade": 5000,
            "fixed_volume": 100,
            "telegram_bot_token": "",
            "telegram_chat_id": ""
        }
    
# --- Telegram Notification System ---
def send_telegram_message(message: str):
    try:
        settings = load_user_settings()
        bot_token = settings.get("telegram_bot_token", "")
        chat_id = settings.get("telegram_chat_id", "")

        if not bot_token or not chat_id:
            print("Telegram Config is missing.")
            return

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown" 
        }
        
        response = requests.post(url, json=payload)
        
        if response.status_code != 200:
            print(f"Telegram Error: {response.text}")
        else:
            print("Telegram Message Sent")
            
    except Exception as e:
        print(f"Error sending Telegram: {e}")

# Wrapper Function
def send_notification(message: str):
    send_telegram_message(message)

# --- ANTI-SPAM SYSTEM ---
last_error_logs = {}
ERROR_COOLDOWN = 60

def send_notification_smart(message: str, type="INFO"):

    global last_error_logs
    
    if type == "ERROR":
        current_time = time.time()
        
        if message in last_error_logs:
            if current_time - last_error_logs[message] < ERROR_COOLDOWN:
                print(f"🔇 Anti-Spam: Skip sending duplicate error.")
                return
        
        last_error_logs[message] = current_time

    send_notification(message)

    
# --- ฟังก์ชันจัดการ Logs ---
TRADE_LOG_FILE = "trade_logs.json"

def save_trade_log(log_entry):
    logs = []
    if os.path.exists(TRADE_LOG_FILE):
        try:
            with open(TRADE_LOG_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.insert(0, log_entry)
    
    # จำกัดจำนวน Log ไม่ให้ไฟล์บวมเกินไป (เช่น เก็บแค่ 100 รายการล่าสุด)
    if len(logs) > 100:
        logs = logs[:100]

    with open(TRADE_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=4, ensure_ascii=False)

def get_trade_logs():
    if os.path.exists(TRADE_LOG_FILE):
        try:
            with open(TRADE_LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

# --- API Frontend ---

@app.get("/api/settings")
async def get_settings():
    current_settings = load_user_settings()
    return current_settings

@app.post("/api/settings")
async def save_settings(settings: SettingsModel):
    try:
        # แปลง Pydantic model เป็น dict
        new_settings_dict = settings.dict()
        
        # บันทึกลงไฟล์
        with open("settings.json", "w") as f:
            json.dump(new_settings_dict, f, indent=4)
            
        print("Settings Updated via React API!")
        return {"status": "success", "message": "Settings saved successfully"}
    except Exception as e:
        print(f"Error saving settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs")
async def read_logs():
    return get_trade_logs()

# --- API Endpoint ---

@app.post("/webhook")
async def tradingview_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] Received Signal: {data}")

        current_settings = load_user_settings()
        
        # Re-init Equity with dynamic account
        try:
            equity = investor.Equity(account_no=current_settings["account_no"])
        except:
            pass

        print(f"Using Config: Mode={current_settings['trade_mode']}, Budget={current_settings.get('budget_per_trade', 0)}")

        if 'symbol' not in data or 'action' not in data:
            return {"status": "error", "message": "Invalid Data Format"}

        symbol = data['symbol']
        action = data['action'].capitalize()
        last_price = data.get('price', 0) 

        # PROCESS VOLUME
        volume = 0
        if current_settings["trade_mode"] == "VOLUME":
            volume = current_settings["fixed_volume"]
        
        elif current_settings["trade_mode"] == "AMOUNT":
            try:
                market_data = market.get_quote_symbol(symbol)
                market_price = market_data.get('last')
                if market_price and market_price > 0:
                    last_price = market_price
                else:
                    print(f"Sandbox API price is 0/None. Using Signal Price: {last_price}")
            except Exception as e:
                 print(f"Error getting market price: {e}. Using Signal Price: {last_price}")

            if last_price > 0:
                budget = current_settings["budget_per_trade"]
                raw_volume = int(budget // last_price)
                if raw_volume >= 100:
                    volume = (raw_volume // 100) * 100
                else:
                    volume = raw_volume
            else:
                print("Error: Price is 0, cannot calculate volume.")

        # --- EXECUTE ---
        if volume > 0:
            print(f"Executing Order: {action} {symbol} -> {volume} Shares")
            
            log_data = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "symbol": symbol,
                "action": action,
                "volume": volume,
                "price": last_price,
                "detail": ""
            }

            try:
                # --- AUTO-RETRY LOGIC ---
                MAX_RETRIES = 3
                place_order_result = None
                last_exception = None

                for attempt in range(MAX_RETRIES):
                    try:
                        print(f"Attempt {attempt+1}/{MAX_RETRIES}: Sending Order...")
                        place_order_result = equity.place_order(
                            symbol=symbol,
                            price_type="MP-MKT",
                            side=action,
                            volume=volume,
                            price=0,
                            pin=current_settings["pin"],
                            validity_type="IOC"
                        )
                        break 
                    except Exception as e:
                        print(f"⚠️ Attempt {attempt+1} Failed: {e}")
                        last_exception = e
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(1)
                        else:
                            raise last_exception
                
                order_no = place_order_result.get('orderNo')

                time.sleep(5.0)

                actual_order_info = equity.get_order(order_no)
                order_status = actual_order_info.get('showOrderStatus', 'Pending')
                reject_reason = actual_order_info.get('rejectReason', '-')

                if 'Cancelled' in order_status or 'Rejected' in order_status or 'Failed' in order_status:
                    # --- REJECTED ---
                    log_data["status"] = "ERROR"
                    log_data["detail"] = f"Status : {order_status} | Reason : {reject_reason}"
                    save_trade_log(log_data)

                    msg = f"❌ *Order Rejected!* \n Symbol: `{symbol}` \n Side : {action} \n Status : {order_status} \n Reason : {reject_reason}"
                    background_tasks.add_task(send_notification_smart, msg, "ERROR")

                    print(f"Order Rejected: {order_status} - {reject_reason}")
                    return {"status": "rejected", "data": actual_order_info}

                else:
                    # --- SUCCESS ---
                    log_data["status"] = "SUCCESS"
                    log_data["detail"] = f"Order No : {order_no} | Status : {order_status}"
                    save_trade_log(log_data)

                    msg = f"✅ *Order Executed!* \n Symbol : `{symbol}`\n Side : {action} \n Vol : {volume} \n Price : {last_price} \n Status : {order_status}"
                    background_tasks.add_task(send_notification_smart, msg, "INFO")

                    print(f"Order Success : {order_status}")
                    return {"status": "success", "data": place_order_result}

            except Exception as e:
                # --- ERROR ---
                log_data["status"] = "ERROR"
                log_data["detail"] = str(e)
                save_trade_log(log_data)

                msg = f"⚠️ *Order Failed!* \n Symbol : `{symbol}` \n Side : {action} \n Error : {str(e)}"
                background_tasks.add_task(send_notification_smart, msg, "ERROR")

                print(f"Order Failed : {str(e)}")

                return {"status": "error", "message": str(e)} 

        else:
            # --- SKIPPED ---
            log_data = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "symbol": symbol,
                "action": action,
                "volume": 0,
                "price": last_price,
                "status": "SKIPPED",
                "detail": "Calculated volume is 0 (Budget too low)"
            }
            save_trade_log(log_data)
            
            msg = f"⚠️ *Order Skipped!* \n Symbol : `{symbol}` \n Action : {action} \n Reason : Volume is 0 (Budget {current_settings.get('budget_per_trade')} too low for price {last_price})"
            background_tasks.add_task(send_notification_smart, msg, "INFO")

            print("Volume is 0, no order sent.")
            return {"status": "skipped", "message": "Volume calculated is 0"}

    except Exception as e:
        print(f"System Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)