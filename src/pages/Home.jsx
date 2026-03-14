import { useMemo } from 'react';
import ProjectCard from '../components/ProjectCard';
import { timeAgo } from '../utils/storage';

export default function Home({ projects, currentUser, setCurrentUser, navigate, openPanel, refreshData }) {
  const trending = useMemo(() =>
    [...projects]
      .sort((a, b) => (b.bookmarks + b.applicants.length) - (a.bookmarks + a.applicants.length))
      .slice(0, 3),
    [projects]
  );

  const recommended = useMemo(() => {
    if (!currentUser?.skills?.length) return [];
    return projects
      .filter(p => p.ownerId !== currentUser.id && p.status !== 'Completed')
      .map(p => ({ ...p, score: p.tags?.filter(t => currentUser.skills.some(s => s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase()))).length || 0 }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [projects, currentUser]);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          Build Something <span className="accent">Real.</span>
        </h1>
        <p className="hero-sub">
          TerpBuilds connects UMD engineering and CS students with real project teams.
          Gain experience, grow your portfolio, and find your people — outside the classroom.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }} onClick={() => navigate('post-project')}>
            🚀 Post a Project
          </button>
          <button className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }} onClick={() => navigate('projects')}>
            🔭 Browse Projects
          </button>
        </div>
      </section>

      {/* Trending */}
      <section className="container page-section">
        <div className="section-header">
          <h2 className="section-title">🔥 <span>Trending</span> Right Now</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('projects')}>See all →</button>
        </div>
        <div className="hscroll-row">
          {trending.map(p => (
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
      </section>

      {/* Recommended */}
      {currentUser && (
        <section className="container page-section">
          <div className="section-header">
            <h2 className="section-title">✨ <span>Recommended</span> for You</h2>
          </div>
          {recommended.length > 0 ? (
            <div className="projects-grid">
              {recommended.map(p => (
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
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text3)', marginBottom: '1rem' }}>
                Add skills to your profile to get personalized project recommendations.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('profile')}>
                Update Profile →
              </button>
            </div>
          )}
        </section>
      )}

      {!currentUser && (
        <section className="container page-section">
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', borderColor: 'var(--maize)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🐢</div>
            <h3 style={{ fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>Ready to build something real?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Sign up to post projects, apply to teams, and connect with fellow Terps.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('signup')}>Get Started</button>
              <button className="btn btn-outline" onClick={() => navigate('login')}>Sign In</button>
            </div>
          </div>
        </section>
      )}

      {/* Why TerpBuilds */}
      <section className="container page-section">
        <div className="section-header">
          <h2 className="section-title">Why <span>TerpBuilds</span>?</h2>
        </div>
        <div className="why-grid">
          <div className="card why-card card-enter">
            <span className="why-icon">🛠️</span>
            <h3>Real Projects</h3>
            <p>Work on meaningful projects that solve actual problems and produce tangible results — not just homework assignments.</p>
          </div>
          <div className="card why-card card-enter">
            <span className="why-icon">📈</span>
            <h3>Grow Your Resume</h3>
            <p>Build a portfolio of collaborative work that impresses employers and demonstrates real-world engineering skills.</p>
          </div>
          <div className="card why-card card-enter">
            <span className="why-icon">🤝</span>
            <h3>Find Your People</h3>
            <p>Meet other ambitious Terps who share your passion — find the teammates, mentors, and friends you've been looking for.</p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="container" style={{ paddingBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
          {[
            { value: projects.length, label: 'Active Projects' },
            { value: projects.reduce((acc, p) => acc + (p.membersAccepted?.length || 0), 0), label: 'Team Members' },
            { value: projects.reduce((acc, p) => acc + (p.applicants?.length || 0), 0), label: 'Applications Submitted' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--maize)' }}>{s.value}</div>
              <div style={{ color: 'var(--text2)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
