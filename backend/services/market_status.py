import os
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

# Global Cache
PUBLIC_MARKET_STATUS_CACHE = {
    "status": "UNKNOWN",
    "tfex_has_night": {}, 
    "last_update": None
}

# Offline Fallback Configuration
TFEX_TRADING_HOURS = {
    "day_start": os.getenv("TFEX_DAY_START", "09:15"),
    "day_end": os.getenv("TFEX_DAY_END", "16:55"),
    "night_start": os.getenv("TFEX_NIGHT_START", "18:45"),
    "night_end": os.getenv("TFEX_NIGHT_END", "03:00")
}

def _is_time_in_range(start_str, end_str, current_time):
    start = datetime.strptime(start_str, "%H:%M").time()
    end = datetime.strptime(end_str, "%H:%M").time()
    if start <= end:
        return start <= current_time <= end
    else: 
        return current_time >= start or current_time <= end

def fallback_tfex_status(symbol: str) -> bool:
    """ระบบสำรองประเมินสถานะตลาด TFEX เมื่อ API หลักล่ม"""
    now = datetime.now()
    current_time = now.time()
    weekday = now.weekday()
    
    # เช็คว่าสัญญาตัวนี้มีรอบดึกไหม แบบ Dynamic จาก Cache
    has_night = PUBLIC_MARKET_STATUS_CACHE["tfex_has_night"].get(symbol, False)

    is_day = _is_time_in_range(TFEX_TRADING_HOURS["day_start"], TFEX_TRADING_HOURS["day_end"], current_time)
    is_night = _is_time_in_range(TFEX_TRADING_HOURS["night_start"], TFEX_TRADING_HOURS["night_end"], current_time)

    if weekday < 5: 
        if is_day: return True
        if has_night and is_night: return True
    elif weekday == 5: 
        if has_night and current_time <= datetime.strptime(TFEX_TRADING_HOURS["night_end"], "%H:%M").time():
            return True
    return False

async def update_market_status_cache():
    global PUBLIC_MARKET_STATUS_CACHE
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # ดึงสถานะตลาด SET
            await page.goto("https://www.set.or.th/th/home", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000) 
            
            json_set = await page.evaluate("""
                async () => {
                    const res = await fetch("https://www.set.or.th/api/set/index/info/list?type=INDEX", { cache: 'no-store' });
                    if (!res.ok) return null;
                    return await res.json();
                }
            """)
            if json_set and json_set.get("indexIndustrySectors"):
                status = str(json_set["indexIndustrySectors"][0].get("marketStatus", "CLOSED")).upper()
                PUBLIC_MARKET_STATUS_CACHE["status"] = status

            # ดึงข้อมูลสัญญา TFEX
            await page.goto("https://www.settrade.com/th/home", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            json_tfex = await page.evaluate("""
                async () => {
                    const res = await fetch("https://www.settrade.com/api/set/tfex/series/list", { cache: 'no-store' });
                    if (!res.ok) return null;
                    return await res.json();
                }
            """)
            if json_tfex and json_tfex.get("series"):
                tfex_dict = {}
                for item in json_tfex["series"]:
                    tfex_dict[item["symbol"]] = item.get("hasNightSession", False)
                PUBLIC_MARKET_STATUS_CACHE["tfex_has_night"] = tfex_dict

            PUBLIC_MARKET_STATUS_CACHE["last_update"] = datetime.now()
            
            time_str = datetime.now().strftime('%H:%M:%S')
            print(f"[{time_str}] 🌐 Market Status Cache Updated:")
            print(f"   ├─ SET Status : {PUBLIC_MARKET_STATUS_CACHE['status']}")
            print(f"   └─ TFEX Data  : โหลดข้อมูลสำเร็จ {len(PUBLIC_MARKET_STATUS_CACHE['tfex_has_night'])} สัญญา")
            
            await browser.close()
            
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ อัปเดต Cache ล้มเหลว: {e}")

def check_market_status(market_type: str, user_id: int = None, check_symbol: str = None) -> bool:
    
    # PRIMARY SYSTEM (Dynamic API)
    if user_id and check_symbol:
        from services.settrade_client import get_market_data 
        
        def fetch_status(api_inv=None):
            mkt = api_inv.MarketData() if api_inv else get_market_data(user_id)
            if mkt:
                quote = mkt.get_quote_symbol(check_symbol)
                market_status = str(quote.get('market_status', quote.get('marketStatus', ''))).upper()
                print(f"✅ [Primary API] {check_symbol} สถานะจริงจากตลาด: {market_status}")
                valid_open_states = ["OPEN", "DAY", "NIGHT"]
                if any(state in market_status for state in valid_open_states) and "PRE" not in market_status:
                    return True
                return False
            return None

        try:
            status = fetch_status()
            if status is not None:
                return status
        except Exception as e:
            print(f"⚠️ [Primary API Failed] ดึงสถานะไม่สำเร็จ: {e}")
            print("-> สลับเข้าสู่โหมด Fallback!")

    # FALLBACK SYSTEM
    if market_type == "TFEX":
        is_open = fallback_tfex_status(check_symbol)
        status_text = "OPEN" if is_open else "CLOSED"
        print(f"🛡️ [Fallback TFEX] ประเมินสถานะ {check_symbol} จากโครงสร้างเวลาฉุกเฉิน: {status_text}")
        return is_open
    else:
        cached_status = PUBLIC_MARKET_STATUS_CACHE.get("status", "UNKNOWN")
        print(f"🌐 [Fallback SET] สถานะตลาดเซ็ตสำรอง: {cached_status}")
        
        if "OPEN" in cached_status and "PRE" not in cached_status:
            return True
        if "DAY" in cached_status or "NIGHT" in cached_status:
            return True

        print("⚠️ สถานะตลาดปิด หรือดึงข้อมูลไม่ได้ บังคับหยุดออเดอร์")
        return False