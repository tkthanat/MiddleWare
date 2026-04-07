import React, { useState } from 'react';
import { FaBell, FaCheckCircle, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';

const InfoIcon = ({ title, children, color }) => (
  <div className="info-container ms-1">
    <FaInfoCircle className={`info-icon ${color}`} style={{ fontSize: '0.9em' }} />
    <div className="info-popover text-start" style={{ width: '320px' }}>
      <div className="info-title">{title}</div>
      <ul className="info-list">{children}</ul>
    </div>
  </div>
);

const NotificationForm = ({ data, onChange, testMsgStatus, onTestClick }) => {
  const [showToken, setShowToken] = useState(false);
  const [showChatId, setShowChatId] = useState(false);

  return (
    <div className="card dashboard-card h-100 border-0">
       <div className="card-body p-4">
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
              <FaBell className="me-2 text-muted"/> 
              Notifications (Telegram)
              <InfoIcon title="วิธีตั้งค่า Telegram Bot" color="text-primary">
                <li><b>Bot Token :</b> ค้นหา <code>@BotFather</code> ใน Telegram พิมพ์ /newbot ทำตามขั้นตอนเพื่อรับ Token</li>
                <li><b>Chat ID :</b> ค้นหา <code>@userinfobot</code> แล้วกด Start จะได้ตัวเลข Chat ID (เช่น 12345678) หากเป็น Group จะมีเครื่องหมายลบนำหน้า</li>
              </InfoIcon>
            </h6>
         </div>
         
         <div className="mb-3">
            <label className="text-muted small fw-bold mb-1">Telegram Bot Token</label>
            <div className="position-relative">
                <input 
                    type={showToken ? "text" : "password"} 
                    className="form-control form-control-modern" 
                    placeholder="e.g. 123456:ABC-..." 
                    name="telegram_bot_token" 
                    value={data.telegram_bot_token} 
                    onChange={onChange}
                    style={{ paddingRight: '2.5rem' }} 
                />
                <div 
                  className="position-absolute d-flex align-items-center justify-content-center" 
                  style={{ right: '12px', top: '0', bottom: '0', cursor: 'pointer', color: '#6c757d' }}
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <FaEyeSlash /> : <FaEye />}
                </div>
            </div>
         </div>

         <div className="mb-4">
            <label className="text-muted small fw-bold mb-1">Telegram Chat ID</label>
            <div className="position-relative">
                <input 
                    type={showChatId ? "text" : "password"} 
                    className="form-control form-control-modern" 
                    placeholder="e.g. -100123456" 
                    name="telegram_chat_id" 
                    value={data.telegram_chat_id} 
                    onChange={onChange}
                    style={{ paddingRight: '2.5rem' }}
                />
                <div 
                  className="position-absolute d-flex align-items-center justify-content-center" 
                  style={{ right: '12px', top: '0', bottom: '0', cursor: 'pointer', color: '#6c757d' }}
                  onClick={() => setShowChatId(!showChatId)}
                >
                  {showChatId ? <FaEyeSlash /> : <FaEye />}
                </div>
            </div>
         </div>

         <div className="d-flex justify-content-between align-items-center mt-2">
            <div 
                className="d-flex align-items-center small fw-bold px-3 py-2 rounded-3 text-success bg-success bg-opacity-10 border border-success border-opacity-10"
                style={{opacity: testMsgStatus ? 1 : 0, transition: 'opacity 0.3s'}}
            >
                <FaCheckCircle className="me-2"/> Message sent!
            </div>

            <button 
                type="button" 
                className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
                onClick={onTestClick}
            >
                Test Notification
            </button>
         </div>

       </div>
    </div>
  );
};

export default NotificationForm;