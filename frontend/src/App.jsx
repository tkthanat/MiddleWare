import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import ConfigPage from './pages/ConfigPage'
import LogsPage from './pages/LogsPage'
import { FaCog, FaList } from 'react-icons/fa'
import './App.css'

function Navigation() {
  const location = useLocation()
  
  return (
    <div className="d-flex justify-content-center pt-4 pb-3">
      <div className="nav-pill-float bg-white shadow-sm rounded-pill p-1 d-flex align-items-center">
        <Link 
          to="/" 
          className={`nav-item px-4 py-2 rounded-pill d-flex align-items-center fw-bold text-decoration-none ${location.pathname === '/' ? 'active' : 'text-muted'}`}
        >
          <FaCog className="me-2"/> Config
        </Link>
        
        <div className="vr my-2 mx-1 text-muted opacity-25"></div>

        <Link 
          to="/logs" 
          className={`nav-item px-4 py-2 rounded-pill d-flex align-items-center fw-bold text-decoration-none ${location.pathname === '/logs' ? 'active' : 'text-muted'}`}
        >
          <FaList className="me-2"/> Logs
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="bg-dashboard min-vh-100 font-inter">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<ConfigPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App