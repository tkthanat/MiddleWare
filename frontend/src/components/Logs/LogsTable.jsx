import { useState } from 'react';
import { FaSearch, FaCheck, FaTimes, FaShieldAlt, FaCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const LogsTable = ({ 
    logs, searchTerm, onSearchChange, 
    currentPage, totalPages, onPageChange, emptyRows,
    filterType, onFilterChange
}) => {

  const [selectedLog, setSelectedLog] = useState(null);

  const getStatusPill = (status) => {
     const s = (status || '').toUpperCase();

     if(s === 'SUCCESS' || s === 'MATCHED') {
         return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-1 fw-bold"><FaCheck className="me-1"/> {status}</span>;
     }
     if(s === 'SKIPPED' || s === 'QUEUED' || s === 'SUBMITTED') {
         return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-3 py-1 fw-bold"><FaShieldAlt className="me-1"/> {status}</span>;
     }
     if(s === 'CANCELLED') {
         return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-1 fw-bold"><FaCircle className="me-1" size={10}/> {status}</span>;
     }
     return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3 py-1 fw-bold"><FaTimes className="me-1"/> {status}</span>;
  };

  const getPaginationItems = () => {
      if (totalPages <= 4) return Array.from({length: totalPages}, (_, i) => i + 1);
      if (currentPage <= 2) return [1, 2, 3, '...', totalPages];
      if (currentPage >= totalPages - 1) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      return [1, currentPage -1 , currentPage, '...', totalPages];
  };

  return (
    <>
    <div className="card dashboard-card border-0 shadow-sm">
      
      {/* Header & Tools Bar */}
      <div className="card-header bg-white border-0 pt-4 px-4 pb-2">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center w-100 w-md-auto">
                <h5 className="fw-bold text-dark m-0">Trade History Table</h5>
            </div>
            <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
                <div className="btn-group w-100 w-sm-auto" role="group">
                    {[
                        { label: 'All', value: 'ALL' },
                        { label: 'Today', value: 'TODAY' },
                        { label: 'Yesterday', value: 'YESTERDAY' },
                        { label: 'Last 7 Days', value: 'LAST_7_DAYS' }
                    ].map((btn) => (
                        <button key={btn.value} type="button" className={`btn btn-sm px-3 border ${filterType === btn.value ? 'btn-primary text-white fw-bold' : 'btn-light text-muted bg-white'}`} onClick={() => onFilterChange(btn.value)} style={{ height: '34px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>{btn.label}</button>
                    ))}
                </div>
                <div className="input-group input-group-sm search-box-responsive" style={{ height: '34px' }}>
                    <span className="input-group-text bg-white border-end-0 ps-3 text-muted"><FaSearch size={12}/></span>
                    <input type="text" className="form-control bg-white border-start-0 ps-2" placeholder="Search..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} style={{ fontSize: '13px', height: '100%' }}/>
                </div>
            </div>
        </div>
      </div>

       <div className="card-body px-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle custom-table mb-0 table-fixed-layout">
            <thead className="bg-light text-muted small text-uppercase fw-bold">
              <tr>
                <th className="ps-4 col-checkbox"></th>
                <th className="col-date text-start">Date</th>
                <th className="col-time text-start">Time</th>
                <th className="col-symbol text-start">Symbol</th>
                <th className="col-action text-center">Action</th>
                <th className="col-price text-end pe-4">Price</th>
                <th className="col-volume text-end pe-4">Volume</th>
                <th className="col-status text-center">Status</th>
                <th className="col-reason text-start ps-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (logs.map((log, index) => {
                      const [datePart, timePart] = log.timestamp.split(' ');
                      return (
                        <tr key={index} className="table-row-fixed" onClick={() => setSelectedLog(log)} style={{ cursor: 'pointer' }}>
                          <td className="ps-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="form-check-input shadow-none"/></td>
                          <td className="text-muted small text-start font-monospace">{datePart}</td>
                          <td className="fw-bold text-dark small text-start font-monospace">{timePart}</td>
                          <td className="fw-bold text-primary text-start">{log.symbol}</td>
                          <td className="text-center"><span className={`fw-bold small ${log.action === 'Buy' || log.action === 'LONG' ? 'text-success' : 'text-danger'}`}>{log.action}</span></td>
                          <td className="font-monospace text-end pe-4">{log.price}</td>
                          <td className="font-monospace text-end pe-4">{log.volume.toLocaleString()}</td>
                          <td className="text-center">{getStatusPill(log.status)}</td>
                          <td className="text-muted small text-truncate text-start ps-3" title={log.detail}>{log.detail}</td>
                        </tr>
                      );
                  })
              ) : (<tr><td colSpan="9" className="text-center py-5 text-muted">No logs found for "{searchTerm}"</td></tr>)}
              {emptyRows > 0 && logs.length > 0 && [...Array(emptyRows)].map((_, index) => (
                  <tr key={`empty-${index}`} className="table-row-fixed"><td colSpan="9">&nbsp;</td></tr>))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
           <div className="d-flex align-items-center gap-2 text-muted small"><FaCircle className="text-success" size={8}/> System Health: OK</div>
           {totalPages > 0 && (
              <nav><ul className="pagination pagination-sm mb-0 gap-1">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button className="page-link rounded d-flex align-items-center justify-content-center shadow-none" style={{width: '32px', height: '32px', padding: 0}} onClick={() => onPageChange(Math.max(currentPage - 1, 1))}><FaChevronLeft size={10}/></button>
                      </li>
                      {getPaginationItems().map((page, index) => (
                          <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                              {page === '...' ? <span className="page-link border-0 text-muted bg-transparent d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', padding: 0}}>...</span> 
                              : <button className="page-link rounded shadow-none fw-bold small" style={{width: '32px', height: '32px', padding: 0}} onClick={() => onPageChange(page)}>{page}</button>}
                          </li>))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button className="page-link rounded d-flex align-items-center justify-content-center shadow-none" style={{width: '32px', height: '32px', padding: 0}} onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}><FaChevronRight size={10}/></button>
                      </li></ul></nav>)}
        </div>
      </div>
    </div>

    {/* Modal Pop-up (Order Details) */}
    {selectedLog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
                    
                    {/* Header */}
                    <div className="modal-header bg-light border-bottom px-4 pt-4 pb-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title fw-bold text-dark">
                            Order Details
                        </h5>
                        <FaTimes 
                            onClick={() => setSelectedLog(null)} 
                            className="cursor-pointer text-secondary opacity-75 hover-opacity-100" 
                            style={{ cursor: 'pointer', fontSize: '1.2rem' }}
                            title="Close"
                        />
                    </div>
                    
                    <div className="modal-body p-4">
                        
                        <h6 className="fw-bold mb-3 text-secondary border-bottom pb-2">Order Info</h6>
                        <div className="row mb-4">
                            {/* Left Column */}
                            <div className="col-md-6 pe-md-4">
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Order No.</span>
                                    <span className="fw-bold font-monospace text-dark">
                                        {selectedLog.order_no !== '-' 
                                            ? selectedLog.order_no 
                                            : (selectedLog.detail?.match(/Order No:\s*([A-Za-z0-9]+)/)?.[1] || '-')}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Symbol</span>
                                    <span className="fw-bold text-primary">{selectedLog.symbol}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Side</span>
                                    <span className={`fw-bold ${selectedLog.action === 'Buy' || selectedLog.action === 'LONG' ? 'text-success' : 'text-danger'}`}>{selectedLog.action}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Volume</span>
                                    <span className="fw-bold font-monospace text-dark">{selectedLog.volume?.toLocaleString() || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Matched</span>
                                    <span className="fw-bold text-success font-monospace">{selectedLog.matched_volume?.toLocaleString() || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Status</span>
                                    <span>{getStatusPill(selectedLog.status)}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 pb-2">
                                    <span className="text-muted small">Reject Code</span>
                                    <span className="fw-bold text-danger font-monospace">{selectedLog.reject_code || '-'}</span>
                                </div>
                            </div>
                            
                            {/* Right Column */}
                            <div className="col-md-6 ps-md-4 border-start-md">
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Account No.</span>
                                    <span className="fw-bold font-monospace text-dark">{selectedLog.account_no || '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Trade Date</span>
                                    <span className="fw-bold font-monospace text-dark">{selectedLog.timestamp}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Price</span>
                                    <span className="fw-bold font-monospace text-dark">{selectedLog.price}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Order Type</span>
                                    <span className="fw-bold text-dark">{selectedLog.order_type || '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Cancelled</span>
                                    <span className="fw-bold text-secondary font-monospace">{selectedLog.cancelled_volume?.toLocaleString() || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 pb-2">
                                    <span className="text-muted small">Reject Reason</span>
                                    <span className="fw-bold text-danger text-end" style={{maxWidth: '180px'}}>{selectedLog.reject_reason !== '-' ? selectedLog.reject_reason : '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* System Detail Section (ปรับเป็น Light Theme, Enhanced Clarity) */}
                        <h6 className="fw-bold mb-3 text-secondary border-bottom pb-2 mt-2">System Diagnostic Detail</h6>
                        {/* 💡 ปรับกลับเป็น bg-light (ธีมเดิม) แต่เพิ่ม text-dark ให้อ่านชัดขึ้น */}
                        <div className="bg-light p-3 rounded-3 border">
                            <small className="font-monospace text-dark lh-lg">
                                {selectedLog.detail}
                            </small>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default LogsTable;