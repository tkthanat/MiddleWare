import { useState } from 'react';
import { FaSearch, FaCheck, FaTimes, FaShieldAlt, FaCircle, FaChevronLeft, FaChevronRight, FaSyncAlt, FaDownload } from 'react-icons/fa';

const LogsTable = ({ 
    logs, searchTerm, onSearchChange, 
    currentPage, totalPages, onPageChange, emptyRows,
    filterType, onFilterChange, onRefresh, onExport
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

  const getActionColor = (action) => {
      const a = (action || '').toUpperCase();
      if (['BUY', 'LONG', 'OPEN_LONG'].includes(a)) return 'text-success';
      if (['SELL', 'SHORT', 'CLOSE_LONG', 'CLOSE_SHORT'].includes(a)) return 'text-danger';
      return 'text-primary';
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
      
      {/* Header & Controls */}
      <div className="card-header bg-white border-0 pt-4 px-4 pb-3">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-center gap-3">
            
            <div className="d-flex align-items-center w-100 w-lg-auto">
                <h5 className="fw-bold text-dark m-0" style={{ lineHeight: '36px' }}>Trade History Table</h5>
            </div>
            
            <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2 w-100 w-lg-auto">
                {/* Dropdown Filter */}
                <select 
                    className="form-select shadow-none filter-select-minimal m-0" 
                    value={filterType} 
                    onChange={(e) => onFilterChange(e.target.value)}
                >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="LAST_7_DAYS">Last 7 Days</option>
                </select>

                {/* Search Box */}
                <div className="input-group search-box-minimal m-0">
                    <span className="input-group-text bg-white border-end-0 text-muted ps-3 d-flex align-items-center"><FaSearch size={12}/></span>
                    <input 
                        type="text" 
                        className="form-control border-start-0 shadow-none ps-1" 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={(e) => onSearchChange(e.target.value)} 
                    />
                </div>

                {/* Refresh & Export Buttons */}
                <div className="d-flex align-items-center gap-2 m-0 ms-1">
                    <button className="btn btn-minimal-icon shadow-none m-0" onClick={onRefresh} title="Refresh">
                        <FaSyncAlt size={14} />
                    </button>
                    <button className="btn btn-minimal-icon shadow-none m-0" onClick={onExport} title="Export CSV">
                        <FaDownload size={14} />
                    </button>
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
                          <td className="text-muted small text-start font-monospace text-nowrap">{datePart}</td>
                          <td className="fw-bold text-dark small text-start font-monospace text-nowrap">{timePart}</td>
                          <td className="fw-bold text-primary text-start text-nowrap">{log.symbol}</td>
                          <td className="text-center"><span className={`fw-bold small text-nowrap ${getActionColor(log.action)}`}>{log.action}</span></td>
                          <td className="font-monospace text-end pe-4 text-nowrap">{log.price}</td>
                          <td className="font-monospace text-end pe-4 text-nowrap">{log.volume.toLocaleString()}</td>
                          <td className="text-center text-nowrap">{getStatusPill(log.status)}</td>
                          <td className="text-muted small text-truncate text-start ps-3" title={log.detail}>{log.detail}</td>
                        </tr>
                      );
                  })
              ) : (<tr><td colSpan="9" className="text-center py-5 text-muted">No logs found</td></tr>)}
              {emptyRows > 0 && logs.length > 0 && [...Array(emptyRows)].map((_, index) => (
                  <tr key={`empty-${index}`} className="table-row-fixed"><td colSpan="9">&nbsp;</td></tr>))}
            </tbody>
          </table>
        </div>
        
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center px-4 py-3 border-top gap-3">
           <div className="d-flex align-items-center gap-2 text-muted small"><FaCircle className="text-success" size={8}/> System Health: OK</div>
           {totalPages > 0 && (
              <nav>
                <ul className="pagination minimal-pagination mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(Math.max(currentPage - 1, 1))}><FaChevronLeft size={10}/></button>
                    </li>
                    {getPaginationItems().map((page, index) => (
                        <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => page !== '...' && onPageChange(page)}>{page}</button>
                        </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}><FaChevronRight size={10}/></button>
                    </li>
                </ul>
              </nav>
            )}
        </div>
      </div>
    </div>

    {selectedLog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
                    
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
                            <div className="col-md-6 pe-md-4">
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Order No.</span>
                                    <span className="fw-bold font-monospace text-dark">
                                        {selectedLog.order_no !== '-' ? selectedLog.order_no : (selectedLog.detail?.match(/Order No:\s*([A-Za-z0-9]+)/)?.[1] || '-')}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Symbol</span>
                                    <span className="fw-bold text-primary">{selectedLog.symbol}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                    <span className="text-muted small">Side</span>
                                    <span className={`fw-bold ${getActionColor(selectedLog.action)}`}>{selectedLog.action}</span>
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

                        {/* Error Highlighting Box */}
                        <h6 className="fw-bold mb-3 text-secondary border-bottom pb-2 mt-2">System Diagnostic Detail</h6>
                        <div className={`p-3 rounded-3 ${['ERROR', 'FAILED', 'REJECTED', 'CANCELLED'].includes((selectedLog.status || '').toUpperCase()) ? 'bg-danger bg-opacity-10 border border-danger text-danger' : 'bg-light border text-dark'}`}>
                            <small className="font-monospace lh-lg">
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