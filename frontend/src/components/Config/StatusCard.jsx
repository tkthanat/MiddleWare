import { FaServer } from 'react-icons/fa';

const StatusCard = ({ isSystemOnline, isSystemActive, onEmergencyClick }) => {
  return (
    <div className="card dashboard-card mb-4 border-0">
      <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h5 className="fw-bold text-dark text-uppercase mb-3 ls-1">System Status</h5>
          <div className="d-flex align-items-center gap-3">
             <span className={`badge px-3 py-2 rounded-3 ${!isSystemActive ? 'bg-danger' : (isSystemOnline ? 'bg-success' : 'bg-secondary')}`}>
                <FaServer className="me-2"/> 
                {!isSystemActive ? 'SYSTEM STOPPED' : (isSystemOnline ? 'ONLINE' : 'OFFLINE')}
             </span>
             <div className="d-flex flex-column ms-2">
               <span className="text-muted small fw-bold">Settrade Connection: <span className={isSystemOnline ? 'text-success' : 'text-danger'}>{isSystemOnline ? 'CONNECTED' : 'DISCONNECTED'}</span></span>
               <span className="text-muted small fw-bold">Trading Mode: <span className={!isSystemActive ? 'text-danger' : 'text-success'}>{!isSystemActive ? 'Halted (Emergency)' : 'Running'}</span></span>
             </div>
          </div>
        </div>
        <button 
            className={`btn ${!isSystemActive ? 'btn-success' : 'btn-danger'}`} 
            onClick={onEmergencyClick} 
            type="button"
        >
            {!isSystemActive ? <>▶ RESUME / RESET SYSTEM</> : <>🚨 EMERGENCY STOP</>}
        </button>
      </div>
    </div>
  );
};

export default StatusCard;