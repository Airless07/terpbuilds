import { useState } from 'react';
import TagInput from '../components/TagInput';
import { addProject } from '../utils/storage';

const STATUSES = ['Recruiting', 'Active', 'In Progress', 'Completed'];

export default function PostProject({ currentUser, navigate }) {
  const [form, setForm] = useState({
    title: '', description: '', teamSize: 3, timeline: '', contact: currentUser?.email || '', status: 'Recruiting'
  });
  const [skills, setSkills] = useState([]);
  const [tags, setTags] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!currentUser) { navigate('login'); return; }
    if (!form.title.trim() || !form.description.trim()) return;
    setLoading(true);
    try {
      await addProject({
        ownerId: currentUser.id,
        ownerName: currentUser.displayName,
        title: form.title.trim(),
        description: form.description.trim(),
        skills,
        tags,
        teamSize: parseInt(form.teamSize) || 3,
        membersAccepted: [currentUser.id],
        status: form.status,
        timeline: form.timeline,
        contact: form.contact,
        bookmarks: 0,
        applicants: [],
        comments: [],
        announcements: [],
        updates: [],
        roomMessages: [],
        availability: { dateRange: null, slots: {} },
        fileLinks: [],
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => navigate('projects'), 2000);
    } catch (err) {
      console.error('Error posting project:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div className="alert alert-maize" style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚀</div>
          <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>Project Posted!</h3>
          <p>Your project is live. Redirecting to the feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: 720 }}>
      <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>🚀 Post a <span>Project</span></h1>
      <p style={{ color: 'var(--text2)', marginBottom: '2rem' }}>Share your idea and recruit your dream team.</p>

      <form onSubmit={submit} className="card" style={{ padding: '2rem' }}>
        <div className="form-group">
          <label>Project Title *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Give your project a catchy name" required />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea className="input" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="What are you building? What problem does it solve? Who's it for? What makes it interesting?" style={{ minHeight: 140 }} required />
        </div>

        <div className="form-group">
          <label>Skills Needed</label>
          <TagInput tags={skills} onChange={setSkills} placeholder="Python, React, CAD... (Enter to add)" />
        </div>

        <div className="form-group">
          <label>Category Tags</label>
          <TagInput tags={tags} onChange={setTags} placeholder="ML, WebDev, Robotics... (Enter to add)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Team Size</label>
            <input className="input" type="number" min={1} max={20} value={form.teamSize} onChange={e => set('teamSize', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Timeline</label>
          <input className="input" value={form.timeline} onChange={e => set('timeline', e.target.value)}
            placeholder="e.g. Spring 2025, 3 months, Year-long" />
        </div>

        <div className="form-group">
          <label>Contact Email</label>
          <input className="input" type="email" value={form.contact} onChange={e => set('contact', e.target.value)}
            placeholder="How should applicants reach you?" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Posting...' : '🚀 Post Project'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => navigate('projects')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
