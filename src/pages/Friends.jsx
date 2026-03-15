import { useState, useEffect } from 'react';
import {
  addNotification,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriendship, subscribeToFriendships,
} from '../utils/storage';

function UserCard({ user, currentUser, friendships, onAction, navigate }) {
  if (!user || user.id === currentUser?.id) return null;

  const myFriendship = friendships.find(f =>
    (f.user_id === currentUser.id && f.friend_id === user.id) ||
    (f.user_id === user.id && f.friend_id === currentUser.id)
  );
  const isFriend = myFriendship?.status === 'accepted';
  const sentReq = myFriendship?.status === 'pending' && myFriendship?.user_id === currentUser.id;
  const receivedReq = myFriendship?.status === 'pending' && myFriendship?.friend_id === currentUser.id;

  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div className="user-avatar" style={{ width: 44, height: 44, fontSize: '1rem', flexShrink: 0 }}>
        {user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>{user.displayName}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: '0.4rem' }}>{user.email}</div>
        {user.trustScore > 0 && <span className="trust-score">⭐ {user.trustScore.toFixed(1)}</span>}
        <div className="tags" style={{ margin: '0.4rem 0' }}>
          {user.skills?.slice(0, 4).map(s => <span key={s} className="tag">{s}</span>)}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {user.github && <a href={user.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>GitHub</a>}
          {user.linkedin && <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>LinkedIn</a>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
        {isFriend ? (
          <button className="btn btn-danger btn-sm" onClick={() => onAction('removeFriend', user)}>Remove</button>
        ) : receivedReq ? (
          <>
            <button className="btn btn-success btn-sm" onClick={() => onAction('acceptFriend', user)}>Accept</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onAction('denyFriend', user)}>Deny</button>
          </>
        ) : sentReq ? (
          <button className="btn btn-ghost btn-sm" disabled>Requested</button>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => onAction('addFriend', user)}>+ Friend</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => { navigate('messages'); localStorage.setItem('tb_open_dm', user.id); }}>
          Message
        </button>
      </div>
    </div>
  );
}

export default function Friends({ currentUser, navigate, users }) {
  const [tab, setTab] = useState('friends');
  const [search, setSearch] = useState('');
  const [friendships, setFriendships] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    return subscribeToFriendships(currentUser.id, setFriendships);
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Sign in to connect with other Terps.</p>
          <button className="btn btn-primary" onClick={() => navigate('login')}>Sign In</button>
        </div>
      </div>
    );
  }

  const accepted = friendships.filter(f => f.status === 'accepted');
  const friendIds = accepted.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
  const friends = users.filter(u => friendIds.includes(u.id));

  const incoming = friendships.filter(f => f.friend_id === currentUser.id && f.status === 'pending');
  const outgoing = friendships.filter(f => f.user_id === currentUser.id && f.status === 'pending');
  const incomingUsers = incoming.map(f => users.find(u => u.id === f.user_id)).filter(Boolean);
  const outgoingUsers = outgoing.map(f => users.find(u => u.id === f.friend_id)).filter(Boolean);

  const doAction = async (action, targetUser) => {
    switch (action) {
      case 'addFriend':
        await sendFriendRequest(currentUser.id, targetUser.id);
        await addNotification(targetUser.id, { type: 'friendRequest', text: `${currentUser.displayName} sent you a friend request.`, page: 'friends' });
        break;
      case 'acceptFriend':
        await acceptFriendRequest(targetUser.id, currentUser.id);
        await addNotification(targetUser.id, { type: 'accepted', text: `${currentUser.displayName} accepted your friend request!`, page: 'friends' });
        break;
      case 'denyFriend':
        await declineFriendRequest(targetUser.id, currentUser.id);
        break;
      case 'removeFriend':
        await removeFriendship(currentUser.id, targetUser.id);
        break;
      default:
        break;
    }
  };

  const discoverSearch = search.toLowerCase();
  const discover = users.filter(u =>
    u.id !== currentUser.id &&
    !friendIds.includes(u.id) &&
    (discoverSearch === '' ||
      u.displayName.toLowerCase().includes(discoverSearch) ||
      u.skills?.some(s => s.toLowerCase().includes(discoverSearch)))
  );

  const TABS = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'requests', label: `Requests${incoming.length > 0 ? ` (${incoming.length})` : ''}` },
    { id: 'discover', label: 'Find People' },
  ];

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <h1 className="section-title" style={{ marginBottom: '1.5rem' }}>👥 <span>Connect</span> with Terps</h1>

      <div className="room-tabs" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} className={`room-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👋</div>
              <p>No friends yet. Discover people in the Find People tab!</p>
            </div>
          ) : (
            friends.map(u => <UserCard key={u.id} user={u} currentUser={currentUser} friendships={friendships} onAction={doAction} navigate={navigate} />)
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
              INCOMING ({incomingUsers.length})
            </div>
            {incomingUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-icon">🤝</div>
                <p>No incoming friend requests.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {incomingUsers.map(u => (
                  <UserCard key={u.id} user={u} currentUser={currentUser} friendships={friendships} onAction={doAction} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
              OUTGOING ({outgoingUsers.length})
            </div>
            {outgoingUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>No outgoing requests.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {outgoingUsers.map(u => (
                  <UserCard key={u.id} user={u} currentUser={currentUser} friendships={friendships} onAction={doAction} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'discover' && (
        <div>
          <div className="search-wrap" style={{ marginBottom: '1rem' }}>
            <span className="search-icon">🔍</span>
            <input className="input search-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or skills..." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {discover.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No users found matching your search.</p>
              </div>
            ) : (
              discover.map(u => <UserCard key={u.id} user={u} currentUser={currentUser} friendships={friendships} onAction={doAction} navigate={navigate} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
