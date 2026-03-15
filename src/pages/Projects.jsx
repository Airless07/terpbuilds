import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import { fetchApplicationsForProjects, updateApplication, addNotification } from '../utils/storage';

const CATEGORIES = ['All', 'ML', 'WebDev', 'Mobile', 'Robotics', 'Game Dev', 'Security', 'AI', 'Hardware', 'Design', 'Fullstack', 'Health', 'VR', 'Creative'];
const STATUSES = ['All', 'Recruiting', 'Active', 'In Progress', 'Completed'];

function DenyReasonModal({ applicant, project, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Decline Application</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem' }}>
          Declining <strong>{applicant.applicant_name}</strong>'s application to <strong>{project.title}</strong>.
          Optionally share a reason.
        </p>
        <div className="form-group">
          <label>Reason (optional)</label>
          <textarea
            className="input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. We already filled this role..."
            style={{ minHeight: 80 }}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <button className="btn btn-danger btn-sm" onClick={() => onConfirm(reason)}>Confirm Decline</button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ApplicationsModal({ applications, projects, users, onClose, onAccept, onDeny }) {
  const [denyTarget, setDenyTarget] = useState(null);
  const pending = applications.filter(a => a.status === 'pending');

  if (denyTarget) {
    const proj = projects.find(p => p.id === denyTarget.project_id);
    return (
      <DenyReasonModal
        applicant={denyTarget}
        project={proj || { title: 'this project' }}
        onConfirm={(reason) => { onDeny(denyTarget, reason); setDenyTarget(null); }}
        onCancel={() => setDenyTarget(null)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📩 Applications ({pending.length} pending)</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📩</div><p>No pending applications.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map(a => {
              const proj = projects.find(p => p.id === a.project_id);
              const applicantUser = users?.find(u => u.id === a.user_id);
              return (
                <div key={a.id} className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                      {a.applicant_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.applicant_name}</div>
                      {proj && <div style={{ fontSize: '0.78rem', color: 'var(--maize)', marginBottom: '0.25rem' }}>→ {proj.title}</div>}
                      {applicantUser?.skills?.length > 0 && (
                        <div className="tags" style={{ margin: '0.25rem 0' }}>
                          {applicantUser.skills.slice(0, 5).map(s => <span key={s} className="tag">{s}</span>)}
                        </div>
                      )}
                      {a.message && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text2)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          "{a.message}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                      <button className="btn btn-success btn-sm" onClick={() => onAccept(a)}>Accept</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDenyTarget(a)}>Decline</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Projects({ projects, currentUser, setCurrentUser, openPanel, refreshData, navigate, users }) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showMyProjects, setShowMyProjects] = useState(false);
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [applications, setApplications] = useState([]);

  const myProjects = currentUser ? projects.filter(p => p.ownerId === currentUser.id) : [];
  const myProjectIds = myProjects.map(p => p.id);

  // Load + subscribe to applications for owner's projects
  useEffect(() => {
    if (!currentUser || myProjectIds.length === 0) { setApplications([]); return; }
    fetchApplicationsForProjects(myProjectIds).then(setApplications);

    const channel = supabase.channel(`apps-projects-page-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchApplicationsForProjects(myProjectIds).then(setApplications);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser?.id, myProjectIds.join(',')]);

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  const handleAccept = async (app) => {
    await updateApplication(app.id, 'accepted');
    const proj = projects.find(p => p.id === app.project_id);
    await addNotification(app.user_id, {
      type: 'accepted',
      message: `You were accepted to "${proj?.title}"!`,
      page: 'projects',
    });
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'accepted' } : a));
  };

  const handleDeny = async (app, reason) => {
    await updateApplication(app.id, 'denied');
    const proj = projects.find(p => p.id === app.project_id);
    const reasonText = reason?.trim() || 'undisclosed';
    await addNotification(app.user_id, {
      type: 'denied',
      message: `Your application to "${proj?.title}" was not accepted. Reason: ${reasonText}`,
      page: 'projects',
    });
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'denied' } : a));
  };

  const filtered = useMemo(() => {
    const base = showMyProjects && currentUser
      ? projects.filter(p => p.ownerId === currentUser.id)
      : projects;
    const q = search.toLowerCase();
    return base.filter(p => {
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q)) ||
        p.skills?.some(s => s.toLowerCase().includes(q));
      const matchTag = activeTag === 'All' || p.tags?.includes(activeTag);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchSearch && matchTag && matchStatus;
    });
  }, [projects, search, activeTag, statusFilter, showMyProjects, currentUser]);

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div className="section-header">
        <h1 className="section-title">🔭 <span>Browse</span> Projects</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {currentUser && (
            <>
              <button
                className={`btn btn-sm ${showMyProjects ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowMyProjects(v => !v)}
              >
                Your Projects
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowAppsModal(true)}
                style={{ position: 'relative' }}
              >
                Applications
                {pendingCount > 0 && (
                  <span style={{ marginLeft: 6, background: '#E53E3E', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                    {pendingCount}
                  </span>
                )}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('post-project')}>
                + Post a Project
              </button>
            </>
          )}
          <span style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="input search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, tags, skills, or description..."
        />
      </div>

      {/* Tag chips */}
      <div className="tags" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <span
            key={cat}
            className={`tag tag-filter ${activeTag === cat ? 'active' : ''}`}
            onClick={() => setActiveTag(cat)}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Status filter */}
      <div className="filters-row">
        <span style={{ fontSize: '0.85rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Status:</span>
        {STATUSES.map(s => (
          <span
            key={s}
            className={`tag tag-filter ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{search || activeTag !== 'All' || statusFilter !== 'All' || showMyProjects ? '🔭' : '🚀'}</div>
          <p>
            {showMyProjects && !search && activeTag === 'All' && statusFilter === 'All'
              ? "You haven't posted any projects yet."
              : search || activeTag !== 'All' || statusFilter !== 'All'
              ? 'No projects match your filters. Try adjusting your search or tags.'
              : 'No projects yet — be the first to post one!'}
          </p>
          {(search || activeTag !== 'All' || statusFilter !== 'All' || showMyProjects) ? (
            <button className="btn btn-primary btn-sm" onClick={() => { setSearch(''); setActiveTag('All'); setStatusFilter('All'); setShowMyProjects(false); }}>
              Clear Filters
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('post-project')}>
              Post a Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              openPanel={openPanel}
              refreshData={refreshData}
              animClass="card-enter"
            />
          ))}
        </div>
      )}

      {showAppsModal && (
        <ApplicationsModal
          applications={applications}
          projects={projects}
          users={users}
          onClose={() => setShowAppsModal(false)}
          onAccept={handleAccept}
          onDeny={handleDeny}
        />
      )}
    </div>
  );
}
