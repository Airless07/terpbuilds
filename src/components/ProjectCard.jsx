import { updateProject, updateUser, timeAgo } from '../utils/storage';

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.replace(' ', '-')}`}>{status}</span>;
}

function SpotsBar({ filled, total }) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  return (
    <div className="spots-bar">
      <span>👥</span>
      <div className="spots-track"><div className="spots-fill" style={{ width: `${pct}%` }} /></div>
      <span>{filled}/{total}</span>
    </div>
  );
}

export default function ProjectCard({ project, currentUser, openPanel }) {
  const isTrending = (project.bookmarks + (project.applicants?.length || 0)) >= 10;
  const isSaved = currentUser?.savedProjects?.includes(project.id);

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;
    const adding = !isSaved;
    const newSaved = adding
      ? [...(currentUser.savedProjects || []), project.id]
      : (currentUser.savedProjects || []).filter(id => id !== project.id);
    await updateUser(currentUser.id, { savedProjects: newSaved });
    await updateProject(project.id, {
      bookmarks: Math.max(0, (project.bookmarks || 0) + (adding ? 1 : -1)),
    });
  };

  const filled = project.membersAccepted?.length || 1;

  return (
    <div className="card project-card card-enter" onClick={() => openPanel(project)}>
      <div className="project-card-header">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusBadge status={project.status} />
          {isTrending && <span className="status-badge status-Trending">🔥 Trending</span>}
        </div>
      </div>

      <h3 className="project-title">{project.title}</h3>
      <p className="project-desc">{project.description}</p>

      <div className="tags">
        {project.tags?.slice(0, 4).map(t => <span key={t} className="tag">#{t}</span>)}
      </div>

      <div className="project-meta">
        <span>👤 {project.ownerName}</span>
        <span>📅 {timeAgo(project.createdAt)}</span>
      </div>

      <SpotsBar filled={filled} total={project.teamSize} />

      <div className="project-card-footer">
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleSave}
          style={{ color: isSaved ? 'var(--maize)' : 'var(--text3)', fontSize: '1rem' }}
        >
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openPanel(project); }}>
          Apply →
        </button>
      </div>
    </div>
  );
}
