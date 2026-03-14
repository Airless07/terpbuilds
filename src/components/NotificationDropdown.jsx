import { useState, useEffect } from 'react';
import { getNotifications, saveNotifications, timeAgo } from '../utils/storage';

const ICONS = {
  application: '📩',
  accepted: '✅',
  denied: '❌',
  friendRequest: '🤝',
  followed: '👀',
  rated: '⭐',
  message: '💬',
  projectUpdate: '📢',
};

export default function NotificationDropdown({ currentUser, navigate, onClose, refreshData }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (currentUser) {
      setNotifs(getNotifications(currentUser.id));
    }
  }, [currentUser]);

  const markRead = (id) => {
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifs(updated);
    saveNotifications(currentUser.id, updated);
  };

  const markAllRead = () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated);
    saveNotifications(currentUser.id, updated);
  };

  const handleClick = (notif) => {
    markRead(notif.id);
    if (notif.page) navigate(notif.page);
    onClose();
  };

  if (!currentUser) return null;

  return (
    <div className="notif-dropdown">
      <div className="notif-header">
        <span>Notifications</span>
        {notifs.some(n => !n.read) && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: '0.78rem' }}>
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <div className="empty-icon">🔔</div>
          <p>No notifications yet</p>
        </div>
      ) : (
        notifs.slice(0, 30).map(n => (
          <div
            key={n.id}
            className={`notif-item ${!n.read ? 'unread' : ''}`}
            onClick={() => handleClick(n)}
          >
            <span className="notif-icon">{ICONS[n.type] || '📌'}</span>
            <div>
              <div className="notif-text">{n.text}</div>
              <div className="notif-time">{timeAgo(n.timestamp)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
