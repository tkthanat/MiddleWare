import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import ConfigPage from './components/ConfigPage'
import LogsPage from './components/LogsPage'
import { FaCog, FaList } from 'react-icons/fa'

function Navigation() {
  const location = useLocation()
  return (
    <nav 
      className="navbar navbar-expand navbar-light bg-white shadow-sm py-3 mb-4"
      style={{ position: 'sticky', top: 0, zIndex: 1000 }} 
    >
      <div className="container justify-content-center">
        <div className="btn-group shadow-sm">
          <Link to="/" className={`btn btn-lg px-4 ${location.pathname === '/' ? 'btn-primary' : 'btn-outline-primary'}`}>
            <FaCog className="me-2"/> Settings
          </Link>
          <Link to="/logs" className={`btn btn-lg px-4 ${location.pathname === '/logs' ? 'btn-primary' : 'btn-outline-primary'}`}>
            <FaList className="me-2"/> Logs
          </Link>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="min-vh-100 w-100 bg-light text-dark">
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