import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../firebase';
import { dmKey, timeAgo, sendDM, markDMsRead, fetchUser, addNotification, editMessage, deleteMessage } from '../utils/storage';

function NewMessageModal({ onClose, onOpen, currentUserId }) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = userId.trim();
    if (!trimmed || trimmed === currentUserId) { setError('Please enter a valid user ID.'); return; }
    setLoading(true);
    try {
      const user = await fetchUser(trimmed);
      if (!user) { setError('No user found with that ID.'); return; }
      onOpen(user);
      onClose();
    } catch {
      setError('No user found with that ID.');
    } finally {
      setLoading(false);
    }
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
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Looking up...' : 'Open Conversation'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Messages({ currentUser, navigate, dms, users }) {
  const [activeConvoKey, setActiveConvoKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredConvoKey, setHoveredConvoKey] = useState(null);
  // clearedConvos: { [conversationKey]: ISO timestamp of when it was cleared }
  // Conversation reappears if a new message arrives AFTER the cleared timestamp
  const [clearedConvos, setClearedConvos] = useState(() => {
    try {
      const uid = localStorage.getItem('tb_uid');
      return JSON.parse(localStorage.getItem(`tb_cleared_${uid}`) || '{}');
    } catch { return {}; }
  });
  const endRef = useRef();

  // Open DM from external navigation (Friends page "Message" button)
  useEffect(() => {
    if (!currentUser) { navigate('login'); return; }
    const openId = localStorage.getItem('tb_open_dm');
    if (openId) {
      localStorage.removeItem('tb_open_dm');
      setActiveConvoKey(dmKey(currentUser.id, openId));
    }
  }, [currentUser]);

  // Realtime subscription for active conversation — INSERT + UPDATE for edits/deletes
  useEffect(() => {
    if (!activeConvoKey) { setMessages([]); return; }

    supabase.from('messages').select('*')
      .eq('conversation_key', activeConvoKey)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));

    const channel = supabase.channel(`convo-${activeConvoKey}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_key=eq.${activeConvoKey}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_key=eq.${activeConvoKey}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConvoKey]);

  // Auto-scroll and mark as read
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (activeConvoKey && messages.some(m => !m.read && m.sender_id !== currentUser?.id)) {
      markDMsRead(activeConvoKey, currentUser.id);
    }
  }, [messages]);

  const clearConvo = (key) => {
    const now = new Date().toISOString();
    const next = { ...clearedConvos, [key]: now };
    setClearedConvos(next);
    const uid = localStorage.getItem('tb_uid');
    if (uid) localStorage.setItem(`tb_cleared_${uid}`, JSON.stringify(next));
    if (activeConvoKey === key) setActiveConvoKey(null);
  };

  // Build conversation list from dms prop, filtering cleared ones unless new messages arrived
  const conversations = useMemo(() => dms
    .map(d => {
      const other = users.find(u => u.id === d.other_user_id);
      if (!other) return null;
      const lastMsg = d.messages?.[d.messages.length - 1];
      return { key: d.conversation_key, other, lastMsg, unread: d.unread_count || 0 };
    })
    .filter(Boolean)
    .filter(c => {
      const clearedAt = clearedConvos[c.key];
      if (!clearedAt) return true;
      // Reappear if a new message arrived after this conversation was cleared
      const lastMsgTime = c.lastMsg?.created_at;
      return lastMsgTime && new Date(lastMsgTime) > new Date(clearedAt);
    })
    .sort((a, b) => new Date(b.lastMsg?.created_at || 0) - new Date(a.lastMsg?.created_at || 0)),
  [dms, users, clearedConvos]);

  const activeOtherId = activeConvoKey?.split('_').find(id => id !== currentUser?.id);
  const activeOther = activeOtherId ? users.find(u => u.id === activeOtherId) : null;

  // Include the active conversation in the sidebar immediately, even before dms updates
  const conversationsWithActive = useMemo(() => {
    if (!activeConvoKey || !activeOther) return conversations;
    const alreadyListed = conversations.some(c => c.key === activeConvoKey);
    if (alreadyListed) return conversations;
    const pendingEntry = {
      key: activeConvoKey,
      other: activeOther,
      lastMsg: messages[messages.length - 1] || null,
      unread: 0,
    };
    return [pendingEntry, ...conversations];
  }, [conversations, activeConvoKey, activeOther, messages]);

  const openConversation = (otherUser) => {
    const key = dmKey(currentUser.id, otherUser.id);
    setActiveConvoKey(key);
    setEditingId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvoKey) return;
    const otherId = activeConvoKey.split('_').find(id => id !== currentUser.id);
    const text = input.trim();
    setInput('');
    await sendDM(activeConvoKey, currentUser.id, otherId, text);
    console.log('[Messages] sending notification to', otherId);
    await addNotification(otherId, {
      type: 'message',
      message: `${currentUser.displayName} sent you a message`,
      page: 'messages',
    });
  };

  const saveEdit = async (messageId) => {
    const trimmed = editContent.trim();
    if (!trimmed) { setEditingId(null); return; }
    // Optimistic local update immediately
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: trimmed, edited: true } : m));
    setEditingId(null);
    setEditContent('');
    await editMessage(messageId, trimmed);
  };

  const handleDelete = async (messageId) => {
    // Optimistic local update immediately
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted: true, content: '[deleted]' } : m));
    await deleteMessage(messageId);
  };

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
          {conversationsWithActive.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-icon">💬</div>
              <p>No conversations yet. Click "+ New Message" to start one.</p>
            </div>
          ) : (
            conversationsWithActive.map(c => {
              const preview = c.lastMsg?.deleted ? 'Message deleted' : c.lastMsg?.content || 'No messages yet';
              return (
                <div
                  key={c.key}
                  className={`convo-item ${activeConvoKey === c.key ? 'active' : ''}`}
                  onClick={() => openConversation(c.other)}
                  onMouseEnter={() => setHoveredConvoKey(c.key)}
                  onMouseLeave={() => setHoveredConvoKey(null)}
                  style={{ position: 'relative' }}
                >
                  <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                    {c.other.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="convo-name">{c.other.displayName}</span>
                      {c.unread > 0 && <span className="badge" style={{ position: 'static' }}>{c.unread}</span>}
                    </div>
                    <div className="convo-preview" style={{ fontStyle: c.lastMsg?.deleted ? 'italic' : 'normal' }}>{preview}</div>
                  </div>
                  {hoveredConvoKey === c.key && (
                    <button
                      title="Clear from feed"
                      onClick={(e) => { e.stopPropagation(); clearConvo(c.key); }}
                      style={{
                        position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4,
                        padding: '2px 7px', fontSize: '0.8rem', color: 'var(--text3)',
                        cursor: 'pointer', lineHeight: 1, zIndex: 1,
                      }}
                    >×</button>
                  )}
                </div>
              );
            })
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
              {/* Chat header */}
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

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 && (
                  <div className="empty-state" style={{ flex: 1 }}><p>Start the conversation!</p></div>
                )}
                {messages.map(m => {
                  const mine = m.sender_id === currentUser.id;

                  // Deleted messages: centered italic line visible to both
                  if (m.deleted) {
                    return (
                      <div key={m.id} style={{ textAlign: 'center', padding: '0.15rem 0' }}>
                        <span style={{ color: 'var(--text3)', fontSize: '0.75rem', fontStyle: 'italic' }}>Message deleted</span>
                      </div>
                    );
                  }

                  const senderUser = mine ? currentUser : users.find(u => u.id === m.sender_id);
                  const initials = senderUser?.displayName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

                  return (
                    <div
                      key={m.id}
                      className={`chat-msg ${mine ? 'mine' : ''}`}
                      onMouseEnter={() => setHoveredMsgId(m.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      {!mine && (
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                          {initials}
                        </div>
                      )}
                      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        {!mine && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.15rem' }}>{senderUser?.displayName}</div>}

                        {/* Edit/delete action bar for own messages */}
                        {mine && hoveredMsgId === m.id && editingId !== m.id && (
                          <div style={{
                            position: 'absolute', top: -28, right: 0,
                            display: 'flex', gap: 2,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '2px 4px', zIndex: 10,
                          }}>
                            <button
                              onClick={() => { setEditingId(m.id); setEditContent(m.content); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 5px', fontSize: '0.8rem' }}
                              title="Edit"
                            >✏️</button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 5px', fontSize: '0.8rem' }}
                              title="Delete"
                            >🗑️</button>
                          </div>
                        )}

                        {editingId === m.id ? (
                          <input
                            className="input"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(m.id);
                              if (e.key === 'Escape') { setEditingId(null); setEditContent(''); }
                            }}
                            autoFocus
                            style={{ minWidth: 160 }}
                          />
                        ) : (
                          <div className="chat-bubble">{m.content}</div>
                        )}

                        <div className="chat-msg-meta">
                          {timeAgo(m.created_at)}
                          {m.edited && <span style={{ marginLeft: 4, fontSize: '0.6rem', color: 'var(--text3)' }}>edited</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Input row */}
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
          onClose={() => setShowNewModal(false)}
          onOpen={(user) => openConversation(user)}
        />
      )}
    </div>
  );
}
