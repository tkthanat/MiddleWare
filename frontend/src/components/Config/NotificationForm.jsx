import { FaBell, FaCheckCircle } from 'react-icons/fa';

const NotificationForm = ({ data, onChange, testMsgStatus, onTestClick }) => {
  return (
    <div className="card dashboard-card h-100 border-0">
       <div className="card-body p-4">
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 className="fw-bold text-dark mb-0"><FaBell className="me-2 text-muted"/> Notifications (Telegram)</h6>
         </div>
         
         <div className="mb-3">
            <label className="text-muted small fw-bold mb-1">Telegram Bot Token</label>
            <input 
                type="text" 
                className="form-control form-control-modern" 
                placeholder="e.g. 123456:ABC-..." 
                name="telegram_bot_token" 
                value={data.telegram_bot_token} 
                onChange={onChange} 
            />
         </div>

         <div className="mb-4">
            <label className="text-muted small fw-bold mb-1">Telegram Chat ID</label>
            <input 
                type="text" 
                className="form-control form-control-modern" 
                placeholder="e.g. -100123456" 
                name="telegram_chat_id" 
                value={data.telegram_chat_id} 
                onChange={onChange}
            />
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