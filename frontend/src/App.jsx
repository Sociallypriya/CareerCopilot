import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthPage, LandingPage } from './AuthPages.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API = `${API_BASE}/api/applications`;
const STAGES = ['Applied', 'OA', 'Interview', 'Offer', 'Rejected', 'Ghosted'];
const SOURCES = ['Other', 'LinkedIn', 'Referral', 'Walk-in', 'Naukri', 'Company Site', 'Instagram'];
const CURRENCIES = { INR: { symbol: '₹', example: '₹12,00,000 / year' }, USD: { symbol: '$', example: '$120,000 / year' }, GBP: { symbol: '£', example: '£80,000 / year' }, EUR: { symbol: '€', example: '€90,000 / year' }, AED: { symbol: 'AED', example: 'AED 200,000 / year' }, SGD: { symbol: 'S$', example: 'S$120,000 / year' }, JPY: { symbol: '¥', example: '¥10,000,000 / year' }, AUD: { symbol: 'A$', example: 'A$120,000 / year' } };
const TIMEZONE_CURRENCY = { 'Asia/Kolkata': 'INR', 'America/Los_Angeles': 'USD', 'America/New_York': 'USD', 'Europe/London': 'GBP' };
const ACTIVE = ['Applied', 'OA', 'Interview'];
const blankForm = () => ({ company: '', role: '', stage: 'Applied', source: 'Other', location: '', appliedDate: new Date().toISOString().slice(0, 10), followUpDate: '', deadline: '', jobUrl: '', resumeVersionUsed: '', ctcDiscussed: '', ctcCurrency: 'INR', initialNote: '' });

async function request(path = '', options = {}) {
  const token = localStorage.getItem('careerCopilotToken');
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, ...options });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { localStorage.removeItem('careerCopilotToken'); window.location.href = '/login'; }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
async function requestSettings(options = {}) {
  const token = localStorage.getItem('careerCopilotToken');
  const response = await fetch(`${API_BASE}/api/settings`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { localStorage.removeItem('careerCopilotToken'); window.location.href = '/login'; }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
const escapeDate = (value, timezone = 'Asia/Kolkata') => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone }).format(new Date(value)) : '—';
const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : '';
const initials = value => String(value || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const dueNow = app => app.followUpDate && !app.reminderAcknowledged && new Date(app.followUpDate) <= new Date(new Date().setHours(23, 59, 59, 999)) && !['Rejected', 'Offer', 'Ghosted'].includes(app.stage);

function Dashboard({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [emailResult, setEmailResult] = useState(null);
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState({ profileName: '', profileEmail: '', workspaceName: 'My workspace', timezone: 'Asia/Kolkata', currency: 'INR' });
  const [settingsForm, setSettingsForm] = useState({ profileName: '', profileEmail: '', workspaceName: 'My workspace', timezone: 'Asia/Kolkata', currency: 'INR' });
  const [settingsScreen, setSettingsScreen] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const notify = useCallback((message, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3200);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, reminders, savedSettings] = await Promise.all([request(), request('/reminders/due'), requestSettings()]);
      setApplications(apps); setDueReminders(reminders); setSettings(savedSettings);
    } catch (error) { notify(error.message || 'Could not connect to the API. Check that the backend is running.', true); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutsideClick = event => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);

  const dueIds = useMemo(() => new Set(dueReminders.map(item => item._id)), [dueReminders]);
  const dueCount = applications.filter(app => dueIds.has(app._id) || dueNow(app)).length;
  const salaryCurrency = CURRENCIES[settings.currency] || CURRENCIES.INR;
  const nextMove = useMemo(() => {
    if (dueReminders.length) return { type: 'due', application: dueReminders[0] };
    const upcoming = applications
      .filter(app => app.followUpDate && !app.reminderAcknowledged && new Date(app.followUpDate) > new Date() && !['Rejected', 'Offer', 'Ghosted'].includes(app.stage))
      .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))[0];
    if (upcoming) return { type: 'upcoming', application: upcoming };
    const active = applications.find(app => ACTIVE.includes(app.stage));
    if (active) return { type: 'set-follow-up', application: active };
    return { type: 'empty', application: null };
  }, [applications, dueReminders]);
  const visible = useMemo(() => {
    let list = view === 'reminders' ? dueReminders : applications;
    if (stageFilter) list = list.filter(app => app.stage === stageFilter);
    const query = search.trim().toLowerCase();
    if (query) list = list.filter(app => `${app.company} ${app.role} ${app.location || ''}`.toLowerCase().includes(query));
    return list;
  }, [applications, dueReminders, view, stageFilter, search]);

  function openCreate() { setForm({ ...blankForm(), ctcCurrency: settings.currency || 'INR' }); setEditingId(null); setFormError(''); setModal(true); }
  function openSettings(screen) { setSettingsForm({ ...settings }); setSettingsScreen(screen); setSettingsMenuOpen(false); }
  async function saveSettings(event) {
    event.preventDefault(); setBusy(true);
    try {
      const saved = await requestSettings({ method: 'PUT', body: JSON.stringify(settingsForm) });
      setSettings(saved); setSettingsScreen(null); notify('Settings saved');
    } catch (error) { notify(error.message || 'Could not save settings', true); }
    finally { setBusy(false); }
  }
  function openEdit(app) {
    setForm({ ...blankForm(), ...app, ctcCurrency: app.ctcCurrency || 'INR', appliedDate: dateInput(app.appliedDate), followUpDate: dateInput(app.followUpDate), deadline: dateInput(app.deadline), initialNote: '' });
    setEditingId(app._id); setFormError(''); setModal(true);
  }
  async function saveApplication(event) {
    event.preventDefault(); setBusy(true); setFormError('');
    const data = { ...form }; const initialNote = data.initialNote.trim(); delete data.initialNote;
    for (const key of ['appliedDate', 'followUpDate', 'deadline', 'jobUrl', 'location', 'resumeVersionUsed', 'ctcDiscussed']) if (!data[key]) delete data[key];
    try {
      const saved = await request(editingId ? `/${editingId}` : '', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(data) });
      if (!editingId && initialNote) await request(`/${saved._id}/notes`, { method: 'POST', body: JSON.stringify({ text: initialNote }) });
      setModal(false); notify(editingId ? 'Application updated' : 'Application added'); await load();
      if (drawer?._id === saved._id) setDrawer(saved);
    } catch (error) { setFormError(error.message); }
    finally { setBusy(false); }
  }
  async function openDetails(id) {
    try { const app = await request(`/${id}`); setDrawer(app); setEmail(''); setEmailResult(null); setNote(''); }
    catch (error) { notify(error.message, true); }
  }
  async function changeStage(stage) {
    try { const updated = await request(`/${drawer._id}`, { method: 'PUT', body: JSON.stringify({ stage }) }); setDrawer(updated); notify('Stage updated'); await load(); }
    catch (error) { notify(error.message, true); }
  }
  async function acknowledgeReminder() {
    try { const updated = await request(`/${drawer._id}`, { method: 'PUT', body: JSON.stringify({ reminderAcknowledged: true }) }); setDrawer(updated); notify('Follow-up marked handled'); await load(); }
    catch (error) { notify(error.message, true); }
  }
  async function addNote(event) {
    event.preventDefault(); if (!note.trim()) return;
    try { setDrawer(await request(`/${drawer._id}/notes`, { method: 'POST', body: JSON.stringify({ text: note.trim() }) })); setNote(''); notify('Note added'); }
    catch (error) { notify(error.message, true); }
  }
  async function analyzeEmail() {
    if (!email.trim()) { notify('Paste an email first', true); return; }
    setBusy(true);
    try { const result = await request(`/${drawer._id}/parse-email`, { method: 'POST', body: JSON.stringify({ rawText: email }) }); setDrawer(result.application); setEmailResult(result.extraction); notify('Email analyzed and application updated'); await load(); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  async function deleteApplication() {
    if (!window.confirm(`Delete the ${drawer.company} application?`)) return;
    try { await request(`/${drawer._id}`, { method: 'DELETE' }); setDrawer(null); notify('Application deleted'); await load(); }
    catch (error) { notify(error.message, true); }
  }

  const activeView = view === 'reminders';
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">C</span><span>career<span className="brand-light">copilot</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={`nav-link ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}><span className="nav-icon">▦</span> All applications <span className="nav-count">{applications.length}</span></button>
        <button className={`nav-link ${activeView ? 'active' : ''}`} onClick={() => setView('reminders')}><span className="nav-icon">◷</span> Follow-ups <span className="nav-count alert-count">{dueCount || ''}</span></button>
      </nav>
      <div className="sidebar-bottom"><button type="button" className="help-card" onClick={() => { if (nextMove.type === 'due') { setSearch(''); setStageFilter(''); setView('reminders'); } else if (nextMove.type === 'upcoming') openDetails(nextMove.application._id); else if (nextMove.type === 'set-follow-up') openEdit(nextMove.application); else openCreate(); }}><span className="help-spark">{nextMove.type === 'due' ? '◷' : '✦'}</span><strong>{nextMove.type === 'due' ? 'A follow-up is due' : nextMove.type === 'upcoming' ? 'Your next follow-up' : nextMove.type === 'set-follow-up' ? 'Keep an opportunity moving' : 'Start your job search'}</strong><p>{nextMove.type === 'due' ? `Check in with ${nextMove.application.company} about ${nextMove.application.role}.` : nextMove.type === 'upcoming' ? `${nextMove.application.company} · ${escapeDate(nextMove.application.followUpDate, settings.timezone)}` : nextMove.type === 'set-follow-up' ? `Set a follow-up date for ${nextMove.application.company}.` : 'Add your first application to start tracking next steps.'}</p><span className="help-link">{nextMove.type === 'due' ? 'Review follow-ups →' : nextMove.type === 'upcoming' ? 'View application →' : nextMove.type === 'set-follow-up' ? 'Set follow-up →' : 'Add application →'}</span></button><div className="user-chip"><div className="avatar">{initials(settings.profileName || user.name || 'P')}</div><div><strong>{settings.workspaceName}</strong><small>{settings.profileName || user.name}</small></div></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><span className="brand-mark mobile-brand-mark" aria-label="CareerCopilot">C</span><div className="breadcrumb">{settings.workspaceName}<span>/</span><strong>{activeView ? 'Follow-ups' : 'All applications'}</strong></div><div className="top-actions" ref={profileMenuRef}><span className="today-label">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: settings.timezone }).format(new Date())}</span><button className="icon-button" onClick={load} title="Refresh applications" aria-label="Refresh">↻</button><button type="button" className="avatar small-avatar profile-avatar-button" onClick={() => setProfileMenuOpen(open => !open)} title="Open profile menu" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileMenuOpen}>{initials(settings.profileName || user.name || 'P')}</button>{profileMenuOpen && <div className="profile-menu" role="menu"><div className="profile-menu-summary"><div className="profile-menu-avatar">{initials(settings.profileName || user.name || 'P')}</div><strong>{settings.profileName || user.name || 'Your profile'}</strong><small>{settings.profileEmail || user.email || ''}</small><button type="button" className="manage-profile" onClick={() => { setProfileMenuOpen(false); openSettings('profile'); }}>Manage profile</button></div><div className="profile-menu-section"><button type="button" role="menuitem" onClick={() => { setView('all'); setProfileMenuOpen(false); }}>▦ <span>All applications</span></button><button type="button" role="menuitem" onClick={() => { setView('reminders'); setProfileMenuOpen(false); }}>◷ <span>Follow-ups</span></button><button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); openSettings('workspace'); }}>⚙ <span>Workspace settings</span></button></div><div className="profile-menu-bottom"><button type="button" role="menuitem" onClick={onLogout}>↪ <span>Sign out</span></button></div></div>}</div></header>
      <section className="page-content">
        <div className="page-heading"><div><div className="eyebrow">YOUR JOB SEARCH, IN ONE PLACE</div><h1>{activeView ? 'Follow-ups' : 'Applications'}</h1><p className="page-subtitle">{activeView ? 'A timely follow-up can keep a good conversation moving.' : 'A clear view of every opportunity and what to do next.'}</p></div><button className="primary-button" onClick={openCreate} aria-label="Add application"><span className="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span className="button-label">Add application</span></button></div>
        <div className="stats-grid">
          <Stat label="Total applications" value={applications.length} foot="Across your job search" icon="▦" tone="lavender" />
          <Stat label="In progress" value={applications.filter(app => ACTIVE.includes(app.stage)).length} foot="Active opportunities" icon="↗" tone="blue" />
          <Stat label="Interviews" value={applications.filter(app => app.stage === 'Interview').length} foot="Moving to the next round" icon="◉" tone="peach" />
          <Stat label="Follow-ups due" value={dueCount} foot={dueCount ? 'A quick check-in goes a long way' : 'You’re all caught up'} icon="◷" tone="mint" />
        </div>
        <section className="board-card">
          <div className="board-header"><div><h2>{activeView ? 'Follow-ups due' : 'Your applications'} <span className="subtle-count">({visible.length})</span></h2><p>Track each step from application to offer.</p></div><div className="board-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Search companies or roles" /></label><div className="stage-dropdown"><button className="stage-dropdown-trigger" aria-haspopup="menu" aria-expanded={stageMenuOpen} onClick={() => setStageMenuOpen(open => !open)}>{stageFilter || 'All stages'} <span className="stage-chevron" aria-hidden="true" /></button>{stageMenuOpen && <div className="stage-dropdown-menu" role="menu">{['', ...STAGES].map(stage => <button key={stage || 'all'} role="menuitemradio" aria-checked={stageFilter === stage} className={stageFilter === stage ? 'selected' : ''} onClick={() => { setStageFilter(stage); setStageMenuOpen(false); }}>{stage || 'All stages'}{stageFilter === stage && <span aria-hidden="true">✓</span>}</button>)}</div>}</div><button className="filter-button" onClick={() => { setSearch(''); setStageFilter(''); setStageMenuOpen(false); }} title="Clear filters" aria-label="Clear filters">×</button></div></div>
          <div className="table-wrap"><table><thead><tr><th>COMPANY & ROLE</th><th>STAGE</th><th>APPLIED</th><th>FOLLOW-UP</th><th>SOURCE</th><th /></tr></thead><tbody>{visible.map((app, index) => {
            const due = dueIds.has(app._id) || dueNow(app);
            return <tr key={app._id}><td><div className="company-cell"><span className={`company-logo c${index % 4 + 1}`}>{initials(app.company)}</span><span className="company-copy"><strong>{app.company}</strong><small>{app.role}{app.location ? ` · ${app.location}` : ''}</small></span></div></td><td><span className={`stage-pill stage-${app.stage}`}>{app.stage}</span></td><td>{escapeDate(app.appliedDate, settings.timezone)}</td><td className={due ? 'followup-due' : ''}>{escapeDate(app.followUpDate, settings.timezone)}{due ? ' · due' : ''}</td><td>{app.source || 'Other'}</td><td><button className="row-more" onClick={() => openDetails(app._id)} aria-label={`Open ${app.company} details`}>···</button></td></tr>;
          })}</tbody></table>
            {loading ? <div className="loading-state">Loading your applications…</div> : !visible.length && <div className="empty-state"><div className="empty-art">✦</div><h3>{applications.length ? 'Nothing matches those filters' : 'No applications yet'}</h3><p>{applications.length ? 'Try a different search or stage.' : 'Add your first opportunity and keep your search organized.'}</p>{!applications.length && <button className="primary-button" onClick={openCreate}>＋ Add application</button>}</div>}
          </div><div className="table-footer"><span>{visible.length ? `Showing ${visible.length} application${visible.length === 1 ? '' : 's'}` : 'No applications to show'}</span><span>Changes sync automatically</span></div>
        </section><footer className="page-footer"><span>Made for the next chapter.</span><span>CareerCopilot <b>•</b> Keep going, you’ve got this.</span></footer>
      </section>
    </main>

    {settingsScreen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsScreen(null); }}><section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-header"><div><div className="eyebrow">PERSONALIZE YOUR TRACKER</div><h2 id="settings-title">{settingsScreen === 'profile' ? 'Profile' : 'Workspace settings'}</h2></div><button className="close-button" onClick={() => setSettingsScreen(null)} aria-label="Close">×</button></div><nav className="settings-tabs" aria-label="Settings sections"><button type="button" className={settingsScreen === 'profile' ? 'active' : ''} onClick={() => openSettings('profile')}>Profile</button><button type="button" className={settingsScreen === 'workspace' ? 'active' : ''} onClick={() => openSettings('workspace')}>Workspace</button></nav><form onSubmit={saveSettings}><div className="form-grid settings-fields">{settingsScreen === 'profile' ? <><Field label="Display name" wide><input autoFocus value={settingsForm.profileName} onChange={event => setSettingsForm({ ...settingsForm, profileName: event.target.value })} placeholder="Your name" /></Field><Field label="Email address" wide><input type="email" value={settingsForm.profileEmail} onChange={event => setSettingsForm({ ...settingsForm, profileEmail: event.target.value })} placeholder="you@example.com" /></Field></> : <><Field label="Workspace name" wide><input autoFocus required value={settingsForm.workspaceName} onChange={event => setSettingsForm({ ...settingsForm, workspaceName: event.target.value })} placeholder="My workspace" /></Field><Field label="Time zone" wide><select value={settingsForm.timezone} onChange={event => { const timezone = event.target.value; setSettingsForm(current => ({ ...current, timezone, ...(TIMEZONE_CURRENCY[timezone] ? { currency: TIMEZONE_CURRENCY[timezone] } : {}) })); }}>{[...new Set([settingsForm.timezone, 'Asia/Kolkata', 'UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London'])].map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></Field></>}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setSettingsScreen(null)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div></form></section></div>}

    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="eyebrow">OPPORTUNITY DETAILS</div><h2 id="modal-title">{editingId ? 'Edit application' : 'Add application'}</h2></div><button className="close-button" onClick={() => setModal(false)} aria-label="Close">×</button></div><form onSubmit={saveApplication}><div className="form-grid">
      <Field label="Company" wide required><input required value={form.company} onChange={event => setForm({ ...form, company: event.target.value })} placeholder="e.g. Linear" /></Field>
      <Field label="Role" wide required><input required value={form.role} onChange={event => setForm({ ...form, role: event.target.value })} placeholder="e.g. Product Designer" /></Field>
      <Field label="Stage"><select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>{STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></Field>
      <Field label="Source"><select value={form.source} onChange={event => setForm({ ...form, source: event.target.value })}>{SOURCES.map(source => <option key={source}>{source}</option>)}</select></Field>
      <Field label="Location"><input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} placeholder="City or remote" /></Field>
      <DateField label="Applied date" name="appliedDate" form={form} setForm={setForm} />
      <DateField label="Follow-up date" name="followUpDate" form={form} setForm={setForm} />
      <DateField label="Deadline" name="deadline" form={form} setForm={setForm} />
      <Field label="Job URL" wide><input type="url" value={form.jobUrl} onChange={event => setForm({ ...form, jobUrl: event.target.value })} placeholder="https://…" /></Field>
      <Field label="Resume version"><input value={form.resumeVersionUsed} onChange={event => setForm({ ...form, resumeVersionUsed: event.target.value })} placeholder="e.g. Product v3" /></Field>
      <Field label={`CTC discussed (${(CURRENCIES[form.ctcCurrency] || salaryCurrency).symbol} / year)`}><div className="ctc-input-row"><input value={form.ctcDiscussed} onChange={event => setForm({ ...form, ctcDiscussed: event.target.value })} placeholder={`Amount in ${form.ctcCurrency} / year`} /><select aria-label="Salary currency" value={form.ctcCurrency} onChange={event => setForm({ ...form, ctcCurrency: event.target.value })}>{Object.entries(CURRENCIES).map(([code, item]) => <option value={code} key={code}>{code} ({item.symbol})</option>)}</select></div></Field>
      <Field label="Initial note" wide><textarea rows="3" value={form.initialNote} onChange={event => setForm({ ...form, initialNote: event.target.value })} placeholder="Anything you want to remember…" /></Field>
    </div><div className="form-error">{formError}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save application'}</button></div></form></section></div>}

    {drawer && <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDrawer(null); }}><aside className="detail-drawer" role="dialog" aria-modal="true" aria-label="Application details"><div className="drawer-content">
      <div className="drawer-top"><span className="eyebrow">APPLICATION DETAILS</span><button className="close-button" onClick={() => setDrawer(null)} aria-label="Close">×</button></div>
      <div className="drawer-company"><span className="company-logo">{initials(drawer.company)}</span><div><h2>{drawer.company}</h2><p>{drawer.role}{drawer.location ? ` · ${drawer.location}` : ''}</p></div></div>
      <div className="detail-grid"><Detail label="Applied">{escapeDate(drawer.appliedDate, settings.timezone)}</Detail><Detail label="Source">{drawer.source || 'Other'}</Detail><Detail label="Follow-up">{escapeDate(drawer.followUpDate, settings.timezone)}</Detail><Detail label="Deadline">{escapeDate(drawer.deadline, settings.timezone)}</Detail><Detail label="Resume version">{drawer.resumeVersionUsed || '—'}</Detail><Detail label={`CTC discussed (${(CURRENCIES[drawer.ctcCurrency || 'INR'] || CURRENCIES.INR).symbol} / year)`}>{drawer.ctcDiscussed || '—'}</Detail>{drawer.jobUrl && <Detail label="Job listing" wide><a href={drawer.jobUrl} target="_blank" rel="noreferrer">Open job post ↗</a></Detail>}</div>
      {dueNow(drawer) && <button className="primary-button compact-button" onClick={acknowledgeReminder} style={{ marginTop: 13, width: '100%' }}>✓ Mark follow-up handled</button>}
      <section className="detail-section"><div className="detail-section-head"><h3>Application stage</h3><span>Updates sync instantly</span></div><select className="inline-stage" value={drawer.stage} onChange={event => changeStage(event.target.value)} aria-label="Application stage">{STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></section>
      <section className="detail-section"><div className="detail-section-head"><h3>Recruiter email assistant</h3><span>Gemini powered</span></div><div className="email-box"><p>Paste an email to summarize it and detect a stage or follow-up date.</p><textarea value={email} onChange={event => setEmail(event.target.value)} placeholder="Paste the recruiter’s message here…" /><div className="email-actions"><small>Review the extracted details before relying on them.</small><button className="primary-button compact-button" disabled={busy} onClick={analyzeEmail}>{busy ? 'Analyzing…' : '✦ Analyze email'}</button></div>{emailResult && <div className="summary-box"><strong>Email summary</strong><br />{emailResult.summary || 'No summary returned.'}{emailResult.stageDetected && <><br /><br />Detected stage: <b>{emailResult.stageDetected}</b></>}{emailResult.suggestedFollowUpDate && <><br />Suggested follow-up: <b>{escapeDate(emailResult.suggestedFollowUpDate, settings.timezone)}</b></>}</div>}</div></section>
      <section className="detail-section"><div className="detail-section-head"><h3>Notes</h3><span>{drawer.notes?.length || 0} {(drawer.notes?.length || 0) === 1 ? 'note' : 'notes'}</span></div><div className="note-list">{drawer.notes?.length ? [...drawer.notes].reverse().map((item, index) => <article className="note-item" key={`${item.createdAt}-${index}`}><p>{item.text}</p><time>{escapeDate(item.createdAt, settings.timezone)}</time></article>) : <span className="no-notes">No notes yet. Keep a detail for later.</span>}</div><form className="note-composer" onSubmit={addNote}><textarea required value={note} onChange={event => setNote(event.target.value)} placeholder="Add a note…" /><button className="primary-button compact-button">Add note</button></form></section>
      <button className="secondary-button drawer-edit" onClick={() => openEdit(drawer)}>Edit application details</button><button className="drawer-delete" onClick={deleteApplication}>Delete application</button>
    </div></aside></div>}
    {toast && <div className="toast-region" aria-live="polite"><div className={`toast ${toast.error ? 'error' : ''}`}>{toast.message}</div></div>}
  </div>;
}

function Stat({ label, value, foot, icon, tone }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>; }
function Field({ label, wide, required, children }) { return <label className={wide ? 'wide' : ''}>{label} {required && <span className="required">*</span>}{children}</label>; }
function DateField({ label, name, form, setForm }) { return <Field label={label}><input type="date" value={form[name]} onChange={event => setForm({ ...form, [name]: event.target.value })} /></Field>; }
function Detail({ label, wide, children }) { return <div className="detail-field" style={wide ? { gridColumn: '1 / -1' } : undefined}><small>{label}</small><strong>{children}</strong></div>; }

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [auth, setAuth] = useState({ loading: true, user: null });

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    const token = localStorage.getItem('careerCopilotToken');
    if (!token) { setAuth({ loading: false, user: null }); return; }
    let active = true;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (!response.ok) throw new Error('Session expired');
        return response.json();
      })
      .then(data => { if (active) setAuth({ loading: false, user: data.user }); })
      .catch(() => { localStorage.removeItem('careerCopilotToken'); if (active) setAuth({ loading: false, user: null }); });
    return () => { active = false; };
  }, []);

  const navigate = destination => {
    window.history.pushState({}, '', destination);
    setPath(destination);
    window.scrollTo(0, 0);
  };
  const signedIn = data => {
    localStorage.setItem('careerCopilotToken', data.token);
    setAuth({ loading: false, user: data.user });
    navigate('/app');
  };
  const signOut = () => {
    localStorage.removeItem('careerCopilotToken');
    setAuth({ loading: false, user: null });
    navigate('/');
  };

  if (auth.loading) return <div className="auth-loading"><span className="brand-mark">C</span><span>Opening your workspace…</span></div>;
  if (path === '/app') return auth.user ? <Dashboard user={auth.user} onLogout={signOut} /> : <AuthPage mode="login" navigate={navigate} onSuccess={signedIn} />;
  if (path === '/login' || path === '/signup') return <AuthPage mode={path === '/signup' ? 'signup' : 'login'} navigate={navigate} onSuccess={signedIn} />;
  return <LandingPage navigate={navigate} user={auth.user} />;
}

export default App;
