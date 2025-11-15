import React, { useState, useEffect } from 'react'; // ✨ [เพิ่ม] useState และ useEffect
import { Home, History, Upload } from 'lucide-react'; 
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  
  // ✨ [เพิ่ม] State สำหรับติดตามการแสดงผลและตำแหน่ง Scroll
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);


  const handleLogout = () => {
    localStorage.removeItem("userId");
    navigate("/login");
  };

  // ✨ [เพิ่ม] Logic สำหรับควบคุมการแสดง/ซ่อน Navbar เมื่อ Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // ซ่อน Navbar เมื่อเลื่อนลง และแสดงเมื่อเลื่อนขึ้น
      if (currentScrollY > lastScrollY && currentScrollY > 100) { // ซ่อนเมื่อเลื่อนลงเกิน 100px
        setIsNavbarVisible(false);
      } else {
        setIsNavbarVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup function เพื่อลบ event listener เมื่อ component ถูก unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);


  return (
    // ✨ [แก้ไข] เพิ่มเงื่อนไขในการใส่ Class 'navbar-hidden'
    <header className={`navbar-header ${isNavbarVisible ? '' : 'navbar-hidden'}`}>
      {showConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Are you sure?</h3>
            <p>You will be signed out of your account.</p>

            <div className="logout-modal-buttons">
              <button
                className="logout-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="logout-confirm"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="navbar-container">
        {/* === ส่วนซ้าย: โลโก้ === */}
        <Link to="/home" className="navbar-brand">
          <span>note2brain</span>
        </Link>

        {/* === ส่วนกลาง: เมนูหลัก === */}
        <div className="navbar-center-menu">
          <NavLink to="/home" className="navbar-item">
            <span className="nav-icon"><Home size={20} strokeWidth={2.5} /></span>
            <span className="nav-text">Home</span>
          </NavLink>
          <NavLink to="/quiz-history" className="navbar-item">
            <span className="nav-icon"><History size={20} strokeWidth={2.5} /></span>
            <span className="nav-text">History</span>
          </NavLink>
          <NavLink to="/upload" className="navbar-item">
            <span className="nav-icon"><Upload size={20} strokeWidth={2.5} /></span>
            <span className="nav-text">Upload</span>
          </NavLink>
        </div>

        {/* === ส่วนขวา: ปุ่ม Logout === */}
        <div className="navbar-right-actions">
          <button 
            className="navbar-logout-btn" 
            onClick={() => setShowConfirm(true)}
          >
            Sign out
        </button>

        </div>
      </nav>
    </header>
  );
}