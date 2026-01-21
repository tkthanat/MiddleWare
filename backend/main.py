import uvicorn
import json
import traceback
import os
import requests
import time
from fastapi import FastAPI, Request, HTTPException
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

# User Settings
USER_SETTINGS = {
    "account_no": "test0001-E",
    "pin": "000000",
    "trade_mode": "AMOUNT",
    "trade_value": 5000,
    "is_simulation": True
}

# เชื่อมต่อ Settrade Open API
investor = Investor(
    app_id="CsLams6tdsldFqAJ",
    app_secret="AKrMzIFvev1Vr8m2bjHXG/O5N5DigwRt5H0VN2fV5ej6",
    broker_id="SANDBOX",
    app_code="SANDBOX",
    is_auto_queue=False
)

equity = investor.Equity(account_no=USER_SETTINGS["account_no"])
market = investor.MarketData()

class SettingsModel(BaseModel):
    account_no: str
    pin: str
    trade_mode: str
    budget_per_trade: float
    fixed_volume: int
    discord_webhook_url: str = ""

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
            "fixed_volume": 100
        }
    
# MODULAR NOTIFICATION SYSTEM (Switchable)
def send_notification(message: str):
    settings = load_user_settings()
    
    # ดึงค่า Config ของ Discord
    discord_url = settings.get("discord_webhook_url", "")

    if discord_url:
        send_discord_webhook(discord_url, message)
    else:
        print("No Discord Webhook found. Skipping notification.")

# --- Discord Module ---
def send_discord_webhook(webhook_url, text):
    data = {
        "content": text,
        "username": "MiddleWare Bot"
    }
    try:
        response = requests.post(webhook_url, json=data)
        if response.status_code == 204:
            print("Discord Message Sent")
        else:
            print(f"Discord Error: {response.text}")
    except Exception as e:
        print(f"Error sending Discord: {e}")
    
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
    
# --- ฟังก์ชันบันทึก Log ลงไฟล์ JSON ---
def save_trade_log(log_entry):
    file_name = "trade_logs.json"
    logs = []

    # ถ้ามีไฟล์อยู่แล้ว ให้อ่านข้อมูลเก่าออกมาก่อน
    if os.path.exists(file_name):
        try:
            with open(file_name, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except:
            logs = []

    # เพิ่มข้อมูลใหม่เข้าไปข้างหน้าสุด
    logs.insert(0, log_entry)

    # บันทึกกลับลงไฟล์
    with open(file_name, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=4, ensure_ascii=False)

# --- API Frontend ---

# API ดึงข้อมูลการตั้งค่าปัจจุบัน

@app.get("/api/settings")
async def get_settings():
    current_settings = load_user_settings()
    return current_settings

# API บันทึกการตั้งค่าใหม่

@app.post("/api/settings")
async def save_settings(settings: SettingsModel):
    try:
        # แปลง Pydantic model เป็น dict
        new_settings_dict = settings.dict()
        
        # บันทึกลงไฟล์
        with open("settings.json", "w") as f:
            json.dump(new_settings_dict, f, indent=4)
            
        print(" Settings Updated via React API!")
        return {"status": "success", "message": "Settings saved successfully"}
    except Exception as e:
        print(f" Error saving settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API ดึงประวัติการเทรด

@app.get("/api/logs")
async def read_logs():
    return get_trade_logs()

# API Endpoint

@app.post("/webhook")
async def tradingview_webhook(request: Request):
    try:
        data = await request.json()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] Received Signal: {data}")

        # โหลดการตั้งค่าล่าสุดจากไฟล์ (เพื่อให้ค่าไม่อัปเดตตามไฟล์ json)
        current_settings = load_user_settings()
        
        print(f"Using Config: Mode={current_settings['trade_mode']}, Budget={current_settings.get('budget_per_trade', 0)}")

        if 'symbol' not in data or 'action' not in data:
            return {"status": "error", "message": "Invalid Data Format"}

        symbol = data['symbol']
        action = data['action'].capitalize()

        last_price = data.get('price', 0) 

        # PROCESS
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
            
            # เตรียมข้อมูล Log เบื้องต้น
            log_data = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "symbol": symbol,
                "action": action,
                "volume": volume,
                "price": last_price,
                "detail": ""
            }

            try:
                place_order_result = equity.place_order(
                    symbol=symbol,
                    price_type="MP-MKT",
                    side=action,
                    volume=volume,
                    price=0,
                    pin=current_settings["pin"],
                    validity_type="IOC"
                )
                
                # ดึงเลข Order No มาเพื่อติดตามผล
                order_no = place_order_result.get('orderNo')

                time.sleep(1.0) 

                # ดึงข้อมูล Order ล่าสุดจาก Settrade
                actual_order_info = equity.get_order(order_no)
                order_status = actual_order_info.get('showOrderStatus', 'Pending')
                reject_reason = actual_order_info.get('rejectReason', '-')

                # ถ้าเจอคำว่า Cancelled, Rejected หรือ Failed ให้ถือว่าเป็น ERROR
                if 'Cancelled' in order_status or 'Rejected' in order_status or 'Failed' in order_status:
                    
                    # --- กรณีโดน Reject/Cancel ---
                    log_data["status"] = "ERROR"
                    log_data["detail"] = f"Status : {order_status} | Reason : {reject_reason}"
                    save_trade_log(log_data)

                    msg = f"Order Rejected!\nSymbol : {symbol}\nSide : {action}\nStatus : {order_status}\nReason : {reject_reason} \n"
                    send_notification(msg)

                    print(f"Order Rejected: {order_status} - {reject_reason}")
                    return {"status": "rejected", "data": actual_order_info}

                else:
                    # --- กรณีสำเร็จ (Matched, Queuing, Pending) ---
                    log_data["status"] = "SUCCESS"
                    log_data["detail"] = f"Order No : {order_no} | Status : {order_status}"
                    save_trade_log(log_data)

                    msg = f"Order Executed!\nSymbol : {symbol}\nSide : {action}\nVol : {volume}\nPrice : {last_price}\nStatus : {order_status} \n"
                    send_notification(msg)

                    print(f"Order Success : {order_status}")
                    return {"status": "success", "data": place_order_result}

            except Exception as e:
                # Error Log
                log_data["status"] = "ERROR"
                log_data["detail"] = str(e)
                save_trade_log(log_data)

                msg = f"Order Failed!\nSymbol : {symbol}\nSide : {action}\nError : {str(e)} \n"
                send_notification(msg)

                print(f"Order Failed : {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        else:
            # Skipped Log
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
            
            print("Volume is 0, no order sent.")
            return {"status": "skipped", "message": "Volume calculated is 0"}

    except Exception as e:
        print(f"System Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)