import { useState } from 'react';
import { getProjects, saveProjects, getCurrentUser, saveCurrentUser,
  updateUserInStorage, timeAgo } from '../utils/storage';

function StatusBadge({ status }) {
  const cls = 'status-' + status.replace(' ', '-');
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

function SpotsBar({ filled, total }) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  return (
    <div className="spots-bar">
      <span>👥</span>
      <div className="spots-track">
        <div className="spots-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{filled}/{total}</span>
    </div>
  );
}

export default function ProjectCard({ project: initProject, currentUser, setCurrentUser, openPanel, refreshData, style, animClass }) {
  const [project, setProject] = useState(initProject);

  const isTrending = (project.bookmarks + project.applicants.length) >= 10;
  const isSaved = currentUser?.savedProjects?.includes(project.id);

  const toggleSave = (e) => {
    e.stopPropagation();
    const cu = getCurrentUser();
    if (!cu) return;
    const saved = cu.savedProjects || [];
    const next = saved.includes(project.id) ? saved.filter(id => id !== project.id) : [...saved, project.id];
    const updated = { ...cu, savedProjects: next };
    saveCurrentUser(updated);
    setCurrentUser(updated);

    // Update project bookmark count
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

  const filled = project.membersAccepted?.length || 1;

  return (
    <div
      className={`card project-card card-enter ${animClass || ''}`}
      style={style}
      onClick={() => openPanel(project)}
    >
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
          className={`btn btn-ghost btn-sm`}
          onClick={toggleSave}
          style={{ color: isSaved ? 'var(--maize)' : 'var(--text3)', fontSize: '1rem' }}
          title={isSaved ? 'Unsave' : 'Save'}
        >
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={(e) => { e.stopPropagation(); openPanel(project); }}
        >
          Apply →
        </button>
      </div>
    </div>
  );
}
