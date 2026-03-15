import { useState, useRef, useEffect } from 'react';

export default function Navbar({
  currentPage, navigate, currentUser, logout,
  darkMode, setDarkMode,
  showNotifications, setShowNotifications,
  notifications, unreadMsgs,
}) {
  const [socialOpen, setSocialOpen] = useState(false);
  const socialRef = useRef();

  const unreadNotif = (notifications || []).filter(n => !n.read).length;
  const initials = currentUser
    ? currentUser.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  // Close social dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (socialRef.current && !socialRef.current.contains(e.target)) setSocialOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const socialActive = currentPage === 'friends' || currentPage === 'messages';

  return (
    <nav className="navbar">
      {/* Logo → home */}
      <div className="navbar-brand" onClick={() => navigate('home')}>
        🐢 Terp<span>Builds</span>
      </div>

      <div className="navbar-tabs">
        <button
          className={`nav-tab ${currentPage === 'projects' ? 'active' : ''}`}
          onClick={() => navigate('projects')}
        >
          Projects
        </button>

        {/* Social dropdown */}
        <div
          ref={socialRef}
          className="nav-social-wrap"
          onMouseEnter={() => setSocialOpen(true)}
          onMouseLeave={() => setSocialOpen(false)}
        >
          <button
            className={`nav-tab ${socialActive ? 'active' : ''}`}
            onClick={() => setSocialOpen(o => !o)}
          >
            Social <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▾</span>
          </button>
          {socialOpen && (
            <div className="nav-social-dropdown">
              <button
                className={`nav-dropdown-item ${currentPage === 'friends' ? 'active' : ''}`}
                onClick={() => { navigate('friends'); setSocialOpen(false); }}
              >
                👥 Friends
              </button>
              <button
                className={`nav-dropdown-item ${currentPage === 'messages' ? 'active' : ''}`}
                onClick={() => { navigate('messages'); setSocialOpen(false); }}
              >
                💬 Messages
                {unreadMsgs > 0 && (
                  <span style={{ marginLeft: 6, background: '#E53E3E', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                    {unreadMsgs}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <button
          className={`nav-tab ${currentPage === 'feedback' ? 'active' : ''}`}
          onClick={() => navigate('feedback')}
        >
          Feedback
        </button>
      </div>

      <div className="navbar-right">
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>

        <button
          className="notif-btn"
          onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
        >
          🔔
          {unreadNotif > 0 && <span className="badge">{unreadNotif > 9 ? '9+' : unreadNotif}</span>}
        </button>

        {currentUser ? (
          <>
            <div
              className="user-display"
              onClick={() => navigate('profile')}
              style={{ cursor: 'pointer' }}
              title="My Profile"
            >
              <div className={`user-avatar${currentPage === 'profile' ? ' avatar-active' : ''}`}>
                {initials}
              </div>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text3)', marginLeft: '-0.2rem' }}>▾</span>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('login')}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
