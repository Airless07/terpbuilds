import { markNotifRead, markAllNotifsRead, timeAgo } from '../utils/storage';

const ICONS = {
  application: '📩', accepted: '✅', denied: '❌',
  friend_request: '🤝', friend_accepted: '🤝', friendRequest: '🤝',
  message: '💬', rated: '⭐', projectUpdate: '📢',
};

export default function NotificationDropdown({ currentUser, navigate, onClose, notifications }) {
  if (!currentUser) return null;

  const items = notifications || [];
  const displayed = [...items].reverse().slice(0, 30);

  const handleClick = async (notif) => {
    if (!notif.read) await markNotifRead(currentUser.id, notif.id, items);
    if (notif.page) navigate(notif.page);
    onClose();
  };

  const handleMarkAll = async () => {
    await markAllNotifsRead(currentUser.id, items);
  };

  return (
    <div className="notif-dropdown">
      <div className="notif-header">
        <span>Notifications</span>
        {items.some(n => !n.read) && (
          <button className="btn btn-ghost btn-sm" onClick={handleMarkAll} style={{ fontSize: '0.78rem' }}>
            Mark all read
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <div className="empty-icon">🔔</div>
          <p>No notifications yet</p>
        </div>
      ) : (
        displayed.map(n => (
          <div
            key={n.id}
            className={`notif-item ${!n.read ? 'unread' : ''}`}
            onClick={() => handleClick(n)}
          >
            <span className="notif-icon">{ICONS[n.type] || '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="notif-text">{n.message || n.text}</div>
              <div className="notif-time">{timeAgo(n.timestamp)}</div>
            </div>
            {!n.read && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E53E3E', flexShrink: 0, alignSelf: 'center', marginLeft: 6 }} />
            )}
          </div>
        ))
      )}
    </div>
  );
}
