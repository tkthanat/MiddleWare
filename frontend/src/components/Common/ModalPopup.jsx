import { FaExclamationTriangle, FaPlayCircle } from 'react-icons/fa';

const ModalPopup = ({ show, isSystemActive, onClose, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal-box">
        <div className={`modal-header-custom ${isSystemActive ? 'bg-danger' : 'bg-success'}`}>
            {isSystemActive ? <FaExclamationTriangle size={50} /> : <FaPlayCircle size={50} />}
        </div>
        <div className="modal-body-custom">
            {isSystemActive ? (
                <>
                    <h5>CONFIRM EMERGENCY STOP</h5>
                    <p>Are you sure you want to <b>HALT</b> all trading operations immediately?<br/>All incoming signals will be rejected.</p>
                </>
            ) : (
                <>
                    <h5>RESUME TRADING SYSTEM</h5>
                    <p>Are you sure you want to <b>RESUME</b> operations?<br/>The bot will start processing signals again.</p>
                </>
            )}
        </div>
        <div className="modal-footer-custom">
            <button className="btn-modal btn-modal-cancel" onClick={onClose} type="button">Cancel</button>
            <button 
                className={`btn-modal text-white ${isSystemActive ? 'bg-danger' : 'bg-success'}`}
                onClick={onConfirm}
                type="button"
            >
                {isSystemActive ? 'Continue' : 'Continue'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPopup;