import { useEffect, useRef } from 'react';
import { updateUser, addNotification } from '../utils/storage';

export default function UserPopover({ user, anchorPos, onClose, currentUser, setCurrentUser, navigate }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || !currentUser || currentUser.id === user.id) return null;

  const style = {
    top: Math.min(anchorPos.y, window.innerHeight - 320),
    left: Math.min(anchorPos.x, window.innerWidth - 300),
  };

  const isFriend = currentUser.friends?.includes(user.id);
  const isFollowing = currentUser.following?.includes(user.id);
  const sentRequest = currentUser.friendRequests?.sent?.includes(user.id);

  const follow = async () => {
    if (currentUser.following?.includes(user.id)) return;
    const me = { ...currentUser, following: [...(currentUser.following || []), user.id] };
    const them = { ...user, followers: [...(user.followers || []), currentUser.id] };
    setCurrentUser(me);
    await updateUser(me.id, me);
    await updateUser(them.id, them);
    await addNotification(user.id, { type: 'followed', text: `${currentUser.displayName} started following you.`, page: 'friends' });
  };

  const unfollow = async () => {
    const me = { ...currentUser, following: (currentUser.following || []).filter(id => id !== user.id) };
    const them = { ...user, followers: (user.followers || []).filter(id => id !== currentUser.id) };
    setCurrentUser(me);
    await updateUser(me.id, me);
    await updateUser(them.id, them);
  };

  const sendFriendRequest = async () => {
    if (currentUser.friendRequests?.sent?.includes(user.id)) return;
    const me = {
      ...currentUser,
      friendRequests: { ...currentUser.friendRequests, sent: [...(currentUser.friendRequests?.sent || []), user.id] }
    };
    const them = {
      ...user,
      friendRequests: { ...user.friendRequests, received: [...(user.friendRequests?.received || []), currentUser.id] }
    };
    setCurrentUser(me);
    await updateUser(me.id, me);
    await updateUser(them.id, them);
    await addNotification(user.id, { type: 'friendRequest', text: `${currentUser.displayName} sent you a friend request.`, page: 'friends' });
  };

  const sendMessage = () => {
    navigate('messages');
    localStorage.setItem('tb_open_dm', user.id);
    onClose();
  };

  return (
    <div className="user-popover" ref={ref} style={style}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div className="user-avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
          {user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>{user.displayName}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{user.email}</div>
          {user.trustScore > 0 && (
            <span className="trust-score">⭐ {user.trustScore.toFixed(1)}</span>
          )}
        </div>
      </div>

      {user.skills?.length > 0 && (
        <div className="tags" style={{ marginBottom: '0.75rem' }}>
          {user.skills.slice(0, 5).map(s => <span key={s} className="tag">{s}</span>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {user.github && <a href={user.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">GitHub</a>}
        {user.linkedin && <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">LinkedIn</a>}
        {user.website && <a href={user.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Website</a>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!isFriend && !sentRequest && (
          <button className="btn btn-outline btn-sm" onClick={sendFriendRequest}>+ Friend</button>
        )}
        {sentRequest && !isFriend && (
          <button className="btn btn-ghost btn-sm" disabled>Request Sent</button>
        )}
        {isFollowing ? (
          <button className="btn btn-ghost btn-sm" onClick={unfollow}>Unfollow</button>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={follow}>Follow</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={sendMessage}>Message</button>
      </div>
    </div>
  );
}
