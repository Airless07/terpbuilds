import { useState } from 'react';
import TagInput from '../components/TagInput';
import { signUpUser } from '../utils/storage';

export default function Signup({ navigate }) {
  const [form, setForm] = useState({
    displayName: '', email: '', password: '', confirm: '',
    github: '', linkedin: '', website: '',
  });
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      await signUpUser(form.email, form.password, {
        displayName: form.displayName,
        skills,
        github: form.github,
        linkedin: form.linkedin,
        website: form.website,
      });
      navigate('home');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('An account with this email already exists. Please log in instead.');
      } else if (msg.includes('invalid email') || msg.includes('valid email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('password') && msg.includes('6')) {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Account created! Please check your email to confirm your account, then sign in.');
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-box" style={{ maxWidth: 520 }}>
        <div className="auth-title">Join TerpBuilds 🐢</div>
        <div className="auth-sub">Create your account and start building.</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Display Name</label>
            <input className="input" value={form.displayName} onChange={e => set('displayName', e.target.value)}
              placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label>UMD Email</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="you@umd.edu" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label>Password</label>
              <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Min. 6 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                placeholder="Repeat password" required />
            </div>
          </div>
          <div className="form-group">
            <label>Skills</label>
            <TagInput tags={skills} onChange={setSkills} placeholder="Python, React, CAD... (Enter to add)" />
          </div>
          <div className="form-group">
            <label>GitHub URL</label>
            <input className="input" value={form.github} onChange={e => set('github', e.target.value)}
              placeholder="https://github.com/yourname" />
          </div>
          <div className="form-group">
            <label>LinkedIn URL</label>
            <input className="input" value={form.linkedin} onChange={e => set('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/yourname" />
          </div>
          <div className="form-group">
            <label>Personal Site</label>
            <input className="input" value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://yoursite.com" />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{' '}
          <button onClick={() => navigate('login')}>Sign in</button>
        </div>
      </div>
    </div>
  );
}
