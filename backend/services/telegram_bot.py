import asyncio
import re
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from config import load_user_settings
from services.settrade_client import get_equity_instance, get_derivatives_instance

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

# Helper to extract Time HH:mm:ss from ISO String
def format_time(iso_string):
    if not iso_string: return "-"
    try:
        if "T" in str(iso_string):
            return str(iso_string).split("T")[1][:8]
        return str(iso_string)[:8] 
    except:
        return str(iso_string)

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
        await update.message.reply_text("⛔ คุณไม่มีสิทธิ์ใช้งานระบบนี้")
        return

    msg = "*Portfolio Summary* \n \n"

    # SET Account
    if setting.account_no:
        try:
            equity = get_equity_instance(user.id, setting.account_no)
            if not equity:
                msg += f"⚠️ SET Error: `Disconnected`\n"
            else:
                info = equity.get_account_info()
                
                cash = info.get('cashBalance', 0)
                line = info.get('lineAvailable', 0)
                
                cash_str = f"{cash:,.2f}".rjust(15)
                line_str = f"{line:,.2f}".rjust(15)
                
                msg += f"*SET Acc :* `{setting.account_no}`\n"
                msg += "```\n"
                msg += f"Cash Bal   : {cash_str}\n"
                msg += f"Line Avail : {line_str}\n"
                msg += "```\n"
        except Exception as e:
            msg += f"⚠️ SET Error: `{e}`\n"

    # TFEX Account
    if setting.derivatives_account:
        try:
            tfex = get_derivatives_instance(user.id, setting.derivatives_account)
            if not tfex:
                msg += f"⚠️ TFEX Error: `Disconnected`\n"
            else:
                info = tfex.get_account_info()

                equity_val = info.get('equity', info.get('equityBalance', 0))
                excess_val = info.get('excessEquity', 0)
                
                eq_str = f"{equity_val:,.2f}".rjust(15)
                ee_str = f"{excess_val:,.2f}".rjust(15)

                msg += f"*TFEX Acc :* `{setting.derivatives_account}`\n"
                msg += "```\n"
                msg += f"Equity     : {eq_str}\n"
                msg += f"EE (Avail) : {ee_str}\n"
                msg += "```\n"
        except Exception as e:
            msg += f"⚠️ TFEX Error: `{e}`\n"

    await update.message.reply_text(msg, parse_mode="Markdown")

async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    active_orders = []
    
    # SET
    if setting.account_no:
        try:
            equity = get_equity_instance(user.id, setting.account_no)
            if equity:
                orders = equity.get_orders()
                if orders:
                    for o in orders: o['mkt_type'] = 'SET'
                    active_orders.extend(orders)
        except: pass

    # TFEX
    if setting.derivatives_account:
        try:
            tfex = get_derivatives_instance(user.id, setting.derivatives_account)
            if tfex:
                orders = tfex.get_orders()
                if orders:
                    for o in orders: o['mkt_type'] = 'TFEX'
                    active_orders.extend(orders)
        except: pass

    # Filter Pending
    ignore_statuses = ['MATCH', 'CANCEL', 'REJECT', 'EXPIRE', 'ERROR', 'FAIL', 'SUCCESS']
    filtered_orders = [
        o for o in active_orders 
        if not any(k in str(o.get('showOrderStatus', o.get('showStatus', o.get('status', 'Unknown')))).upper() for k in ignore_statuses)
    ]

    if not filtered_orders:
        await update.message.reply_text("✅ *พอร์ตว่างครับ* (ไม่มีออเดอร์ค้าง)", parse_mode="Markdown")
        return

    msg = f"*Pending Orders ({len(filtered_orders)})*\n"
    msg += "```\n"
    msg += "Order No |   Time   |   Side   |   Symbol    |  Vol   | Price\n"
    msg += "--------------------------------------------------------------\n"

    for o in filtered_orders:
        ord_no = str(o.get('orderNo', ''))[-8:].ljust(8)
        time_str = format_time(o.get('entryTime', '-')).center(8)
        raw_side = str(o.get('side', '')).strip().upper()
        raw_pos = str(o.get('position', '')).strip().upper()
        if raw_pos == "OPEN":
            side_str = f"O-{raw_side[:5]}"
        elif raw_pos == "CLOSE":
            side_str = f"C-{raw_side[:5]}"
        else:
            side_str = raw_side[:8]
            
        side = side_str.ljust(8)
        sym = o.get('symbol', '').ljust(11)
        vol = f"{o.get('vol', o.get('qty', 0)):,}".rjust(6)
        pri = str(o.get('price', 'MKT')).rjust(6)
        
        msg += f"{ord_no} | {time_str} | {side} | {sym} | {vol} | {pri}\n"
    
    msg += "```"
    await update.message.reply_text(msg, parse_mode="Markdown")

async def cmd_status_match(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    all_orders = []
    if setting.account_no:
        try:
            eq = get_equity_instance(user.id, setting.account_no)
            if eq:
                orders = eq.get_orders()
                if orders: all_orders.extend(orders)
        except: pass
        
    if setting.derivatives_account:
        try:
            tf = get_derivatives_instance(user.id, setting.derivatives_account)
            if tf:
                orders = tf.get_orders()
                if orders: all_orders.extend(orders)
        except: pass

    match_keywords = ['MATCH', 'SUCCESS']
    matched_orders = [
        o for o in all_orders 
        if any(k in str(o.get('showOrderStatus', o.get('showStatus', o.get('status', 'Unknown')))).upper() for k in match_keywords)
    ]

    if not matched_orders:
        await update.message.reply_text("*ยังไม่มีออเดอร์ที่จับคู่สำเร็จครับ*", parse_mode="Markdown")
        return

    msg = f"*Matched Orders ({len(matched_orders)})*\n"
    msg += "```\n"
    msg += "Order No |   Time   |   Side   |   Symbol    |  Vol   | Price\n"
    msg += "--------------------------------------------------------------\n"

    for o in matched_orders:
        ord_no = str(o.get('orderNo', ''))[-8:].ljust(8)
        raw_time = o.get('tradeTime', o.get('entryTime', '-'))
        time_str = format_time(raw_time).center(8)
        raw_side = str(o.get('side', '')).strip().upper()
        raw_pos = str(o.get('position', '')).strip().upper()
        if raw_pos == "OPEN":
            side_str = f"O-{raw_side[:5]}"
        elif raw_pos == "CLOSE":
            side_str = f"C-{raw_side[:5]}"
        else:
            side_str = raw_side[:8]
            
        side = side_str.ljust(8)
        sym = str(o.get('symbol', '')).ljust(11)
        vol = f"{o.get('vol', o.get('qty', 0)):,}".rjust(6)
        pri = str(o.get('price', 'MKT')).rjust(6)
        
        msg += f"{ord_no} | {time_str} | {side} | {sym} | {vol} | {pri}\n"
    
    msg += "```"
    await update.message.reply_text(msg, parse_mode="Markdown")

async def cmd_cancel_all(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    await update.message.reply_text("🔥 *กำลังดำเนินการยกเลิกทุกออเดอร์...*", parse_mode="Markdown")

    count = 0
    # Cancel SET
    if setting.account_no:
        try:
            eq = get_equity_instance(user.id, setting.account_no)
            if eq:
                orders = eq.get_orders()
                for o in orders:
                    if o.get('canCancel'):
                        eq.cancel_order(order_no=o['orderNo'], pin=setting.pin)
                        count += 1
        except: pass
    
    # Cancel TFEX
    if setting.derivatives_account:
        try:
            tfex = get_derivatives_instance(user.id, setting.derivatives_account)
            if tfex:
                orders = tfex.get_orders()
                for o in orders:
                    if o.get('canCancel'):
                        tfex.cancel_order(order_no=o['orderNo'], pin=setting.pin)
                        count += 1
        except: pass

    await update.message.reply_text(f"🚫 *Panic Cancel Completed* \nCanceled : {count} orders\n✅ เคลียร์พอร์ตเรียบร้อยครับ", parse_mode="Markdown")

async def cmd_cancel_symbol(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    match = re.match(r"^/cancel_([A-Za-z0-9]+)$", text)
    if not match: return

    target_symbol = match.group(1).upper()
    chat_id = update.effective_chat.id
    user, setting = await get_user_by_chat_id(chat_id)
    if not user: return

    count = 0
    
    # Cancel SET
    if setting.account_no:
        try:
            eq = get_equity_instance(user.id, setting.account_no)
            if eq:
                orders = eq.get_orders()
                for o in orders:
                    if o['symbol'] == target_symbol and o.get('canCancel'):
                        eq.cancel_order(o['orderNo'], pin=setting.pin)
                        count += 1
        except: pass

    # Cancel TFEX
    if setting.derivatives_account:
        try:
            tfex = get_derivatives_instance(user.id, setting.derivatives_account)
            if tfex:
                orders = tfex.get_orders()
                for o in orders:
                    if o['symbol'] == target_symbol and o.get('canCancel'):
                        tfex.cancel_order(o['orderNo'], pin=setting.pin)
                        count += 1
        except: pass

    if count > 0:
        await update.message.reply_text(f"🗑️ ยกเลิก *{target_symbol}* เรียบร้อย ({count} รายการ)", parse_mode="Markdown")
    else:
        await update.message.reply_text(f"🔍 ไม่พบออเดอร์ *{target_symbol}* ที่ยกเลิกได้ครับ", parse_mode="Markdown")

# Startup Logic
async def start_telegram_bot():
    global bot_app
    
    db: Session = SessionLocal()
    first_setting = db.query(models.SystemSetting).filter(
        models.SystemSetting.telegram_bot_token != None,
        models.SystemSetting.telegram_bot_token != ""
    ).first()
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