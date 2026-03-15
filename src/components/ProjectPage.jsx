import { useState } from 'react';
import { updateProject, updateUser, addNotification, timeAgo, generateId } from '../utils/storage';
import ProjectRoom from './ProjectRoom';
import UserPopover from './UserPopover';

export default function ProjectPage({ project: initProject, setProject, onBack, currentUser, setCurrentUser, navigate, users, projects }) {
  const [project, setLocalProject] = useState(initProject);
  const [comment, setComment] = useState('');
  const [annText, setAnnText] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [popover, setPopover] = useState(null);

  const save = async (updated) => {
    setLocalProject(updated);
    setProject(updated);
    await updateProject(updated.id, updated);
  };

  const isOwner = currentUser?.id === project.ownerId;
  const isMember = project.membersAccepted?.includes(currentUser?.id) || isOwner;
  const hasApplied = project.applicants?.some(a => a.userId === currentUser?.id);

  const addComment = async () => {
    if (!currentUser || !comment.trim()) return;
    const c = { id: generateId(), userId: currentUser.id, userName: currentUser.displayName, text: comment.trim(), timestamp: new Date().toISOString() };
    await save({ ...project, comments: [...(project.comments || []), c] });
    setComment('');
  };

  const pinAnnouncement = async () => {
    if (!isOwner || !annText.trim()) return;
    const a = { id: generateId(), text: annText.trim(), timestamp: new Date().toISOString() };
    await save({ ...project, announcements: [...(project.announcements || []), a] });
    setAnnText('');
  };

  const postUpdate = async () => {
    if (!isOwner || !updateText.trim()) return;
    const u = { id: generateId(), text: updateText.trim(), timestamp: new Date().toISOString() };
    await save({ ...project, updates: [...(project.updates || []), u] });
    setUpdateText('');
    await addNotification(project.ownerId, { type: 'projectUpdate', text: `You posted an update on "${project.title}"`, page: 'project-full' });
  };

  const applyToProject = async () => {
    if (!currentUser || hasApplied) return;
    const app = { userId: currentUser.id, name: currentUser.displayName, message: applyMsg, status: 'pending' };
    await save({ ...project, applicants: [...(project.applicants || []), app] });
    await addNotification(project.ownerId, { type: 'application', text: `${currentUser.displayName} applied to "${project.title}"`, page: 'profile' });
    setShowApplyForm(false);
    setApplyMsg('');
  };

  const toggleSave = async () => {
    if (!currentUser) return;
    const isSaved = currentUser.savedProjects?.includes(project.id);
    const newSaved = isSaved
      ? (currentUser.savedProjects || []).filter(id => id !== project.id)
      : [...(currentUser.savedProjects || []), project.id];
    const updatedUser = { ...currentUser, savedProjects: newSaved };
    setCurrentUser(updatedUser);
    await updateUser(currentUser.id, { savedProjects: newSaved });
    const diff = !isSaved ? 1 : -1;
    await save({ ...project, bookmarks: Math.max(0, (project.bookmarks || 0) + diff) });
  };

  const openUserPopover = (uid, e) => {
    const u = users.find(x => x.id === uid);
    if (u) setPopover({ user: u, x: e.clientX, y: e.clientY });
  };

  const relatedProjects = (projects || [])
    .filter(p => p.id !== project.id && p.tags?.some(t => project.tags?.includes(t)))
    .slice(0, 3);

  const isSaved = currentUser?.savedProjects?.includes(project.id);

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '1rem' }}>
        ← Back to Projects
      </button>

      {/* Pinned Announcements */}
      {project.announcements?.length > 0 && (
        <div className="announcement-banner" style={{ marginBottom: '1.5rem' }}>
          <div className="ann-label">📌 Pinned Announcements</div>
          {[...project.announcements].reverse().slice(0, 3).map(a => (
            <div key={a.id} style={{ fontSize: '0.9rem', color: 'var(--text)', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,210,0,0.1)' }}>
              {a.text}
              <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', color: 'var(--maize)', opacity: 0.7 }}>{timeAgo(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span className={`status-badge status-${project.status.replace(' ', '-')}`}>{project.status}</span>
              {(project.bookmarks + project.applicants.length) >= 10 && <span className="status-badge status-Trending">🔥 Trending</span>}
            </div>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.3rem, 3vw, 2rem)', lineHeight: 1.2, marginBottom: '0.75rem' }}>{project.title}</h1>
            <div style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>
              Posted by <strong style={{ color: 'var(--text)' }}>{project.ownerName}</strong> · {timeAgo(project.createdAt)}
              · {project.applicants?.length || 0} applicants
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button className="btn btn-outline btn-sm" onClick={toggleSave}>
              {isSaved ? '★ Saved' : '☆ Save'}
            </button>
            {!isOwner && !isMember && !hasApplied && (
              <button className="btn btn-primary" onClick={() => { if (currentUser) setShowApplyForm(true); else navigate('login'); }}>
                Apply to Join
              </button>
            )}
            {hasApplied && !isMember && <span className="btn btn-success btn-sm" style={{ pointerEvents: 'none' }}>✓ Applied</span>}
            {isMember && !isOwner && <span className="btn btn-success btn-sm" style={{ pointerEvents: 'none' }}>✓ Team Member</span>}
          </div>
        </div>
      </div>

      {showApplyForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--maize)' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.75rem', fontSize: '1rem' }}>Your Application</h3>
          <textarea className="input" value={applyMsg} onChange={e => setApplyMsg(e.target.value)}
            placeholder="Tell the team why you'd be a great fit, what you bring, and any relevant experience..." style={{ minHeight: 120 }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={applyToProject}>Submit Application</button>
            <button className="btn btn-ghost" onClick={() => setShowApplyForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          {/* Description */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem', color: 'var(--maize)' }}>About This Project</h3>
            <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>{project.description}</p>
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>SKILLS NEEDED</div>
                <div className="tags">{project.skills?.map(s => <span key={s} className="tag">{s}</span>)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>TAGS</div>
                <div className="tags">{project.tags?.map(t => <span key={t} className="tag">#{t}</span>)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>TIMELINE</div>
                <div style={{ marginTop: '0.25rem' }}>{project.timeline}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>CONTACT</div>
                <div style={{ marginTop: '0.25rem' }}><a href={`mailto:${project.contact}`} style={{ color: 'var(--maize)' }}>{project.contact}</a></div>
              </div>
            </div>
          </div>

          {/* Progress Updates */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem', color: 'var(--maize)' }}>Progress Updates</h3>
            {isOwner && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input className="input" value={updateText} onChange={e => setUpdateText(e.target.value)}
                  placeholder="Post a milestone or update..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && postUpdate()} />
                <button className="btn btn-primary btn-sm" onClick={postUpdate}>Post</button>
              </div>
            )}
            {(project.updates || []).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>No updates yet.</div>
            ) : (
              [...(project.updates || [])].reverse().map(u => (
                <div key={u.id} style={{ padding: '0.75rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--text)', marginBottom: '0.2rem' }}>{u.text}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{timeAgo(u.timestamp)}</div>
                </div>
              ))
            )}
          </div>

          {/* Owner: Pin Announcement */}
          {isOwner && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.75rem', fontSize: '1rem' }}>📌 Pin Announcement</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" value={annText} onChange={e => setAnnText(e.target.value)}
                  placeholder="Announcement text..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && pinAnnouncement()} />
                <button className="btn btn-primary btn-sm" onClick={pinAnnouncement}>Pin</button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem', color: 'var(--maize)' }}>
              Comments ({project.comments?.length || 0})
            </h3>
            {currentUser && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input className="input" value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Ask a question or leave a comment..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addComment()} />
                <button className="btn btn-primary btn-sm" onClick={addComment}>Post</button>
              </div>
            )}
            {(project.comments || []).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>No comments yet. Be the first!</div>
            ) : (
              [...(project.comments || [])].reverse().map(c => (
                <div key={c.id} className="comment-item">
                  <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                    {c.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="comment-body">
                    <div className="comment-author"
                      style={{ cursor: 'pointer', color: 'var(--maize)' }}
                      onClick={(e) => openUserPopover(c.userId, e)}>
                      {c.userName}
                    </div>
                    <div className="comment-text">{c.text}</div>
                    <div className="comment-time">{timeAgo(c.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Related Projects */}
          {relatedProjects.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem', color: 'var(--maize)' }}>Related Projects</h3>
              {relatedProjects.map(rp => (
                <div key={rp.id} style={{ padding: '0.75rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', cursor: 'pointer' }}
                  onClick={() => { setLocalProject(rp); setProject(rp); }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' }}>{rp.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '0.2rem' }}>
                    {rp.tags?.slice(0, 3).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          {/* Team */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem', fontSize: '1rem', color: 'var(--maize)' }}>Team</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>
                {project.membersAccepted?.length || 1} / {project.teamSize} members
              </div>
              <div className="spots-bar">
                <div className="spots-track" style={{ flex: 1 }}>
                  <div className="spots-fill" style={{ width: `${Math.min(((project.membersAccepted?.length || 1) / project.teamSize) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
            {(project.membersAccepted || [project.ownerId]).map(uid => {
              const u = users.find(x => x.id === uid);
              const name = u ? u.displayName : (uid === project.ownerId ? project.ownerName : uid);
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={uid} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.4rem 0', cursor: 'pointer' }}
                  onClick={(e) => u && openUserPopover(uid, e)}>
                  <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{name}</div>
                    {uid === project.ownerId && <div style={{ fontSize: '0.72rem', color: 'var(--maize)' }}>Owner</div>}
                    {u?.skills?.length > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{u.skills.slice(0, 2).join(', ')}</div>}
                  </div>
                  {u?.trustScore > 0 && <span className="trust-score" style={{ marginLeft: 'auto' }}>⭐{u.trustScore.toFixed(1)}</span>}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--maize)' }}>Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Bookmarks', value: project.bookmarks, icon: '★' },
                { label: 'Applicants', value: project.applicants?.length || 0, icon: '📩' },
                { label: 'Comments', value: project.comments?.length || 0, icon: '💬' },
                { label: 'Updates', value: project.updates?.length || 0, icon: '📢' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--maize)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Project Room — only for members/owner */}
      {isMember && (
        <div style={{ marginTop: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', marginBottom: '1rem' }}>
            🏠 Project Room <span style={{ color: 'var(--text3)', fontSize: '0.85rem', fontWeight: 400 }}>(members only)</span>
          </h2>
          <ProjectRoom project={project} currentUser={currentUser} updateProject={save} />
        </div>
      )}

      {popover && (
        <UserPopover
          user={popover.user}
          anchorPos={{ x: popover.x, y: popover.y }}
          onClose={() => setPopover(null)}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          navigate={navigate}
        />
      )}
    </div>
  );
}
