import { useState, useEffect } from 'react';
import { getNotifications } from '../utils/storage';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'projects', label: 'Projects', icon: '🔭' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function MobileNav({ currentPage, navigate, currentUser }) {
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    const calc = () => {
      if (!currentUser) { setUnreadMsgs(0); return; }
      const dms = JSON.parse(localStorage.getItem('tb_dms') || '{}');
      let count = 0;
      Object.keys(dms).forEach(key => {
        if (key.includes(currentUser.id)) {
          const msgs = dms[key].messages || [];
          count += msgs.filter(m => !m.read && m.senderId !== currentUser.id).length;
        }
      });
      setUnreadMsgs(count);
    };
    calc();
    const interval = setInterval(calc, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

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
                <span style={{ position: 'absolute', top: -4, right: -6, background: '#E53E3E', color: '#fff', borderRadius: '10px', padding: '0 4px', fontSize: '0.6rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>
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
