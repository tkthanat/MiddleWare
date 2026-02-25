import React from 'react';
import { FaPlug, FaKey, FaGlobe, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const ApiConnectionForm = ({ data, onChange }) => {
  
  // Helper สำหรับการเปลี่ยนโหมด Sandbox/Production
  const handleModeChange = (isSandbox) => {
    onChange({
      target: {
        name: 'is_sandbox',
        value: isSandbox
      }
    });
  };

  return (
    <div className="card dashboard-card border-0 mb-4 shadow-sm">
      <div className="card-body p-4">
        
        {/* Header & Toggle Switch */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h5 className="fw-bold text-dark m-0 d-flex align-items-center">
            <FaPlug className="me-2 text-primary" /> API Connection Setup
          </h5>
          
          <div className="d-flex bg-light rounded-pill p-1 border">
            <button
              type="button"
              onClick={() => handleModeChange(true)}
              className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${
                data.is_sandbox 
                  ? 'btn-success text-white shadow-sm' 
                  : 'text-muted'
              }`}
            >
              Sandbox
            </button>
            <button
              type="button"
              onClick={() => handleModeChange(false)}
              className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${
                !data.is_sandbox 
                  ? 'btn-danger text-white shadow-sm' 
                  : 'text-muted'
              }`}
            >
              Production
            </button>
          </div>
        </div>

        {/* Input Grid */}
        <div className="row g-3">
            
            {/* App ID */}
            <div className="col-12 col-md-6">
                <label className="text-muted small fw-bold mb-1">App ID (Consumer Key)</label>
                <div className="input-group">
                    <span className="input-group-text bg-white text-muted"><FaKey /></span>
                    <input 
                        type="text" 
                        className="form-control bg-light"
                        name="app_id"
                        value={data.app_id || ''}
                        onChange={onChange}
                        placeholder={data.is_sandbox ? "Auto-filled for Sandbox" : "Required for Production"}
                    />
                </div>
            </div>

            {/* App Secret */}
            <div className="col-12 col-md-6">
                <label className="text-muted small fw-bold mb-1">App Secret</label>
                <div className="input-group">
                    <span className="input-group-text bg-white text-muted"><FaKey /></span>
                    <input 
                        type="password" 
                        className="form-control bg-light"
                        name="app_secret"
                        value={data.app_secret || ''}
                        onChange={onChange}
                        placeholder={data.is_sandbox ? "Auto-filled for Sandbox" : "Required for Production"}
                    />
                </div>
            </div>

            {/* Production Only Fields */}
            {!data.is_sandbox && (
                <>
                    <div className="col-12 col-md-6">
                        <label className="text-muted small fw-bold mb-1">Broker ID</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white text-muted"><FaGlobe /></span>
                            <input 
                                type="text" 
                                className="form-control bg-light"
                                name="broker_id"
                                value={data.broker_id || ''}
                                onChange={onChange}
                                placeholder="e.g. 028"
                            />
                        </div>
                    </div>
                    <div className="col-12 col-md-6">
                        <label className="text-muted small fw-bold mb-1">App Code</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white text-muted"><FaGlobe /></span>
                            <input 
                                type="text" 
                                className="form-control bg-light"
                                name="app_code"
                                value={data.app_code || ''}
                                onChange={onChange}
                                placeholder="e.g. ALGO"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* Helper Text */}
        <div className={`alert mt-3 mb-0 py-2 d-flex align-items-center small ${data.is_sandbox ? 'alert-success' : 'alert-warning'}`}>
            {data.is_sandbox ? (
                <><FaCheckCircle className="me-2" /> <strong>Sandbox Mode</strong>: ระบบจะใช้ Key ทดสอบให้อัตโนมัติหากไม่ได้ระบุ</>
            ) : (
                <><FaExclamationTriangle className="me-2" /> <strong>Production Mode</strong>: กรุณาระบุ Key ของบัญชีจริงให้ถูกต้อง ระบบจะทำการเชื่อมต่อใหม่ทันทีที่กด Save</>
            )}
        </div>

      </div>
    </div>
  );
};

export default ApiConnectionForm;