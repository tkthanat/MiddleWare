import { FaPowerOff } from 'react-icons/fa';

const SaveBar = ({ isSystemOnline }) => {
  return (
    <div className="fixed-bottom bg-white border-top p-3 text-center shadow-lg" style={{zIndex: 1050}}>
        <button 
            type="submit" 
            className={`btn btn-lg px-5 rounded-pill fw-bold shadow-sm transition-all ${!isSystemOnline ? 'btn-secondary' : 'btn-primary'}`}
            disabled={!isSystemOnline}
        >
            {!isSystemOnline ? (
                <span><FaPowerOff className="me-2"/>Offline</span>
            ) : (
                <span>Save Settings</span>
            )}
        </button>
    </div>
  );
};

export default SaveBar;