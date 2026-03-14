import { useState, useMemo } from 'react';
import ProjectCard from '../components/ProjectCard';

const CATEGORIES = ['All', 'ML', 'WebDev', 'Mobile', 'Robotics', 'Game Dev', 'Security', 'AI', 'Hardware', 'Design', 'Fullstack', 'Health', 'VR', 'Creative'];
const STATUSES = ['All', 'Recruiting', 'Active', 'In Progress', 'Completed'];

export default function Projects({ projects, currentUser, setCurrentUser, openPanel, refreshData, navigate }) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q)) ||
        p.skills?.some(s => s.toLowerCase().includes(q));
      const matchTag = activeTag === 'All' || p.tags?.includes(activeTag);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchSearch && matchTag && matchStatus;
    });
  }, [projects, search, activeTag, statusFilter]);

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div className="section-header">
        <h1 className="section-title">🔭 <span>Browse</span> Projects</h1>
        <span style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
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
          <div className="empty-icon">{search || activeTag !== 'All' || statusFilter !== 'All' ? '🔭' : '🚀'}</div>
          <p>
            {search || activeTag !== 'All' || statusFilter !== 'All'
              ? 'No projects match your filters. Try adjusting your search or tags.'
              : 'No projects yet — be the first to post one!'}
          </p>
          {(search || activeTag !== 'All' || statusFilter !== 'All') ? (
            <button className="btn btn-primary btn-sm" onClick={() => { setSearch(''); setActiveTag('All'); setStatusFilter('All'); }}>
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
          {filtered.map((p, i) => (
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
    </div>
  );
}
