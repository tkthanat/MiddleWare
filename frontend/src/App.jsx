import React, { useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ConfigPage from './pages/ConfigPage';
import LogsPage from './pages/LogsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider } from './context/AuthProvider';
import { AuthContext } from './context/AuthContext';
import { FaCog, FaList, FaUserCircle, FaSignOutAlt, FaTimes, FaChevronRight } from 'react-icons/fa';
import './App.css';
import Settings from './pages/Settings';

// --- Navigation Bar ---
function Navigation() {
  const location = useLocation();
  if (location.pathname === '/login' || location.pathname === '/register') return null;

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
  );
}

// --- Floating Profile Menu ---
const FloatingProfile = () => {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const shouldHide = location.pathname === '/login' || !user;
    if (shouldHide) return null;

    return (
        <div ref={menuRef}>
            {/* Popup Menu */}
            {isOpen && (
                <div className="profile-menu-popup">
                    
                    {/* Header Profile */}
                    <div className="menu-item" style={{cursor: 'default', transform: 'none'}}>
                        <div className="menu-icon-box">
                             <FaUserCircle size={24} />
                        </div>
                        <div className="flex-grow">
                            <div style={{fontWeight: '700', fontSize: '15px'}}>{user?.full_name || user?.username}</div>
                            <div className="text-muted small" style={{fontSize: '12px'}}>Admin Access</div>
                        </div>
                    </div>

                    <div className="menu-divider"></div>

                    {/* Menu Items */}
                    <div className="menu-item">
                        <div className="menu-icon-box">
                            <FaCog size={16} />
                        </div>
                        <Link to="/settings" className="flex-grow ms-2 fw-medium text-decoration-none text-dark">
                          <span className="flex-grow ms-2 fw-medium">Settings & Privacy</span>
                          <FaChevronRight size={12} style={{color: '#9ca3af'}} />
                        </Link>
                    </div>

                    <div className="menu-item" onClick={logout}>
                        <div className="menu-icon-box" style={{backgroundColor: '#fef2f2', color: '#ef4444'}}> {/* ปุ่ม Logout สีแดงอ่อน */}
                            <FaSignOutAlt size={16} />
                        </div>
                        <span className="flex-grow ms-2 fw-medium text-danger">Logout</span>
                        <FaChevronRight size={12} style={{color: '#9ca3af'}} />
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button 
                className="floating-btn" 
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <FaTimes /> : <FaUserCircle />}
            </button>
        </div>
    );
};

// --- Private Route ---
const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" replace />
};

// --- Main App ---
function App() {
  return (
    <AuthProvider>
      <div className="bg-dashboard min-vh-100 font-inter">
        <BrowserRouter>
          <Navigation />
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/" element={<PrivateRoute><ConfigPage /></PrivateRoute>} />
            <Route path="/logs" element={<PrivateRoute><LogsPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          </Routes>

          <FloatingProfile />

        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;