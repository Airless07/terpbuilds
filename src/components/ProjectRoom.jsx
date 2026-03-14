import { useState, useEffect, useRef } from 'react';
import { getProjects, saveProjects, generateId, timeAgo } from '../utils/storage';

function ChatTab({ project, currentUser, updateProject }) {
  const [msg, setMsg] = useState('');
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [project.roomMessages]);

  const send = () => {
    if (!msg.trim() || !currentUser) return;
    const newMsg = {
      id: generateId(), userId: currentUser.id, userName: currentUser.displayName,
      text: msg.trim(), timestamp: new Date().toISOString()
    };
    const updated = { ...project, roomMessages: [...(project.roomMessages || []), newMsg] };
    updateProject(updated);
    setMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {(project.roomMessages || []).length === 0 && (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-icon">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {(project.roomMessages || []).map(m => {
          const mine = m.userId === currentUser?.id;
          return (
            <div key={m.id} className={`chat-msg ${mine ? 'mine' : ''}`}>
              {!mine && (
                <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                  {m.userName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
              )}
              <div>
                {!mine && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.15rem' }}>{m.userName}</div>}
                <div className="chat-bubble">{m.text}</div>
                <div className="chat-msg-meta">{timeAgo(m.timestamp)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="chat-input-row">
        <input className="input" value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()} placeholder="Send a message..." />
        <button className="btn btn-primary btn-sm" onClick={send}>Send</button>
      </div>
    </div>
  );
}

function SchedulerTab({ project, currentUser, updateProject }) {
  const isOwner = currentUser?.id === project.ownerId;
  const [startDate, setStartDate] = useState(project.availability?.dateRange?.start || '');
  const [endDate, setEndDate] = useState(project.availability?.dateRange?.end || '');
  const [slots, setSlots] = useState(project.availability?.slots || {});

  const HOURS = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`);

  const getDates = () => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end && dates.length < 14) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const dates = getDates();
  const mySlots = slots[currentUser?.id] || [];

  const toggleSlot = (date, hour) => {
    const key = `${date}_${hour}`;
    const myUpdated = mySlots.includes(key) ? mySlots.filter(s => s !== key) : [...mySlots, key];
    const newSlots = { ...slots, [currentUser.id]: myUpdated };
    setSlots(newSlots);
    const updated = { ...project, availability: { dateRange: { start: startDate, end: endDate }, slots: newSlots } };
    updateProject(updated);
  };

  const getOverlapCount = (key) => Object.values(slots).filter(s => s.includes(key)).length;
  const memberCount = project.membersAccepted?.length || 1;

  const saveRange = () => {
    const updated = { ...project, availability: { dateRange: { start: startDate, end: endDate }, slots } };
    updateProject(updated);
  };

  return (
    <div>
      {isOwner && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>Start Date</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>End Date</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveRange}>Set Range</button>
        </div>
      )}

      {dates.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${dates.length}, 44px)`, gap: '2px', minWidth: 'fit-content' }}>
            <div />
            {dates.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', padding: '0.2rem 0' }}>
                {new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            ))}
            {HOURS.map(hour => (
              <>
                <div key={hour} style={{ fontSize: '0.7rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', paddingRight: '0.5rem' }}>{hour}</div>
                {dates.map(d => {
                  const key = `${d}_${hour}`;
                  const mine = mySlots.includes(key);
                  const count = getOverlapCount(key);
                  const ratio = memberCount > 1 ? count / memberCount : 0;
                  let cls = 'scheduler-cell';
                  if (mine) cls += ' selected';
                  else if (ratio >= 0.7) cls += ' overlap-high';
                  else if (ratio >= 0.4) cls += ' overlap-med';
                  return (
                    <div
                      key={key}
                      className={cls}
                      onClick={() => currentUser && toggleSlot(d, hour)}
                      title={`${count} member(s) available`}
                      style={{ width: 40, height: 28 }}
                    />
                  );
                })}
              </>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text3)' }}>
            <span>🟡 Your availability</span>
            <span style={{ color: '#48BB78' }}>🟢 High overlap</span>
            <span style={{ color: 'rgba(72,187,120,0.5)' }}>🟩 Moderate overlap</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>{isOwner ? 'Set a date range above to start scheduling.' : 'The owner has not set a date range yet.'}</p>
        </div>
      )}
    </div>
  );
}

function FilesTab({ project, currentUser, updateProject }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const addLink = () => {
    if (!label.trim() || !url.trim()) return;
    const newLink = { id: generateId(), label: label.trim(), url: url.trim(), addedBy: currentUser.displayName, timestamp: new Date().toISOString() };
    const updated = { ...project, fileLinks: [...(project.fileLinks || []), newLink] };
    updateProject(updated);
    setLabel(''); setUrl('');
  };

  const remove = (id) => {
    const updated = { ...project, fileLinks: project.fileLinks.filter(f => f.id !== id) };
    updateProject(updated);
  };

  const ICONS = { github: '🐙', figma: '🎨', docs: '📄', default: '🔗' };
  const getIcon = (url) => {
    if (url.includes('github')) return ICONS.github;
    if (url.includes('figma')) return ICONS.figma;
    if (url.includes('docs.google') || url.includes('drive')) return ICONS.docs;
    return ICONS.default;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. GitHub Repo)" style={{ flex: 1 }} />
        <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" style={{ flex: 2 }}
          onKeyDown={e => e.key === 'Enter' && addLink()} />
        <button className="btn btn-primary btn-sm" onClick={addLink}>Add</button>
      </div>
      {(project.fileLinks || []).length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📂</div><p>No files shared yet.</p></div>
      ) : (
        project.fileLinks.map(f => (
          <div key={f.id} className="file-link-card">
            <span style={{ fontSize: '1.2rem' }}>{getIcon(f.url)}</span>
            <div style={{ flex: 1 }}>
              <a href={f.url} target="_blank" rel="noopener noreferrer">{f.label}</a>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Added by {f.addedBy} · {timeAgo(f.timestamp)}</div>
            </div>
            {(currentUser?.id === project.ownerId || currentUser?.id === f.addedBy) && (
              <button className="btn btn-ghost btn-sm" onClick={() => remove(f.id)} style={{ color: 'var(--text3)' }}>✕</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function ProjectRoom({ project, currentUser, updateProject }) {
  const [tab, setTab] = useState('chat');
  const TABS = [{ id: 'chat', label: '💬 Chat' }, { id: 'schedule', label: '📅 Schedule' }, { id: 'files', label: '📂 Files' }];

  return (
    <div className="project-room">
      <div className="room-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`room-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="room-content">
        {tab === 'chat' && <ChatTab project={project} currentUser={currentUser} updateProject={updateProject} />}
        {tab === 'schedule' && <SchedulerTab project={project} currentUser={currentUser} updateProject={updateProject} />}
        {tab === 'files' && <FilesTab project={project} currentUser={currentUser} updateProject={updateProject} />}
      </div>
    </div>
  );
}
