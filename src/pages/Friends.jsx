import { useState } from 'react';
import { updateUser, addNotification, dmKey } from '../utils/storage';

function UserCard({ user, currentUser, onAction, navigate }) {
  if (!user || user.id === currentUser?.id) return null;
  const cu = currentUser;
  const isFriend = cu?.friends?.includes(user.id);
  const isFollowing = cu?.following?.includes(user.id);
  const sentReq = cu?.friendRequests?.sent?.includes(user.id);
  const receivedReq = cu?.friendRequests?.received?.includes(user.id);

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
        {isFollowing ? (
          <button className="btn btn-ghost btn-sm" onClick={() => onAction('unfollow', user)}>Unfollow</button>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => onAction('follow', user)}>Follow</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => { navigate('messages'); localStorage.setItem('tb_open_dm', user.id); }}>
          Message
        </button>
      </div>
    </div>
  );
}

export default function Friends({ currentUser, setCurrentUser, navigate, users }) {
  const [tab, setTab] = useState('friends');
  const [search, setSearch] = useState('');

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

  const cu = users.find(u => u.id === currentUser.id) || currentUser;
  const friends = users.filter(u => cu.friends?.includes(u.id));
  const following = users.filter(u => cu.following?.includes(u.id));
  const pendingRequests = users.filter(u => cu.friendRequests?.received?.includes(u.id));

  const doAction = async (action, targetUser) => {
    const me = { ...cu };
    const them = users.find(u => u.id === targetUser.id);
    if (!them) return;
    const themCopy = { ...them };

    switch (action) {
      case 'addFriend':
        if (!me.friendRequests?.sent?.includes(them.id)) {
          me.friendRequests = { ...me.friendRequests, sent: [...(me.friendRequests?.sent || []), them.id] };
          themCopy.friendRequests = { ...themCopy.friendRequests, received: [...(themCopy.friendRequests?.received || []), me.id] };
          await addNotification(them.id, { type: 'friendRequest', text: `${me.displayName} sent you a friend request.`, page: 'friends' });
        }
        break;
      case 'acceptFriend':
        me.friends = [...(me.friends || []), them.id];
        themCopy.friends = [...(themCopy.friends || []), me.id];
        me.friendRequests = { ...me.friendRequests, received: (me.friendRequests?.received || []).filter(id => id !== them.id) };
        themCopy.friendRequests = { ...themCopy.friendRequests, sent: (themCopy.friendRequests?.sent || []).filter(id => id !== me.id) };
        await addNotification(them.id, { type: 'friendRequest', text: `${me.displayName} accepted your friend request!`, page: 'friends' });
        break;
      case 'denyFriend':
        me.friendRequests = { ...me.friendRequests, received: (me.friendRequests?.received || []).filter(id => id !== them.id) };
        themCopy.friendRequests = { ...themCopy.friendRequests, sent: (themCopy.friendRequests?.sent || []).filter(id => id !== me.id) };
        break;
      case 'removeFriend':
        me.friends = (me.friends || []).filter(id => id !== them.id);
        themCopy.friends = (themCopy.friends || []).filter(id => id !== me.id);
        break;
      case 'follow':
        if (!me.following?.includes(them.id)) {
          me.following = [...(me.following || []), them.id];
          themCopy.followers = [...(themCopy.followers || []), me.id];
          await addNotification(them.id, { type: 'followed', text: `${me.displayName} started following you.`, page: 'friends' });
        }
        break;
      case 'unfollow':
        me.following = (me.following || []).filter(id => id !== them.id);
        themCopy.followers = (themCopy.followers || []).filter(id => id !== me.id);
        break;
      default:
        break;
    }

    setCurrentUser(me);
    await updateUser(me.id, me);
    await updateUser(themCopy.id, themCopy);
  };

  const discoverSearch = search.toLowerCase();
  const discover = users.filter(u =>
    u.id !== cu.id &&
    !cu.friends?.includes(u.id) &&
    (discoverSearch === '' ||
      u.displayName.toLowerCase().includes(discoverSearch) ||
      u.skills?.some(s => s.toLowerCase().includes(discoverSearch)))
  );

  const TABS = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'following', label: `Following (${following.length})` },
    { id: 'requests', label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
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
            friends.map(u => <UserCard key={u.id} user={u} currentUser={cu} onAction={doAction} navigate={navigate} />)
          )}
        </div>
      )}

      {tab === 'following' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {following.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👀</div>
              <p>Not following anyone yet.</p>
            </div>
          ) : (
            following.map(u => <UserCard key={u.id} user={u} currentUser={cu} onAction={doAction} navigate={navigate} />)
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤝</div>
              <p>No pending friend requests.</p>
            </div>
          ) : (
            pendingRequests.map(u => <UserCard key={u.id} user={u} currentUser={cu} onAction={doAction} navigate={navigate} />)
          )}
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
              discover.map(u => <UserCard key={u.id} user={u} currentUser={cu} onAction={doAction} navigate={navigate} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
