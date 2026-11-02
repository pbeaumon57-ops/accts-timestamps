// Shared by the phone app (index.html) and the team lead dashboard (lead.html).
(() => {
  const CFG = window.ACCTS_CONFIG;

  // Edit this list to change the stage buttons. Order matters for "next stage".
  // auto: filled in by the team lead's alarm, not a button for the team.
  const STAGES = [
    ['alerted',  'Alert sent', { auto: true }],
    ['acked',    'Alert acknowledged'],
    ['mobile',   'Mobile to sending hospital'],
    ['arr_send', 'Arrived sending hospital'],
    ['bedside',  'Arrived bedside'],
    ['left_bed', 'Left bedside'],
    ['in_amb',   'Patient in ambulance'],
    ['dep_send', 'Departed sending hospital'],
    ['arr_recv', 'Arrived receiving hospital'],
    ['arr_unit', 'Arrived receiving unit'],
    ['handover', 'Handover complete'],
    ['clear',    'Team clear'],
    ['base',     'Back at base'],
  ];
  const INTERVALS = [
    ['Alert to acknowledged',  'alerted', 'acked'],
    ['Acknowledged to mobile', 'acked',   'mobile'],
    ['Travel to sending',    'mobile',   'arr_send'],
    ['At sending hospital',  'arr_send', 'dep_send'],
    ['Bedside time',         'bedside',  'left_bed'],
    ['Road transfer',        'dep_send', 'arr_recv'],
    ['Left bedside to unit', 'left_bed', 'arr_unit'],
    ['Alert to handover',    'alerted', 'handover'],
    ['Total job',            'alerted', 'base'],
  ];
  const NAME = Object.fromEntries(STAGES.map(([id, name]) => [id, name]));
  const AUTO = new Set(STAGES.filter((s) => s[2] && s[2].auto).map((s) => s[0]));
  const TEAMS = CFG.teams;
  const TEAM = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

  const pad = (n) => String(n).padStart(2, '0');
  const hm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const hms = (t) => { const d = new Date(t); return hm(t) + ':' + pad(d.getSeconds()); };
  const day = (t) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const dur = (ms) => {
    if (ms == null || isNaN(ms)) return '—';
    const neg = ms < 0; const m = Math.round(Math.abs(ms) / 60000);
    const s = m >= 60 ? Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm' : m + 'm';
    return neg ? '−' + s : s;
  };
  const gap = (ms) => (ms >= 0 ? '+' : '') + dur(ms);
  const teamName = (id) => (TEAM[id] ? TEAM[id].name : id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- shifts ----------
  const at = (base, hhmm, addDays = 0) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(base); d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0); return d.getTime();
  };
  // The shift this team is working now, or is about to start (within the early sign-on period).
  function shiftWindow(team, now = Date.now()) {
    const early = (CFG.earlySignOnMin || 60) * 60000;
    for (const off of [-1, 0, 1]) {
      const s = at(now, team.start, off);
      let e = at(now, team.end, off); if (e <= s) e = at(now, team.end, off + 1);
      if (now >= s - early && now < e) return { start: s, end: e };
    }
    return null;
  }
  function nextStart(team, now = Date.now()) {
    const s = at(now, team.start); return s > now ? s : at(now, team.start, 1);
  }
  const lateMs = () => (CFG.lateFinishHours || 6) * 3600000;

  // ---------- job times ----------
  // Each phone's tap is stored separately (tap[stage][device] = time), so phones never overwrite each other
  // while offline. The earliest tap wins. A deliberate correction (fix[stage]) overrides taps.
  function stageTime(cur, id) {
    if (!cur) return null;
    const f = cur.fix && cur.fix[id];
    if (typeof f === 'number') return f;
    const taps = cur.tap && cur.tap[id];
    const v = taps ? Object.values(taps).filter((x) => typeof x === 'number') : [];
    return v.length ? Math.min(...v) : null;
  }
  function resolve(cur) {
    const out = {};
    if (!cur) return out;
    if (cur.stamps) Object.assign(out, cur.stamps);
    STAGES.forEach(([id]) => { const t = stageTime(cur, id); if (t != null) out[id] = t; });
    return out;
  }
  function latest(stamps) {
    let last = null;
    STAGES.forEach(([id]) => { if (stamps[id] != null) last = [id, stamps[id]]; });
    return last;
  }
  function nextStage(stamps) {
    let lastIdx = -1;
    STAGES.forEach(([id], i) => { if (stamps[id] != null) lastIdx = i; });
    const after = STAGES.find(([id], i) => i > lastIdx && stamps[id] == null && !AUTO.has(id));
    return after ? after[0] : null;
  }
  function intervals(stamps) {
    return INTERVALS.map(([label, a, b]) => {
      let from = stamps[a], to = stamps[b];
      if (label === 'Total job') { from = from ?? stamps.acked ?? stamps.mobile; to = to ?? stamps.clear; }
      return from != null && to != null ? [label, to - from] : null;
    }).filter(Boolean);
  }
  const jobStart = (stamps, cur) => {
    const v = Object.values(stamps);
    return v.length ? Math.min(...v) : (cur && cur.started) || null;
  };
  const isActive = (cur) => !!(cur && (cur.started || Object.keys(resolve(cur)).length));

  // ---------- Firebase ----------
  let auth, db, fns;
  function initFirebase() {
    firebase.initializeApp(CFG.firebase);
    auth = firebase.auth();
    db = firebase.firestore();
    fns = firebase.app().functions(CFG.functionsRegion);
    if (new URLSearchParams(location.search).has('emu')) {
      auth.useEmulator('http://localhost:9099', { disableWarnings: true });
      db.useEmulator('localhost', 8080);
      fns.useEmulator('localhost', 5001);
    }
    // Keep data on the device so the app works with no signal and sends changes when it returns.
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return { auth, db, fns };
  }
  const leadEmail = () => 'lead@' + CFG.accountDomain;
  const isLead = (user) => !!(user && user.email === leadEmail());
  const call = (name, data) => fns.httpsCallable(name)(data).then((r) => r.data);
  const teamDoc = (t) => db.collection('teams').doc(t);
  const jobsCol = (t) => teamDoc(t).collection('jobs');
  const dutyCol = () => db.collection('duty');
  const alertsCol = () => db.collection('alerts');
  const onDuty = (d, now = Date.now()) => d && d.until > now;

  // Close a running job: save its final times to the team's history and clear the board.
  async function finishJob(t, cur, by) {
    const stamps = resolve(cur);
    const id = cur.id || 'j' + Date.now().toString(36);
    const batch = db.batch();
    batch.set(jobsCol(t).doc(id), {
      id, team: t, stamps, started: jobStart(stamps, cur), finished: Date.now(), finishedBy: by || '',
    });
    batch.set(teamDoc(t), { current: null }, { merge: true });
    return batch.commit();
  }

  window.ACCTS = {
    CFG, STAGES, INTERVALS, NAME, AUTO, TEAMS, TEAM, pad, hm, hms, day, dur, gap, teamName, esc,
    shiftWindow, nextStart, lateMs, stageTime, resolve, latest, nextStage, intervals, jobStart, isActive,
    initFirebase, leadEmail, isLead, call, teamDoc, jobsCol, dutyCol, alertsCol, onDuty, finishJob,
  };
})();
