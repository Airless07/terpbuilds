const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'projects', label: 'Projects', icon: '🔭' },
  { id: 'social', label: 'Social', icon: '👥', target: 'friends', pages: ['friends', 'messages'] },
  { id: 'feedback', label: 'Feedback', icon: '✉️' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function MobileNav({ currentPage, navigate, unreadMsgs }) {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {TABS.map(tab => {
          const isActive = tab.pages
            ? tab.pages.includes(currentPage)
            : currentPage === tab.id;
          const destination = tab.target || tab.id;
          const showUnread = tab.pages?.includes('messages') && unreadMsgs > 0;

          return (
            <button
              key={tab.id}
              className={`mobile-tab ${isActive ? 'active' : ''}`}
              onClick={() => navigate(destination)}
            >
              <span className="tab-icon" style={{ position: 'relative' }}>
                {tab.icon}
                {showUnread && (
                  <span style={{ position: 'absolute', top: -4, right: -6, background: '#E53E3E', color: '#fff', borderRadius: 10, padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>
                    {unreadMsgs}
                  </span>
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
