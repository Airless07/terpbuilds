import { useState } from 'react';
import { loginUser } from '../utils/storage';

export default function Login({ navigate, setCurrentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      setCurrentUser(user);
      navigate('home');
    } catch (err) {
      console.error('Login error:', err);
      setError('No account found with that email or password.');
    } finally {
      setLoading(false);
    }
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
              placeholder="you@umd.edu" required autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-link">
          Don't have an account?{' '}
          <button onClick={() => navigate('signup')}>Sign up</button>
        </div>
      </div>
    </div>
  );
}
