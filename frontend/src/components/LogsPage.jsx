import { useState, useEffect } from 'react'
import axios from 'axios'
import { FaHistory, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa'

import '../css/LogsPage.css'

function LogsPage() {
  const [logs, setLogs] = useState([])
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/logs')
      setLogs(response.data)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  // Logic Pagination & Empty Rows
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const emptyRows = itemsPerPage - currentLogs.length

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS': return <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill"><FaCheckCircle className="me-1"/>Success</span>
      case 'ERROR': return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill"><FaTimesCircle className="me-1"/>Error</span>
      default: return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-3 py-2 rounded-pill"><FaExclamationCircle className="me-1"/>Skipped</span>
    }
  }

  return (
    <div className="container">
      <div className="card logs-card">
        <div className="card-header bg-white py-3 border-bottom">
          <h4 className="mb-0 fw-bold text-primary"><FaHistory className="me-2"/> Trade History</h4>
        </div>
        <div className="card-body p-0 d-flex flex-column justify-content-between">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light text-secondary text-uppercase small fw-bold">
                <tr>
                  <th className="py-3 ps-4 col-timestamp">Timestamp</th>
                  <th className="py-3 ps-4 col-symbol">Symbol</th>
                  <th className="py-3 ps-4 col-side">Side</th>
                  <th className="py-3 ps-4 col-price">Price</th>
                  <th className="py-3 ps-4 col-volume">Volume</th>
                  <th className="py-3 ps-4 col-status">Status</th>
                  <th className="py-3 ps-4 col-detail">Detail</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.length === 0 && logs.length === 0 ? (
                   <tr><td colSpan="7" className="text-center py-5 text-muted">There is no trading history yet</td></tr>
                ) : (
                  <>
                    {currentLogs.map((log, index) => (
                      <tr key={index} className="table-row-fixed">
                        <td className="ps-4 text-muted small col-timestamp">{log.timestamp}</td>
                        <td className="fw-bold text-dark col-symbol">{log.symbol}</td>
                        
                        <td className="col-side"> 
                          <span className={`fw-bold ${log.action === 'Buy' ? 'text-success' : 'text-danger'}`}>
                            {log.action}
                          </span>
                        </td>
                        
                        <td className="col-price">{log.price}</td> 
                        <td className="col-volume">{log.volume.toLocaleString()}</td> 
                        
                        <td className="col-status">{getStatusBadge(log.status)}</td> 
                        
                        <td className="text-muted small text-truncate col-detail">
                            {log.detail}
                        </td>
                      </tr>
                    ))}

                    {/* Empty Rows Filler */}
                    {emptyRows > 0 && [...Array(emptyRows)].map((_, index) => (
                      <tr key={`empty-${index}`} className="table-row-fixed">
                        <td colSpan="7">&nbsp;</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer bg-white border-top py-3 mt-auto">
              <nav>
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className={`page-link ${currentPage === 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      &laquo; Previous
                    </button>
                  </li>

                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button className="page-link cursor-pointer" onClick={() => paginate(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className={`page-link ${currentPage === totalPages ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogsPage