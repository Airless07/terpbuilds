import { useState } from 'react';
import TagInput from '../components/TagInput';
import { getUsers, saveUsers, saveCurrentUser, encodePassword, generateId } from '../utils/storage';

export default function Signup({ navigate, setCurrentUser }) {
  const [form, setForm] = useState({
    displayName: '', email: '', password: '', confirm: '',
    github: '', linkedin: '', website: ''
  });
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!form.email.includes('@')) { setError('Please enter a valid email.'); return; }

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === form.email.toLowerCase())) {
      setError('An account with this email already exists.'); return;
    }

    const newUser = {
      id: generateId(),
      displayName: form.displayName,
      email: form.email,
      // NOTE: In production, use bcrypt or Argon2. Base64 is NOT secure password hashing.
      passwordEncoded: encodePassword(form.password),
      skills,
      github: form.github,
      linkedin: form.linkedin,
      website: form.website,
      trustScore: 0,
      ratings: [],
      friends: [],
      friendRequests: { sent: [], received: [] },
      following: [],
      followers: [],
      savedProjects: [],
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    saveCurrentUser(newUser);
    setCurrentUser(newUser);
    navigate('home');
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
          <button className="btn btn-primary w-full" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
            Create Account
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
