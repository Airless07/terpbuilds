import { useState, useEffect } from 'react';
import TagInput from '../components/TagInput';
import ProjectCard from '../components/ProjectCard';
import { updateUser, updateProject, deleteProject as deleteProjectDB, addNotification, fetchApplicationsForProjects, updateApplication } from '../utils/storage';
import { supabase } from '../firebase';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`star ${n <= (hover || value) ? 'filled' : ''}`}
          onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>★</span>
      ))}
    </div>
  );
}

function ApplicantsModal({ project, applications, users, onClose, onAction }) {
  const pending = applications.filter(a => a.project_id === project.id && a.status === 'pending');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Applicants — {project.title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📩</div><p>No pending applicants.</p></div>
        ) : (
          pending.map(a => {
            const applicantUser = users?.find(u => u.id === a.user_id);
            return (
              <div key={a.id} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                    {a.applicant_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.applicant_name}</div>
                    {applicantUser?.skills?.length > 0 && (
                      <div className="tags" style={{ margin: '0.3rem 0' }}>
                        {applicantUser.skills.slice(0, 5).map(s => <span key={s} className="tag">{s}</span>)}
                      </div>
                    )}
                    {a.message && <div style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: '0.25rem 0', fontStyle: 'italic' }}>"{a.message}"</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button className="btn btn-success btn-sm" onClick={() => onAction('accept', project, a)}>Accept</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onAction('deny', project, a)}>Deny</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RateTeammatesModal({ project, currentUserId, onClose, onRate, users }) {
  const [ratings, setRatings] = useState({});
  const [reviews, setReviews] = useState({});
  const teammates = (project.membersAccepted || []).filter(uid => uid !== currentUserId);

  const submit = () => {
    teammates.forEach(uid => {
      if (ratings[uid]) onRate(uid, ratings[uid], reviews[uid] || '', project.id);
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Rate Teammates — {project.title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {teammates.length === 0 ? (
          <div className="empty-state"><p>No teammates to rate.</p></div>
        ) : (
          teammates.map(uid => {
            const u = users.find(x => x.id === uid);
            if (!u) return null;
            return (
              <div key={uid} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{u.displayName}</div>
                <StarRating value={ratings[uid] || 0} onChange={val => setRatings(p => ({ ...p, [uid]: val }))} />
                <textarea className="input" style={{ marginTop: '0.5rem', minHeight: 60 }}
                  value={reviews[uid] || ''} onChange={e => setReviews(p => ({ ...p, [uid]: e.target.value }))}
                  placeholder="Optional short review..." />
              </div>
            );
          })
        )}
        {teammates.length > 0 && (
          <button className="btn btn-primary" onClick={submit} style={{ marginTop: '0.5rem' }}>Submit Ratings</button>
        )}
      </div>
    </div>
  );
}

export default function Profile({ currentUser, setCurrentUser, navigate, openPanel, projects, users }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ displayName: '', github: '', linkedin: '', website: '' });
  const [skills, setSkills] = useState([]);
  const [applicantsModal, setApplicantsModal] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [profileTab, setProfileTab] = useState('projects');
  const [denyTarget, setDenyTarget] = useState(null); // { project, applicant }
  const [denyReason, setDenyReason] = useState('');
  const [saved, setSaved] = useState(false);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (!currentUser) { navigate('login'); return; }
    setForm({
      displayName: currentUser.displayName,
      github: currentUser.github || '',
      linkedin: currentUser.linkedin || '',
      website: currentUser.website || '',
    });
    setSkills(currentUser.skills || []);
  }, [currentUser]);

  const myProjectIds = currentUser
    ? projects.filter(p => p.ownerId === currentUser.id).map(p => p.id)
    : [];

  useEffect(() => {
    if (!currentUser || myProjectIds.length === 0) { setApplications([]); return; }
    fetchApplicationsForProjects(myProjectIds).then(setApplications);

    const channel = supabase.channel(`applications-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchApplicationsForProjects(myProjectIds).then(setApplications);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser?.id, myProjectIds.join(',')]);

  if (!currentUser) return null;

  const myProjects = projects.filter(p => p.ownerId === currentUser.id);
  const savedProjects = projects.filter(p => currentUser.savedProjects?.includes(p.id));
  const completedProjects = myProjects.filter(p => p.status === 'Completed');

  const saveProfile = async () => {
    const updated = { ...currentUser, ...form, skills };
    setCurrentUser(updated);
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateUser(currentUser.id, { displayName: form.displayName, github: form.github, linkedin: form.linkedin, website: form.website, skills });
  };

  const handleAccept = async (project, applicant) => {
    await updateApplication(applicant.id, 'accepted');
    const proj = projects.find(p => p.id === project.id);
    if (proj && proj.spotsRemaining > 0) {
      await updateProject(proj.id, { spotsRemaining: proj.spotsRemaining - 1 });
    }
    await addNotification(applicant.user_id, {
      type: 'accepted',
      message: `You were accepted to "${project.title}"!`,
      page: 'projects',
    });
    setApplicantsModal(null);
  };

  const handleDeny = async (project, applicant, reason) => {
    await updateApplication(applicant.id, 'denied');
    const reasonText = reason?.trim() || 'undisclosed';
    await addNotification(applicant.user_id, {
      type: 'denied',
      message: `Your application to "${project.title}" was not accepted. Reason: ${reasonText}`,
      page: 'projects',
    });
    setDenyTarget(null);
    setDenyReason('');
    setApplicantsModal(null);
  };

  const handleApplicantAction = (action, project, applicant) => {
    if (action === 'accept') return handleAccept(project, applicant);
    if (action === 'deny') { setDenyTarget({ project, applicant }); }
  };

  const handleRate = async (targetUserId, score, review, projectId) => {
    const target = users.find(u => u.id === targetUserId);
    if (!target) return;
    const ratings = target.ratings || [];
    const existingIdx = ratings.findIndex(r => r.from === currentUser.id && r.projectId === projectId);
    const ratingEntry = { from: currentUser.id, score, review, projectId };
    const updatedRatings = existingIdx !== -1
      ? ratings.map((r, i) => i === existingIdx ? ratingEntry : r)
      : [...ratings, ratingEntry];
    const trustScore = updatedRatings.reduce((sum, r) => sum + r.score, 0) / updatedRatings.length;
    await updateUser(targetUserId, { ratings: updatedRatings, trustScore });
    await addNotification(targetUserId, { type: 'rated', text: `${currentUser.displayName} rated you ⭐${score}/5!`, page: 'profile' });
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await deleteProjectDB(projectId);
  };

  const unsaveProject = async (projectId) => {
    const newSaved = (currentUser.savedProjects || []).filter(id => id !== projectId);
    setCurrentUser({ ...currentUser, savedProjects: newSaved });
    await updateUser(currentUser.id, { savedProjects: newSaved });
  };

  const [copied, setCopied] = useState(false);
  const copyId = () => {
    navigator.clipboard.writeText(currentUser.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const initials = currentUser.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { id: 'projects', label: `My Projects (${myProjects.length})` },
    { id: 'saved', label: `Saved (${savedProjects.length})` },
    { id: 'rate', label: 'Rate Teammates' },
  ];

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      {/* Profile header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="user-avatar" style={{ width: 72, height: 72, fontSize: '1.5rem', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            {editMode ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <div className="form-group">
                    <label>Display Name</label>
                    <input className="input" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Skills</label>
                    <TagInput tags={skills} onChange={setSkills} placeholder="Add skills..." />
                  </div>
                  <div className="form-group">
                    <label>GitHub URL</label>
                    <input className="input" value={form.github} onChange={e => setForm(p => ({ ...p, github: e.target.value }))} placeholder="https://github.com/..." />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input className="input" value={form.linkedin} onChange={e => setForm(p => ({ ...p, linkedin: e.target.value }))} placeholder="https://linkedin.com/..." />
                  </div>
                  <div className="form-group">
                    <label>Personal Site</label>
                    <input className="input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save Changes</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem' }}>{currentUser.displayName}</h2>
                  {currentUser.trustScore > 0 && (
                    <span className="trust-score" style={{ fontSize: '0.95rem' }}>⭐ {currentUser.trustScore.toFixed(1)} / 5</span>
                  )}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{currentUser.email}</div>
                <div className="tags" style={{ marginBottom: '0.75rem' }}>
                  {(currentUser.skills || []).map(s => <span key={s} className="tag">{s}</span>)}
                  {(currentUser.skills || []).length === 0 && (
                    <span style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No skills added yet</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {currentUser.github && <a href={currentUser.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">🐙 GitHub</a>}
                  {currentUser.linkedin && <a href={currentUser.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">💼 LinkedIn</a>}
                  {currentUser.website && <a href={currentUser.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">🌐 Website</a>}
                  <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
                </div>
                {saved && <div className="alert alert-success" style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem' }}>Profile saved!</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User ID section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your User ID
          </span>
          <button
            className="btn btn-outline btn-sm"
            onClick={copyId}
            style={{ fontSize: '0.78rem', minWidth: 90 }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700,
          color: 'var(--maize)', background: 'var(--bg3)',
          border: '1px solid rgba(255,210,0,0.25)', borderRadius: 'var(--radius-sm)',
          padding: '0.6rem 1rem', letterSpacing: '0.05em',
          boxShadow: '0 0 12px rgba(255,210,0,0.08)',
          wordBreak: 'break-all',
        }}>
          {currentUser.id}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: '0.5rem' }}>
          Share this ID with others so they can message you directly.
        </div>
      </div>

      {/* Tabs */}
      <div className="room-tabs" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} className={`room-tab ${profileTab === t.id ? 'active' : ''}`} onClick={() => setProfileTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Projects */}
      {profileTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ fontSize: '1rem' }}>Posted Projects</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('post-project')}>+ New Project</button>
          </div>
          {myProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🚀</div>
              <p>You haven't posted any projects yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('post-project')}>Post Your First Project</button>
            </div>
          ) : (
            <div className="projects-grid">
              {myProjects.map(p => (
                <div key={p.id} style={{ position: 'relative' }}>
                  <ProjectCard project={p} currentUser={currentUser} setCurrentUser={setCurrentUser}
                    openPanel={openPanel} animClass="card-enter" />
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setApplicantsModal(p)}>
                      👥 Applicants ({applications.filter(a => a.project_id === p.id && a.status === 'pending').length})
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProject(p.id)}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved */}
      {profileTab === 'saved' && (
        <div>
          {savedProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">★</div>
              <p>No saved projects. Browse projects and save ones you like!</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('projects')}>Browse Projects</button>
            </div>
          ) : (
            <div className="projects-grid">
              {savedProjects.map(p => (
                <div key={p.id}>
                  <ProjectCard project={p} currentUser={currentUser} setCurrentUser={setCurrentUser}
                    openPanel={openPanel} animClass="card-enter" />
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.4rem', color: 'var(--text3)' }}
                    onClick={() => unsaveProject(p.id)}>✕ Unsave</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rate Teammates */}
      {profileTab === 'rate' && (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            Rate teammates from projects you've completed together. Ratings update their Trust Score.
          </p>
          {completedProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <p>No completed projects to rate teammates from yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {completedProjects.map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{p.membersAccepted?.filter(id => id !== currentUser.id).length || 0} teammates</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setRateModal(p)}>Rate Teammates ⭐</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {applicantsModal && !denyTarget && (
        <ApplicantsModal
          project={applicantsModal}
          applications={applications}
          users={users}
          onClose={() => setApplicantsModal(null)}
          onAction={handleApplicantAction}
        />
      )}
      {denyTarget && (
        <div className="modal-overlay" onClick={() => { setDenyTarget(null); setDenyReason(''); }}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Decline Application</h3>
              <button className="close-btn" onClick={() => { setDenyTarget(null); setDenyReason(''); }}>✕</button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>
              Declining <strong>{denyTarget.applicant.applicant_name}</strong>'s application to <strong>{denyTarget.project.title}</strong>.
              Optionally share a reason — they'll see it in their notification.
            </p>
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea
                className="input"
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                placeholder="e.g. We already filled this role, or skills not matching..."
                style={{ minHeight: 80 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeny(denyTarget.project, denyTarget.applicant, denyReason)}>
                Confirm Decline
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDenyTarget(null); setDenyReason(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {rateModal && (
        <RateTeammatesModal
          project={rateModal}
          currentUserId={currentUser.id}
          users={users}
          onClose={() => setRateModal(null)}
          onRate={handleRate}
        />
      )}
    </div>
  );
}
