import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright

TFEX_MARGIN_CACHE = {}

async def fetch_tfex_margin():
    global TFEX_MARGIN_CACHE
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔄 Fetching TFEX Margin Data...")
    
    main_url = "https://www.tfex.co.th/th/market-data/news-and-notice/margin"
    api_url = "https://www.tfex.co.th/api/set/margin-simulations/margin-rate"
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            await page.goto(main_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
            
            json_data = await page.evaluate(f"""
                async () => {{
                    const res = await fetch("{api_url}", {{ cache: 'no-store' }});
                    return await res.json();
                }}
            """)

            if isinstance(json_data, list) and len(json_data) > 0:
                target_data = None
                target_date = ""
                
                for group in json_data:
                    if isinstance(group, dict) and group.get("groupName") == "RETAIL" and "data" in group:
                        target_data = group["data"]
                        target_date = group.get("asOfDate", "Unknown Date")
                        break 
                
                if target_data:
                    temp_cache = {}
                    for category_name, items_list in target_data.items():
                        if isinstance(items_list, list):
                            for item in items_list:
                                if item.get("position") == "Outright":
                                    symbol = item.get("symbol")
                                    im = item.get("im")
                                    if symbol and im is not None:
                                        temp_cache[symbol] = float(im)
                    
                    if temp_cache:
                        TFEX_MARGIN_CACHE = temp_cache
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ TFEX Margin Data Updated Successfully! (As of: {target_date} | Loaded: {len(TFEX_MARGIN_CACHE)} contracts) 🚀")
                    else:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Fetch successful, but no 'Outright' position data found.")
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Missing 'data' key for RETAIL group in API response.")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Invalid JSON structure or empty response from API.")
            
            await browser.close()
            
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error fetching TFEX Margin data: {e}")

async def schedule_margin_update():
    """ฟังก์ชันตั้งเวลาอัปเดตข้อมูลอัตโนมัติ (อัปเดตทุกๆ 5 นาที)"""
    await asyncio.sleep(2)
    await fetch_tfex_margin()
    
    while True:
        await asyncio.sleep(300) 
        await fetch_tfex_margin()