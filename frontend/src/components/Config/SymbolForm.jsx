import { useState, useEffect } from 'react';
import { FaList, FaPlus, FaTrashAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const SymbolForm = ({ data, onChange }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const currentSymbolsString = data?.active_symbols || "";
  
  const symbolList = currentSymbolsString
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '');

  const totalPages = Math.ceil(symbolList.length / ITEMS_PER_PAGE) || 1;

  const paginatedSymbols = symbolList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [symbolList.length, currentPage, totalPages]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    
    const formattedSymbol = newSymbol.toUpperCase().trim();
    
    if (!symbolList.includes(formattedSymbol)) {
      const updatedList = [...symbolList, formattedSymbol];
      const updatedString = updatedList.join(', ');
      
      onChange({ target: { name: 'active_symbols', value: updatedString } });
      
      const newTotalPages = Math.ceil(updatedList.length / ITEMS_PER_PAGE);
      setCurrentPage(newTotalPages);
    }
    setNewSymbol('');
  };

  const handleRemove = (symbolToRemove) => {
    const updatedList = symbolList.filter(sym => sym !== symbolToRemove);
    const updatedString = updatedList.join(', ');
    onChange({ target: { name: 'active_symbols', value: updatedString } });
  };

  return (
    <div className="card dashboard-card border-0 w-100 h-100 d-flex flex-column">
      <div className="card-body p-4 d-flex flex-column">
        
        {/* Header Section */}
        <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaList className="me-2 text-muted"/> Whitelist Symbols</h6>
        </div>
        <p className="text-muted small mb-3">
          กำหนดรายชื่อหุ้น (SET) หรือสัญญา (TFEX) ที่อนุญาตให้บอททำการเทรดได้ (หากเว้นว่างไว้ บอทจะรับคำสั่งทุกตัว)
        </p>
        
        {/* ช่องกรอกเพิ่ม Symbol */}
        <div className="input-group mb-4 shadow-sm">
          <input 
            type="text" 
            className="form-control bg-light border-end-0" 
            placeholder="e.g. PTT, AOT, S50H26" 
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd(e)}
          />
          <button type="button" className="btn btn-primary px-3" onClick={handleAdd}>
            <FaPlus className="me-1" /> Add
          </button>
        </div>

        {/* รายการ Symbol */}
        <div className="flex-grow-1">
          <ul className="list-unstyled mb-0">
            {paginatedSymbols.length === 0 ? (
              <li className="text-muted small fst-italic text-center p-3 bg-light rounded border">
                No symbols added yet.
              </li>
            ) : (
              paginatedSymbols.map((sym, index) => {
                const isLast = index === paginatedSymbols.length - 1; 
                
                return (
                  <li 
                    key={index} 
                    className={`d-flex justify-content-between align-items-center ${isLast ? 'mb-0' : 'mb-3 border-bottom pb-2'}`}
                  >
                    <span className="text-dark fw-bold small">{sym}</span>
                    <FaTrashAlt 
                      className="text-danger" 
                      style={{ cursor: 'pointer', opacity: 0.7, transition: '0.2s' }} 
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                      onClick={() => handleRemove(sym)}
                      title="Remove Symbol"
                    />
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <button 
              type="button"
              className="btn btn-sm btn-outline-secondary border-0"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <FaChevronLeft className="me-1" /> Prev
            </button>
            <span className="text-muted small fw-bold">
              {currentPage} <span className="fw-normal mx-1">/</span> {totalPages}
            </span>
            <button 
              type="button"
              className="btn btn-sm btn-outline-secondary border-0"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next <FaChevronRight className="ms-1" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SymbolForm;