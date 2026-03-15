import { useState } from 'react';

export default function Feedback() {
  const [subject, setSubject] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !feedback.trim()) return;
    setStatus('sending');

    try {
      // EmailJS send — configure credentials in index.html
      // Replace serviceId, templateId, and publicKey with your EmailJS credentials
      // Template variables expected: {{subject}}, {{feedback}}, {{to_email}}
      await window.emailjs.send(
        window.EMAILJS_SERVICE_ID || 'service_2iwvvge',
        window.EMAILJS_TEMPLATE_FEEDBACK || 'template_d0jmsfa',
        {
          subject: subject,
          message: feedback,
          to_email: 'mohammou@umich.edu',
        }
      );
      setStatus('success');
      setSubject('');
      setFeedback('');
    } catch (err) {
      console.error('EmailJS error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', maxWidth: 600 }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Got a suggestion?
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '1.05rem' }}>We're listening. 🐢</p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
            <div style={{ color: 'var(--maize)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Feedback sent! Thanks for helping improve TerpBuilds.
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setStatus('idle')} style={{ marginTop: '1rem' }}>
              Send more feedback
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {status === 'error' && (
              <div className="alert alert-error">
                Failed to send feedback. Please try again or email us directly at mohammou@umich.edu
              </div>
            )}

            <div className="form-group">
              <label>Subject</label>
              <input
                className="input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What's on your mind?"
                required
              />
            </div>

            <div className="form-group">
              <label>Your Feedback</label>
              <textarea
                className="input"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Share your thoughts, ideas, bug reports, or feature requests..."
                style={{ minHeight: 160 }}
                required
              />
            </div>

            <button className="btn btn-primary w-full" type="submit" disabled={status === 'sending'}
              style={{ width: '100%' }}>
              {status === 'sending' ? 'Sending...' : '✉️ Send Feedback'}
            </button>

            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', textAlign: 'center', marginTop: '1rem' }}>
              Your feedback goes directly to the TerpBuilds team at UMD.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
