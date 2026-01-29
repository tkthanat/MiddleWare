import { FaSearch, FaCheck, FaTimes, FaShieldAlt, FaCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const LogsTable = ({ 
    logs, searchTerm, onSearchChange, 
    currentPage, totalPages, onPageChange, emptyRows,
    filterType, onFilterChange
}) => {

  const getStatusPill = (status) => {
     if(status === 'SUCCESS') return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3"><FaCheck className="me-1"/> Executed</span>;
     if(status === 'SKIPPED') return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-3"><FaShieldAlt className="me-1"/> Skipped</span>;
     return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3"><FaTimes className="me-1"/> Failed</span>;
  };

  const getPaginationItems = () => {
      if (totalPages <= 4) return Array.from({length: totalPages}, (_, i) => i + 1);
      if (currentPage <= 2) return [1, 2, 3, '...', totalPages];
      if (currentPage >= totalPages - 1) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
      return [1, currentPage -1 , currentPage, '...', totalPages];
  };

  const FilterButton = ({ label, type }) => (
      <button 
          className={`btn btn-sm fw-bold border ${filterType === type ? 'btn-primary text-white' : 'btn-light text-muted'}`}
          onClick={() => onFilterChange(type)}
      >
          {label}
      </button>
  );

  return (
    <div className="card dashboard-card border-0 shadow-sm">
      <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between flex-wrap gap-3">
          <h5 className="fw-bold text-dark mb-0">Trade History Table</h5>
          <div className="d-flex gap-2">
              
              <div className="btn-group">
                  <FilterButton label="All" type="ALL" />
                  <FilterButton label="Today" type="TODAY" />
                  <FilterButton label="Yesterday" type="YESTERDAY" />
                  <FilterButton label="Last 7 Days" type="LAST_7_DAYS" />
              </div>

              <div className="input-group input-group-sm" style={{width: '250px'}}>
                  <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted"/></span>
                  <input 
                      type="text" 
                      className="form-control bg-light border-start-0" 
                      placeholder="Search ..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                  />
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
              {logs.length > 0 ? (
                  logs.map((log, index) => {
                      const [datePart, timePart] = log.timestamp.split(' ');
                      return (
                        <tr key={index} className="table-row-fixed">
                          <td className="ps-4"><input type="checkbox" className="form-check-input"/></td>
                          <td className="text-muted small text-start font-monospace">{datePart}</td>
                          <td className="fw-bold text-dark small text-start font-monospace">{timePart}</td>
                          <td className="fw-bold text-primary text-start">{log.symbol}</td>
                          <td className="text-center"><span className={`fw-bold small ${log.action === 'Buy' ? 'text-success' : 'text-danger'}`}>{log.action}</span></td>
                          <td className="font-monospace text-end pe-4">{log.price}</td>
                          <td className="font-monospace text-end pe-4">{log.volume.toLocaleString()}</td>
                          <td className="text-center">{getStatusPill(log.status)}</td>
                          <td className="text-muted small text-truncate text-start ps-3" title={log.detail}>{log.detail}</td>
                        </tr>
                      );
                  })
              ) : (
                  <tr><td colSpan="9" className="text-center py-5 text-muted">No logs found for "{searchTerm}"</td></tr>
              )}

              {emptyRows > 0 && logs.length > 0 && [...Array(emptyRows)].map((_, index) => (
                  <tr key={`empty-${index}`} className="table-row-fixed"><td colSpan="9">&nbsp;</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
           <div className="d-flex align-items-center gap-2 text-muted small">
              <FaCircle className="text-success" size={8}/> System Health: OK
           </div>
           
           {totalPages > 0 && (
              <nav>
                  <ul className="pagination mb-0 gap-1">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button className="page-link rounded d-flex align-items-center justify-content-center shadow-none" 
                                  style={{width: '32px', height: '32px', padding: 0}}
                                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}>
                              <FaChevronLeft size={10}/>
                          </button>
                      </li>
                      {getPaginationItems().map((page, index) => (
                          <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                              {page === '...' ? (
                                  <span className="page-link border-0 text-muted bg-transparent d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', padding: 0}}>...</span>
                              ) : (
                                  <button className="page-link rounded shadow-none fw-bold small" style={{width: '32px', height: '32px', padding: 0}} onClick={() => onPageChange(page)}>{page}</button>
                              )}
                          </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button className="page-link rounded d-flex align-items-center justify-content-center shadow-none" 
                                  style={{width: '32px', height: '32px', padding: 0}}
                                  onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}>
                              <FaChevronRight size={10}/>
                          </button>
                      </li>
                  </ul>
              </nav>
           )}
        </div>
      </div>
    </div>
  );
};

export default LogsTable;