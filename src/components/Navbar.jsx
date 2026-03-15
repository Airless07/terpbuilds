const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'post-project', label: 'Post a Project' },
  { id: 'friends', label: 'Friends' },
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'My Profile' },
  { id: 'feedback', label: 'Feedback' },
];

export default function Navbar({
  currentPage, navigate, currentUser, logout,
  darkMode, setDarkMode,
  showNotifications, setShowNotifications,
  notifications, unreadMsgs,
}) {
  const unreadNotif = (notifications || []).filter(n => !n.read).length;
  const initials = currentUser
    ? currentUser.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('home')}>
        🐢 Terp<span>Builds</span>
      </div>

      <div className="navbar-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${currentPage === tab.id ? 'active' : ''}`}
            onClick={() => navigate(tab.id)}
          >
            {tab.label}
            {tab.id === 'messages' && unreadMsgs > 0 && (
              <span style={{ marginLeft: 4, background: '#E53E3E', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                {unreadMsgs}
              </span>
            )}
          </button>
        ))}
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
            <div className="user-display" onClick={() => navigate('profile')} style={{ cursor: 'pointer' }}>
              <div className="user-avatar">{initials}</div>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName}
              </span>
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
