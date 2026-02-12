import asyncio
import re
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from config import load_user_settings
from services.settrade_client import get_equity_instance

# Global Variable
bot_app = None

# Helper Functions
async def get_user_by_chat_id(chat_id: str):
    db: Session = SessionLocal()
    try:
        setting = db.query(models.SystemSetting).filter(
            models.SystemSetting.telegram_chat_id == str(chat_id)
        ).first()
        
        if not setting:
            return None, None
            
        user = db.query(models.User).filter(models.User.id == setting.user_id).first()
        return user, setting
    finally:
        db.close()

# Command Handlers
async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_first_name = update.effective_user.first_name
    await update.message.reply_text(
        f"*สวัสดีคุณ {user_first_name}* \n"
        "ระบบเทรดอัตโนมัติพร้อมใช้งานครับ \n \n"
        "*คำสั่งที่ใช้ได้* \n"
        "/balance - เช็คยอดเงินในพอร์ต \n"
        "/status - เช็ค order ที่ค้างอยู่ \n"
        "/status\\_match - เช็ค order ที่จับคู่สำเร็จแล้ว \n"
        "`/cancel_all` - ยกเลิก order ทั้งหมด \n"
        "`/cancel_<symbol>` - ยกเลิกเฉพาะหุ้น (เช่น `/cancel_PTT`)",
        parse_mode="Markdown"
    )

async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    
    if not user:
        await update.message.reply_text("⛔ คุณไม่มีสิทธิ์ใช้งานระบบนี้ (Chat ID ไม่ตรงกับในระบบ)")
        return

    try:
        equity = get_equity_instance(setting.account_no)
        info = equity.get_account_info()
        
        line_available = info.get('lineAvailable', 0)
        cash_balance = info.get('cashBalance', 0)
        
        cash_str = f"{cash_balance:,.2f}".rjust(15)
        line_str = f"{line_available:,.2f}".rjust(15)
        
        msg = (
            f"*Portfolio Summary* \n"
            f"Account : `{setting.account_no}` \n"
            f"```\n"
            f"Cash Bal   : {cash_str}\n"
            f"Line Avail : {line_str}\n"
            f"```"
        )
        await update.message.reply_text(msg, parse_mode="Markdown")
        
    except Exception as e:
        await update.message.reply_text(f"⚠️ Error checking balance: {e}")

async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    try:
        equity = get_equity_instance(setting.account_no)
        orders = equity.get_orders()
        
        # Logic การกรอง Status สำหรับ Pending
        ignore_statuses = ['Matched', 'Cancelled', 'Rejected', 'Expired', 'Error', 'Failed', 'Success']
        
        active_orders = []
        for o in orders:
            status = o['showOrderStatus']
            if any(keyword in status for keyword in ignore_statuses):
                continue
            active_orders.append(o)

        if not active_orders:
            await update.message.reply_text("✅ *พอร์ตว่างครับ* (ไม่มีออเดอร์ค้าง)", parse_mode="Markdown")
            return

        # Header และจัดรูปแบบการแสดงผลแบบตาราง
        msg = f"*Pending Orders ({len(active_orders)})*\n"
        msg += "```\n"

        for o in active_orders:
            side = o['side'].ljust(4)             
            symbol = o['symbol'].ljust(8)         
            vol = f"{o['vol']:,}".rjust(8)        
            price = str(o.get('price', 'MKT')).rjust(6) 
            
            msg += f"{side} {symbol} | {vol} @ {price}\n"
            msg += f"-> Status: {o['showOrderStatus']} \n"
            msg += f"-> Order ID: {o['orderNo']} \n\n"
        
        msg += "```"
        await update.message.reply_text(msg, parse_mode="Markdown")

    except Exception as e:
        await update.message.reply_text(f"⚠️ Error: {e}")

# Check Match Order
async def cmd_status_match(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    try:
        equity = get_equity_instance(setting.account_no)
        orders = equity.get_orders()
        
        # Logic การกรอง Status ค้นหาคำว่า Matched หรือ Success
        match_keywords = ['Matched', 'Match', 'Success']
        
        matched_orders = []
        for o in orders:
            status = o['showOrderStatus']
            if any(keyword in status for keyword in match_keywords):
                matched_orders.append(o)

        if not matched_orders:
            await update.message.reply_text("*ยังไม่มีออเดอร์ที่จับคู่สำเร็จครับ*", parse_mode="Markdown")
            return

        msg = f"*Matched Orders ({len(matched_orders)})*\n"
        msg += "```\n"
        
        msg += "Order No |    Time    | Side | Symbol  |  Volume  | Price\n"
        msg += "---------------------------------------------------------\n"

        for o in matched_orders:
            ord_no = str(o.get('orderNo', ''))[-8:].ljust(8)
            time_raw = str(o.get('tradeTime', o.get('entryTime', '-')))
            time_str = time_raw[:10].ljust(10)
            side_str = str(o.get('side', '')).upper()[:4].ljust(4)
            sym = str(o.get('symbol', '')).ljust(7)
            vol = f"{o.get('vol', 0):,}".rjust(8)
            pri = str(o.get('price', 'MKT')).rjust(5)
            
            msg += f"{ord_no} | {time_str} | {side_str} | {sym} | {vol} | {pri}\n"
        
        msg += "```"
        await update.message.reply_text(msg, parse_mode="Markdown")

    except Exception as e:
        await update.message.reply_text(f"⚠️ Error fetching matched orders: {e}")

async def cmd_cancel_all(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    await update.message.reply_text("🔥 *กำลังดำเนินการยกเลิกทุกออเดอร์...*", parse_mode="Markdown")

    try:
        equity = get_equity_instance(setting.account_no)
        pin = setting.pin
        orders = equity.get_orders()
        
        cancelable_orders = [o for o in orders if o['canCancel'] == True]

        if not cancelable_orders:
            await update.message.reply_text("✅ *ปลอดภัย:* ไม่มีออเดอร์ให้ยกเลิกครับ", parse_mode="Markdown")
            return

        count = 0
        for o in cancelable_orders:
            try:
                equity.cancel_order(order_no=o['orderNo'], pin=pin)
                count += 1
            except Exception as e:
                print(f"Failed to cancel {o['orderNo']}: {e}")

        await update.message.reply_text(
            f"🚫 *Panic Cancel Completed* \n"
            f"```\n"
            f"Canceled : {count} orders\n"
            f"```\n"
            f"✅ เคลียร์พอร์ตเรียบร้อยครับ", 
            parse_mode="Markdown"
        )

    except Exception as e:
        await update.message.reply_text(f"⚠️ Panic Error: {e}")

async def cmd_cancel_symbol(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    
    match = re.match(r"^/cancel_([A-Za-z0-9]+)$", text)
    if not match: return

    target_symbol = match.group(1).upper()
    
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    try:
        equity = get_equity_instance(setting.account_no)
        pin = setting.pin
        orders = equity.get_orders()

        target_orders = [o for o in orders if o['symbol'] == target_symbol and o['canCancel'] == True]

        if not target_orders:
            await update.message.reply_text(f"🔍 ไม่พบออเดอร์ *{target_symbol}* ที่ยกเลิกได้ครับ", parse_mode="Markdown")
            return

        for o in target_orders:
            equity.cancel_order(order_no=o['orderNo'], pin=pin)
        
        await update.message.reply_text(
            f"🗑️ *Cancel Order* \n"
            f"```\n"
            f"Symbol   : {target_symbol}\n"
            f"Canceled : {len(target_orders)} orders\n"
            f"```\n"
            f"✅ ยกเลิกเรียบร้อย", 
            parse_mode="Markdown"
        )

    except Exception as e:
        await update.message.reply_text(f"⚠️ Error canceling {target_symbol}: {e}")

# Startup Logic
async def start_telegram_bot():
    global bot_app
    
    db: Session = SessionLocal()
    first_setting = db.query(models.SystemSetting).filter(models.SystemSetting.telegram_bot_token != None).first()
    token = first_setting.telegram_bot_token if first_setting else None
    db.close()

    if not token:
        print("[Telegram Bot] No Token found in DB. Bot not started.")
        return

    print(f"[Telegram Bot] Starting with Token: {token[:5]}...***")
    
    bot_app = Application.builder().token(token).build()

    # Register Handlers
    bot_app.add_handler(CommandHandler("help", cmd_help))
    bot_app.add_handler(CommandHandler("balance", cmd_balance))
    bot_app.add_handler(CommandHandler("status", cmd_status))
    bot_app.add_handler(CommandHandler("status_match", cmd_status_match)) 
    bot_app.add_handler(CommandHandler("cancel_all", cmd_cancel_all))
    
    bot_app.add_handler(MessageHandler(filters.Regex(r"^/cancel_[a-zA-Z0-9]+$"), cmd_cancel_symbol))

    # Start Bot
    await bot_app.initialize()
    await bot_app.start()
    await bot_app.updater.start_polling(drop_pending_updates=True)

async def stop_telegram_bot():
    global bot_app
    if bot_app:
        print("🛑 [Telegram Bot] Stopping...")
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()