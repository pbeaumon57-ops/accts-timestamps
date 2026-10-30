// Shared by the phone app (index.html) and the team lead dashboard (lead.html).
(() => {
  const CFG = window.ACCTS_CONFIG;

  // Edit this list to change the stage buttons. Order matters for "next stage".
  const STAGES = [
    ['referral', 'Referral accepted'],
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
    ['Referral to mobile',   'referral', 'mobile'],
    ['Travel to sending',    'mobile',   'arr_send'],
    ['At sending hospital',  'arr_send', 'dep_send'],
    ['Bedside time',         'bedside',  'left_bed'],
    ['Road transfer',        'dep_send', 'arr_recv'],
    ['Left bedside to unit', 'left_bed', 'arr_unit'],
    ['Referral to handover', 'referral', 'handover'],
    ['Total job',            'referral', 'base'],
  ];
  const NAME = Object.fromEntries(STAGES);
  const TEAMS = [1, 2, 3, 4];

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
  const teamName = (t) => (CFG.teamNames && CFG.teamNames[t - 1]) || 'Team ' + t;

  // A job stores each phone's tap separately (tap[stage][device] = time), so phones never overwrite
  // each other while offline. The earliest tap wins. A deliberate correction (fix[stage]) overrides taps.
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
    if (cur.stamps) Object.assign(out, cur.stamps); // finished jobs store plain times
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
    const after = STAGES.find(([id], i) => i > lastIdx && stamps[id] == null);
    return after ? after[0] : null;
  }
  function intervals(stamps) {
    return INTERVALS.map(([label, a, b]) => {
      let from = stamps[a], to = stamps[b];
      if (label === 'Total job') { from = from ?? stamps.mobile; to = to ?? stamps.clear; }
      return from != null && to != null ? [label, to - from] : null;
    }).filter(Boolean);
  }
  const jobStart = (stamps, cur) => {
    const v = Object.values(stamps);
    return v.length ? Math.min(...v) : (cur && cur.started) || null;
  };
  const isActive = (cur) => !!(cur && (cur.started || Object.keys(resolve(cur)).length));

  // ---------- Firebase ----------
  let app, auth, db;
  function initFirebase() {
    app = firebase.initializeApp(CFG.firebase);
    auth = firebase.auth();
    db = firebase.firestore();
    const emu = new URLSearchParams(location.search).has('emu');
    if (emu) { auth.useEmulator('http://localhost:9099', { disableWarnings: true }); db.useEmulator('localhost', 8080); }
    // Keep data on the device so the app works with no signal and sends changes when it returns.
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return { auth, db };
  }
  const emailFor = (role) => role + '@' + CFG.accountDomain;
  const roleOf = (user) => {
    if (!user || !user.email) return null;
    const local = user.email.split('@')[0];
    if (local === 'lead') return { lead: true };
    const m = /^team([1-4])$/.exec(local);
    return m ? { team: Number(m[1]) } : null;
  };
  const teamDoc = (t) => db.collection('teams').doc(String(t));
  const jobsCol = (t) => teamDoc(t).collection('jobs');

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
    CFG, STAGES, INTERVALS, NAME, TEAMS, pad, hm, hms, day, dur, gap, teamName,
    stageTime, resolve, latest, nextStage, intervals, jobStart, isActive,
    initFirebase, emailFor, roleOf, teamDoc, jobsCol, finishJob,
  };
})();
