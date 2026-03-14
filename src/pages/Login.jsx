import { useState } from 'react';
import { getUsers, saveCurrentUser, checkPassword } from '../utils/storage';

export default function Login({ navigate, setCurrentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) { setError('No account found with that email.'); return; }
    if (!checkPassword(password, user.passwordEncoded)) { setError('Incorrect password.'); return; }
    saveCurrentUser(user);
    setCurrentUser(user);
    navigate('home');
  };

  return (
    <div className="auth-page">
      <div className="card auth-box">
        <div className="auth-title">Welcome back 🐢</div>
        <div className="auth-sub">Sign in to your TerpBuilds account.</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>UMD Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@umd.edu" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary w-full" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
            Sign In
          </button>
        </form>

        <div className="auth-link">
          Don't have an account?{' '}
          <button onClick={() => navigate('signup')}>Sign up</button>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text3)' }}>
          <strong>Demo:</strong> alexchen@umd.edu / password123
        </div>
      </div>
    </div>
  );
}
