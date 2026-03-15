const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'projects', label: 'Projects', icon: '🔭' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function MobileNav({ currentPage, navigate, unreadMsgs }) {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`mobile-tab ${currentPage === tab.id ? 'active' : ''}`}
            onClick={() => navigate(tab.id)}
          >
            <span className="tab-icon" style={{ position: 'relative' }}>
              {tab.icon}
              {tab.id === 'messages' && unreadMsgs > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -6, background: '#E53E3E', color: '#fff', borderRadius: 10, padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>
                  {unreadMsgs}
                </span>
              )}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
