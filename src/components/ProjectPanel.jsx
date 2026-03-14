import { useState, useEffect, useRef } from 'react';
import {
  getProjects, saveProjects, getCurrentUser, saveCurrentUser,
  updateProjectInStorage, addNotification, timeAgo, generateId
} from '../utils/storage';

export default function ProjectPanel({ project: initProject, onClose, onViewFull, currentUser, setCurrentUser, refreshData }) {
  const [project, setProject] = useState(initProject);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [applied, setApplied] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [showApply, setShowApply] = useState(false);
  const panelRef = useRef();

  useEffect(() => {
    setTimeout(() => setOpen(true), 10);
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    const keyHandler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  useEffect(() => {
    const fresh = getProjects().find(p => p.id === project.id);
    if (fresh) setProject(fresh);
    if (currentUser) {
      const alreadyApplied = project.applicants?.some(a => a.userId === currentUser.id);
      const alreadyMember = project.membersAccepted?.includes(currentUser.id);
      setApplied(alreadyApplied || alreadyMember);
    }
  }, [currentUser]);

  const submitApply = () => {
    if (!currentUser) return;
    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx === -1) return;
    const alreadyApplied = projects[idx].applicants.some(a => a.userId === currentUser.id);
    if (alreadyApplied) return;

    projects[idx].applicants.push({
      userId: currentUser.id, name: currentUser.displayName,
      message: applyMsg, status: 'pending'
    });
    saveProjects(projects);
    setProject(projects[idx]);
    setApplied(true);
    setShowApply(false);
    addNotification(projects[idx].ownerId, {
      type: 'application',
      text: `${currentUser.displayName} applied to "${projects[idx].title}"`,
      page: 'profile'
    });

    // EmailJS — notify project owner of new application
    if (typeof emailjs !== 'undefined') {
      emailjs.send('service_2iwvvge', 'template_d0jmsfa', {
        owner_name: projects[idx].ownerName,
        project_title: projects[idx].title,
        applicant_name: currentUser.displayName,
        message: applyMsg,
        to_email: projects[idx].contact,
      }).catch(err => console.warn('EmailJS error:', err));
    }

    refreshData();
  };

  const addComment = () => {
    if (!currentUser || !comment.trim()) return;
    const newComment = {
      id: generateId(), userId: currentUser.id, userName: currentUser.displayName,
      text: comment.trim(), timestamp: new Date().toISOString()
    };
    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx === -1) return;
    projects[idx].comments.push(newComment);
    saveProjects(projects);
    setProject(projects[idx]);
    setComment('');
    refreshData();
  };

  const toggleSave = () => {
    const cu = getCurrentUser();
    if (!cu) return;
    const saved = cu.savedProjects || [];
    const next = saved.includes(project.id) ? saved.filter(id => id !== project.id) : [...saved, project.id];
    const updated = { ...cu, savedProjects: next };
    saveCurrentUser(updated);
    setCurrentUser(updated);

    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      const diff = next.includes(project.id) ? 1 : -1;
      projects[idx] = { ...projects[idx], bookmarks: Math.max(0, projects[idx].bookmarks + diff) };
      saveProjects(projects);
      setProject(projects[idx]);
    }
    refreshData();
  };

  const isSaved = currentUser?.savedProjects?.includes(project.id);
  const isOwner = currentUser?.id === project.ownerId;
  const isMember = project.membersAccepted?.includes(currentUser?.id);
  const topComments = [...(project.comments || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 2);

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="side-panel open" ref={panelRef}>
        <div className="side-panel-header">
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span className={`status-badge status-${project.status.replace(' ', '-')}`}>{project.status}</span>
              {(project.bookmarks + project.applicants.length) >= 10 &&
                <span className="status-badge status-Trending">🔥 Trending</span>}
            </div>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', lineHeight: 1.3 }}>{project.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Announcements */}
        {project.announcements?.length > 0 && (
          <div className="announcement-banner">
            <div className="ann-label">📌 Pinned Announcement</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
              {project.announcements[project.announcements.length - 1].text}
            </div>
          </div>
        )}

        {/* Full Description */}
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1rem' }}>
          {project.description}
        </p>

        {/* Tags */}
        <div className="tags">
          {project.tags?.map(t => <span key={t} className="tag">#{t}</span>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', margin: '1rem 0', fontSize: '0.84rem' }}>
          <div>
            <span style={{ color: 'var(--text3)' }}>Skills Needed</span>
            <div className="tags" style={{ marginTop: '0.3rem' }}>
              {project.skills?.map(s => <span key={s} className="tag">{s}</span>)}
            </div>
          </div>
          <div>
            <div><span style={{ color: 'var(--text3)' }}>Timeline: </span>{project.timeline}</div>
            <div style={{ marginTop: '0.3rem' }}><span style={{ color: 'var(--text3)' }}>Contact: </span>
              <a href={`mailto:${project.contact}`} style={{ color: 'var(--maize)' }}>{project.contact}</a>
            </div>
          </div>
        </div>

        {/* Team members */}
        {project.membersAccepted?.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>TEAM</div>
            <div className="avatar-stack">
              {project.membersAccepted.slice(0, 6).map(uid => {
                const initials = uid === project.ownerId
                  ? project.ownerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  : uid.slice(0, 2).toUpperCase();
                return <div key={uid} className="user-avatar" title={uid}>{initials}</div>;
              })}
              {project.membersAccepted.length > 6 && (
                <div className="user-avatar" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
                  +{project.membersAccepted.length - 6}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spots */}
        <div className="spots-bar" style={{ marginBottom: '1rem' }}>
          <span>👥</span>
          <div className="spots-track">
            <div className="spots-fill" style={{ width: `${Math.min(((project.membersAccepted?.length || 1) / project.teamSize) * 100, 100)}%` }} />
          </div>
          <span>{project.membersAccepted?.length || 1}/{project.teamSize} spots</span>
        </div>

        {/* Comments preview */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            COMMENTS ({project.comments?.length || 0})
          </div>
          {topComments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                {c.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="comment-body">
                <div className="comment-author">{c.userName}</div>
                <div className="comment-text">{c.text}</div>
                <div className="comment-time">{timeAgo(c.timestamp)}</div>
              </div>
            </div>
          ))}
          {currentUser && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                className="input"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => e.key === 'Enter' && addComment()}
                style={{ flex: 1, padding: '0.5rem 0.75rem' }}
              />
              <button className="btn btn-outline btn-sm" onClick={addComment}>Post</button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-outline btn-sm" onClick={toggleSave}>
            {isSaved ? '★ Saved' : '☆ Save'}
          </button>
          {!isOwner && !isMember && !applied && (
            <button className="btn btn-primary btn-sm" onClick={() => { if (!currentUser) return; setShowApply(true); }}>
              Apply to Join
            </button>
          )}
          {applied && !isMember && <span style={{ fontSize: '0.84rem', color: '#48BB78' }}>✓ Applied</span>}
          {isMember && <span style={{ fontSize: '0.84rem', color: '#48BB78' }}>✓ You're on this team</span>}
          <button className="btn btn-primary btn-sm" onClick={onViewFull} style={{ marginLeft: 'auto' }}>
            View Full Page →
          </button>
        </div>

        {showApply && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              Application Message
            </div>
            <textarea
              className="input"
              value={applyMsg}
              onChange={e => setApplyMsg(e.target.value)}
              placeholder="Tell the team why you'd be a great fit..."
              style={{ minHeight: 80 }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={submitApply}>Submit Application</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowApply(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
