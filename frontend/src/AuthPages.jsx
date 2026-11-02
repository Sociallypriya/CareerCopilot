import { useState } from 'react';
import './auth.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function LandingPage({ navigate, user }) {
  return <main className="marketing-page">
    <header className="marketing-nav"><a className="brand" href="/" onClick={event => { event.preventDefault(); navigate('/'); }}><span className="brand-mark">C</span><span>career<span className="brand-light">copilot</span></span></a><nav>{user ? <button className="primary-button" onClick={() => navigate('/app')}>Open workspace <span>→</span></button> : <><a href="/login" onClick={event => { event.preventDefault(); navigate('/login'); }}>Sign in</a><button className="primary-button" onClick={() => navigate('/signup')}>Get started <span>→</span></button></>}</nav></header>
    <section className="hero-section"><div className="hero-copy"><div className="hero-kicker"><span>✦</span> A calmer way to job search</div><h1>Make your next move<br />with <em>confidence.</em></h1><p>Keep every application, interview, and follow-up in one thoughtful workspace. Spend less time keeping track and more time moving forward.</p><div className="hero-actions"><button className="primary-button hero-cta" onClick={() => navigate('/signup')}>Create your free account <span>→</span></button><button className="hero-secondary" onClick={() => navigate('/login')}>I already have an account</button></div><div className="hero-proof"><span className="proof-check">✓</span> Your search, organized from day one</div></div>
      <div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="preview-window"><div className="preview-top"><span className="preview-brand"><i>C</i> careercopilot</span><span className="preview-user">P</span></div><div className="preview-body"><div className="preview-eyebrow">YOUR JOB SEARCH</div><h3>Applications</h3><div className="preview-stats"><span><b>08</b><small>Applications</small></span><span><b>03</b><small>Interviews</small></span><span><b>02</b><small>Follow-ups</small></span></div><div className="preview-list"><div><i className="preview-dot dot-purple"/><span><b>Northstar</b><small>Product Designer</small></span><em>Interview</em></div><div><i className="preview-dot dot-blue"/><span><b>Goodwell</b><small>Product Manager</small></span><em>Applied</em></div><div><i className="preview-dot dot-orange"/><span><b>Form & Field</b><small>UX Researcher</small></span><em>Follow-up</em></div></div></div></div><div className="floating-note"><span>✦</span><div><b>One step at a time</b><small>Your next move is in view.</small></div></div><div className="floating-check">✓</div></div>
    </section>
    <section className="marketing-features"><div className="features-intro"><span>BUILT FOR THE IN-BETWEEN</span><h2>Keep the details.<br />Keep your momentum.</h2></div><article><div className="feature-icon lavender">▦</div><h3>One clear view</h3><p>Track roles, stages, dates, notes, and resume versions in one place.</p></article><article><div className="feature-icon mint">◷</div><h3>Follow up on time</h3><p>See upcoming check-ins so good conversations don’t go quiet.</p></article><article><div className="feature-icon peach">✦</div><h3>Make emails useful</h3><p>Turn recruiter updates into a quick summary and next steps.</p></article></section>
    <footer className="marketing-footer"><a className="brand" href="/" onClick={event => { event.preventDefault(); navigate('/'); }}><span className="brand-mark">C</span><span>career<span className="brand-light">copilot</span></span></a><span>A little more clarity for what comes next.</span><button onClick={() => navigate('/signup')}>Start your search →</button></footer>
  </main>;
}

export function AuthPage({ mode = 'login', navigate, onSuccess }) {
  const signup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/${signup ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(signup ? { name } : {}), email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not sign in. Please try again.');
      onSuccess(data);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-story"><a className="brand" href="/" onClick={event => { event.preventDefault(); navigate('/'); }}><span className="brand-mark">C</span><span>career<span className="brand-light">copilot</span></span></a><div className="auth-story-copy"><span className="hero-kicker"><span>✦</span> A calmer way to job search</span><h1>{signup ? 'Your next chapter starts with a clear view.' : 'Good to have you back.'}</h1><p>{signup ? 'Create a private workspace for your applications, interviews, and next steps.' : 'Pick up where you left off and keep every opportunity moving.'}</p><div className="auth-story-points"><span>✓ Track every application</span><span>✓ Stay on top of follow-ups</span><span>✓ Keep your notes in one place</span></div></div><div className="auth-story-footer">CareerCopilot <span>·</span> Built for what comes next.</div></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><button className="back-home" onClick={() => navigate('/')}>← Back to home</button><div className="auth-heading"><span className="eyebrow">{signup ? 'YOUR SEARCH, IN ONE PLACE' : 'WELCOME BACK'}</span><h2>{signup ? 'Create your account' : 'Sign in to CareerCopilot'}</h2><p>{signup ? 'It only takes a minute to get started.' : 'Enter your details to open your workspace.'}</p></div><form className="auth-form" onSubmit={submit}>
      {signup && <label>Your name<input autoComplete="name" required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Priya Kumari" /></label>}
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} value={password} onChange={event => setPassword(event.target.value)} placeholder={signup ? 'At least 8 characters' : 'Your password'} /></label>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} <span>→</span></button>
    </form><div className="auth-switch">{signup ? 'Already have an account?' : 'New to CareerCopilot?'} <button onClick={() => navigate(signup ? '/login' : '/signup')}>{signup ? 'Sign in' : 'Create an account'}</button></div><p className="auth-privacy">Your applications and profile are private to your account.</p></div></section>
  </main>;
}
