import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const Toast = ({ show, onClose, message = "Operation Successful!", type = "success" }) => {
  if (!show) return null;

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-success' : 'bg-danger';
  const Icon = isSuccess ? FaCheckCircle : FaExclamationCircle;

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{zIndex: 2000}}>
        <div className={`toast show align-items-center text-white ${bgColor} border-0 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex">
                <div className="toast-body fw-bold d-flex align-items-center">
                    <Icon className="me-2" size={20}/>
                    {message}
                </div>
                <button 
                    type="button" 
                    className="btn-close btn-close-white me-2 m-auto" 
                    onClick={onClose}
                ></button>
            </div>
        </div>
    </div>
  );
};

export default Toast;