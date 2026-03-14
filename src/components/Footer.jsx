export default function Footer({ navigate }) {
  return (
    <footer>
      <div className="footer-brand">🐢 TerpBuilds</div>
      <div className="footer-tagline">"Fear the Turtle. Build the Future."</div>
      <div style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        University of Maryland, College Park
      </div>
      <div className="footer-links">
        {['home','projects','post-project','friends','messages','profile','feedback'].map(p => (
          <button key={p} onClick={() => navigate(p)}>
            {p.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '1.5rem', color: 'var(--text3)', fontSize: '0.75rem' }}>
        © 2025 TerpBuilds · Built with ❤️ by Terps
      </div>
    </footer>
  );
}
