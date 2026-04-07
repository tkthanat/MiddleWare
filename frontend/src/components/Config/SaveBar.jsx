const SaveBar = () => {
  return (
    <div className="fixed-bottom bg-white border-top p-3 text-center shadow-lg" style={{zIndex: 1050}}>
        <button 
            type="submit" 
            className="btn btn-primary btn-lg px-5 rounded-pill fw-bold shadow-sm transition-all"
        >
          Save Settings
        </button>
    </div>
  );
};

export default SaveBar;