import { FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

const SafetyForm = ({ data, onChange }) => {
  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
         <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaShieldAlt className="me-2 text-muted"/> Safety Protection</h6>
        </div>
        
        <div className="mb-3">
           <label className="text-muted small fw-bold">MIN/MAX Trade Guard</label>
           <div className="d-flex align-items-center text-success small fw-bold">
              <FaCheckCircle className="me-2"/> Active (Skip {"<"} 100)
           </div>
        </div>
        <div className="mb-3">
           <label className="text-muted small fw-bold">Retry Mechanism</label>
           <div className="d-flex align-items-center text-success small fw-bold">
              <FaCheckCircle className="me-2"/> Ask User Notification
           </div>
        </div>

        <div className={`mt-4 p-3 rounded border transition-all ${data.is_max_loss_active ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' : 'bg-light border-light'}`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className={`small fw-bold ${data.is_max_loss_active ? 'text-danger' : 'text-muted'}`}>Max Loss Limit (Daily)</span>
                <div className="form-check form-switch">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        name="is_max_loss_active"
                        checked={data.is_max_loss_active || false}
                        onChange={onChange}
                    />
                </div>
            </div>
            
            {data.is_max_loss_active ? (
                <div className="input-group input-group-sm">
                    <input 
                        type="number" 
                        className="form-control border-danger text-danger fw-bold opacity-50" 
                        placeholder="5000"
                        name="max_loss_amount"
                        value={data.max_loss_amount}
                        onChange={onChange}
                    />
                    <span className="input-group-text bg-danger text-white border-danger">THB</span>
                </div>
            ) : (
                <div className="d-flex align-items-center text-muted opacity-50">Disabled</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SafetyForm;