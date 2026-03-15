import { useState, useEffect, useRef } from 'react';
import { dmKey, generateId, timeAgo, sendDM, markDMsRead } from '../utils/storage';

function NewMessageModal({ onClose, onOpen, currentUserId, users }) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const target = users.find(u => u.id === userId.trim() && u.id !== currentUserId);
    if (!target) { setError('No user found with that ID.'); return; }
    onOpen(target);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💬 New Message</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1.25rem' }}>
          Paste a user's ID to start a conversation. You can find your own ID on your Profile page.
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Enter User ID</label>
            <input
              className="input"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Paste user ID here"
              autoFocus
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button className="btn btn-primary" type="submit">Open Conversation</button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Messages({ currentUser, navigate, dms, users }) {
  const [activeConvoKey, setActiveConvoKey] = useState(null);
  const [input, setInput] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    if (!currentUser) { navigate('login'); return; }
    const openId = localStorage.getItem('tb_open_dm');
    if (openId) {
      localStorage.removeItem('tb_open_dm');
      const key = dmKey(currentUser.id, openId);
      setActiveConvoKey(key);
    }
  }, [currentUser]);

  const activeConvo = dms.find(d => d.id === activeConvoKey);
  const messages = activeConvo?.messages || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const conversations = dms
    .filter(d => d.participants?.includes(currentUser?.id))
    .map(d => {
      const otherId = d.participants?.find(id => id !== currentUser.id);
      const other = users.find(u => u.id === otherId);
      if (!other) return null;
      const msgs = d.messages || [];
      const unread = msgs.filter(m => !m.read && m.senderId !== currentUser.id).length;
      return { key: d.id, other, lastMsg: msgs[msgs.length - 1], unread };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMsg?.timestamp || 0) - new Date(a.lastMsg?.timestamp || 0));

  const openConversation = async (otherUser) => {
    const key = dmKey(currentUser.id, otherUser.id);
    setActiveConvoKey(key);
    const convo = dms.find(d => d.id === key);
    if (convo && convo.messages?.some(m => !m.read && m.senderId !== currentUser.id)) {
      await markDMsRead(key, currentUser.id, convo.messages || []);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvoKey) return;
    const otherId = activeConvoKey.split('::').find(id => id !== currentUser.id);
    const participants = activeConvo?.participants || [currentUser.id, otherId];
    const msg = {
      id: generateId(), senderId: currentUser.id, senderName: currentUser.displayName,
      text: input.trim(), timestamp: new Date().toISOString(), read: false
    };
    setInput('');
    await sendDM(activeConvoKey, participants, msg);
  };

  const activeOther = activeConvo
    ? users.find(u => u.id === activeConvo.participants?.find(id => id !== currentUser.id))
    : null;

  if (!currentUser) return null;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="section-title">💬 <span>Messages</span></h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)}>+ New Message</button>
      </div>

      <div className="messages-layout">
        {/* Conversation list */}
        <div className="convo-list">
          {conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-icon">💬</div>
              <p>No conversations yet. Click "+ New Message" to start one.</p>
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c.key}
                className={`convo-item ${activeConvoKey === c.key ? 'active' : ''}`}
                onClick={() => openConversation(c.other)}
              >
                <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                  {c.other.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="convo-name">{c.other.displayName}</span>
                    {c.unread > 0 && <span className="badge" style={{ position: 'static' }}>{c.unread}</span>}
                  </div>
                  <div className="convo-preview">{c.lastMsg?.text || 'No messages yet'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat panel */}
        <div className="chat-panel">
          {!activeConvoKey ? (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-icon">💬</div>
              <p>Select a conversation or start a new one.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {activeOther && (
                  <>
                    <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                      {activeOther.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activeOther.displayName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{activeOther.email}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="chat-messages">
                {messages.length === 0 && (
                  <div className="empty-state" style={{ flex: 1 }}><p>Start the conversation!</p></div>
                )}
                {messages.map(m => {
                  const mine = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={`chat-msg ${mine ? 'mine' : ''}`}>
                      {!mine && (
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                          {m.senderName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        {!mine && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.15rem' }}>{m.senderName}</div>}
                        <div className="chat-bubble">{m.text}</div>
                        <div className="chat-msg-meta">{timeAgo(m.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="chat-input-row">
                <input
                  className="input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={activeOther ? `Message ${activeOther.displayName}...` : 'Send a message...'}
                />
                <button className="btn btn-primary btn-sm" onClick={sendMessage}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewMessageModal
          currentUserId={currentUser.id}
          users={users}
          onClose={() => setShowNewModal(false)}
          onOpen={(user) => openConversation(user)}
        />
      )}
    </div>
  );
}
