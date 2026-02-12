import { useState } from 'react';
import { FaList, FaPlus, FaTimes } from 'react-icons/fa';

const SymbolForm = ({ data, onChange }) => {
  const [newSymbol, setNewSymbol] = useState('');

  const currentSymbolsString = data?.active_symbols || "";
  
  const symbolList = currentSymbolsString
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    
    const formattedSymbol = newSymbol.toUpperCase().trim();
    
    if (!symbolList.includes(formattedSymbol)) {
      const updatedList = [...symbolList, formattedSymbol];
      const updatedString = updatedList.join(', ');
      
      onChange({ target: { name: 'active_symbols', value: updatedString } });
    }
    setNewSymbol('');
  };

  const handleRemove = (symbolToRemove) => {
    const updatedList = symbolList.filter(sym => sym !== symbolToRemove);
    const updatedString = updatedList.join(', ');
    onChange({ target: { name: 'active_symbols', value: updatedString } });
  };

  return (
    <div className="card dashboard-card border-0">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaList className="me-2 text-muted"/> Whitelist Symbols</h6>
        </div>
        <p className="text-muted small mb-3">
          กำหนดรายชื่อหุ้น (SET) หรือสัญญา (TFEX) ที่อนุญาตให้บอททำการเทรดได้ (หากเว้นว่างไว้ บอทจะรับคำสั่งทุกตัว)
        </p>
        
        <div className="d-flex gap-2 mb-3">
          <input 
            type="text" 
            className="form-control form-control-modern bg-light" 
            placeholder="e.g. PTT, AOT, S50Z24" 
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd(e)}
          />
          <button type="button" className="btn btn-primary px-4 fw-bold" onClick={handleAdd}>
            <FaPlus className="me-1" /> Add
          </button>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3 p-3 bg-light rounded border">
          {symbolList.length === 0 ? (
            <span className="text-muted small fst-italic">No symbols added yet.</span>
          ) : (
            symbolList.map((sym, index) => (
              <span key={index} className="badge bg-white text-dark border p-2 d-flex align-items-center gap-2 shadow-sm" style={{ fontSize: '0.85rem' }}>
                {sym}
                <FaTimes 
                  className="text-danger" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => handleRemove(sym)}
                />
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SymbolForm;