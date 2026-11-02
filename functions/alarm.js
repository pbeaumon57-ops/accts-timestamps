// New-job alarm logic: who gets alerted, sending through Pushsafer, repeating until enough people acknowledge.
const crypto = require('crypto');
const { TEAMS, ALERT_EXPIRE_MIN, POTENTIAL_EXPIRE_MIN } = require('./teams');

const PUSHSAFER_URL = process.env.PUSHSAFER_URL || 'https://www.pushsafer.com/api';

async function settings(db) {
  const s = await db.doc('private/config').get();
  return s.exists ? s.data() : {};
}

// Send one Pushsafer message to one phone. loud = emergency priority (Critical Alert on iPhone).
// priority (optional) overrides the default: 1 = high (normal notification sound, respects silent mode).
async function pushsafer(cfg, deviceId, { title, message, loud, priority, url, urlTitle }) {
  if (!cfg.pushsaferKey) throw new Error('No Pushsafer key set on the dashboard');
  if (!deviceId) throw new Error('No Pushsafer device ID for this phone');
  const body = new URLSearchParams({ k: cfg.pushsaferKey, d: String(deviceId), t: title, m: message, l: '60' });
  if (loud) {
    body.set('pr', '2');
    body.set('v', String(cfg.vibration || 3));
    if (cfg.sound) body.set('s', String(cfg.sound));
  } else {
    body.set('pr', String(priority != null ? priority : 0));
  }
  if (url) { body.set('u', url); body.set('ut', urlTitle || 'Open'); }
  const r = await fetch(PUSHSAFER_URL, { method: 'POST', body });
  const text = await r.text();
  let j = {}; try { j = JSON.parse(text); } catch (e) {}
  if (!r.ok || j.status !== 1) throw new Error('Pushsafer: ' + (j.error || text.slice(0, 120) || r.status));
  return j;
}

function ackUrl(alertId, uid, token) {
  const base = process.env.ACK_BASE
    || `https://europe-west2-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/ack`;
  return `${base}?a=${encodeURIComponent(alertId)}&u=${encodeURIComponent(uid)}&t=${token}`;
}

// Put an alarm time on the team's board ("Alert sent", "Alert acknowledged"). Starts a job if the board is clear;
// leaves the board alone if the team is busy on a different job.
async function markBoard(db, team, alertId, stage, time) {
  const ref = db.doc('teams/' + team);
  await db.runTransaction(async (tx) => {
    const cur = ((await tx.get(ref)).data() || {}).current || null;
    const busy = cur && (cur.started || Object.keys(cur.tap || {}).length || Object.keys(cur.fix || {}).length);
    if (busy && cur.alertId !== alertId) return;
    const prev = cur && cur.tap && cur.tap[stage] && cur.tap[stage].alarm;
    if (prev && prev <= time) return;
    const current = busy ? { tap: { [stage]: { alarm: time } } }
      : { id: 'j' + time.toString(36), started: time, alertId, tap: { [stage]: { alarm: time } } };
    tx.set(ref, { current }, { merge: true });
  });
}

const ackCount = (a) => Object.keys(a.acks || {}).filter((u) => a.targets && a.targets[u]).length;

function alarmText(a, team) {
  if (a.status === 'potential') {
    return {
      title: 'POSSIBLE JOB – ' + team.name,
      message: 'Get ready. Not confirmed yet. Tap SEEN to let the team lead know.',
      loud: !!team.potentialLoud, priority: 1, urlTitle: 'SEEN',
    };
  }
  const got = ackCount(a);
  return {
    title: 'NEW JOB – ' + team.name,
    message: a.needed > 1
      ? `Acknowledge now. ${got} of ${a.needed} people have responded.`
      : 'Acknowledge now.',
    loud: true,
    urlTitle: 'ACKNOWLEDGE',
  };
}

// Send the alarm to everyone on the list who hasn't acknowledged and is due a repeat.
async function sendDue(db, ref, a, tokens, cfg, now, force) {
  const team = TEAMS[a.team];
  const lastSent = { ...(a.lastSent || {}) };
  const errors = {};
  let sent = 0;
  await Promise.all(Object.entries(a.targets || {}).map(async ([uid, t]) => {
    if (a.acks && a.acks[uid]) return;
    if (!force && now - (lastSent[uid] || 0) < team.repeatSec * 1000 - 3000) return;
    try {
      await pushsafer(cfg, t.pushId, { ...alarmText(a, team), url: ackUrl(ref.id, uid, tokens[uid]) });
      lastSent[uid] = now; sent++;
    } catch (e) { errors[uid] = String(e.message || e).slice(0, 200); }
  }));
  const upd = { lastSent, sends: (a.sends || 0) + sent };
  if (Object.keys(errors).length) upd.errors = errors;
  await ref.update(upd);
  return sent;
}

// A new alert from the dashboard: work out who is on duty for the team now, then send to all of them.
async function startAlert(db, ref, now = Date.now()) {
  const a = (await ref.get()).data();
  const team = TEAMS[a.team];
  if (!team) { await ref.update({ status: 'error', note: 'Unknown team' }); return; }
  const duty = await db.collection('duty').where('team', '==', a.team).get();
  const people = duty.docs.map((d) => d.data()).filter((d) => d.until > now);
  const targets = {}; const tokens = {};
  for (const p of people) {
    const dev = await db.doc('devices/' + p.uid).get();
    if (!dev.exists) continue;
    targets[p.uid] = { name: dev.data().name || p.name || 'Unknown', pushId: dev.data().pushId || '' };
    tokens[p.uid] = crypto.randomBytes(16).toString('hex');
  }
  const n = Object.keys(targets).length;
  if (!n) {
    await ref.update({ status: 'no_one', targets: {}, needed: 0, endedAt: now, note: 'Nobody is on duty for this team' });
    return;
  }
  const potential = a.level === 'potential';
  const needed = potential ? 0 : Math.min(team.ackNeeded, n);
  const status = potential ? 'potential' : 'active';
  await ref.collection('private').doc('tokens').set(tokens);
  const fields = { targets, needed, acks: {}, lastSent: {}, status, startedAt: now, teamName: team.name, repeatSec: team.repeatSec, sends: 0 };
  if (!potential && a.seen === undefined && a.acks && Object.keys(a.acks).length) fields.seen = a.acks; // keep who saw the potential job
  await ref.update(fields);
  if (!potential) await markBoard(db, a.team, ref.id, 'alerted', now);
  await sendDue(db, ref, { ...a, ...fields }, tokens, await settings(db), now, true);
}

// Runs every minute (and again 30 s later for teams that repeat every 30 s).
async function repeatAlerts(db, now = Date.now()) {
  const q = await db.collection('alerts').where('status', 'in', ['active', 'potential']).get();
  if (q.empty) return { active: 0, fast: false };
  const cfg = await settings(db);
  let fast = false;
  for (const doc of q.docs) {
    const a = doc.data();
    if (a.status === 'potential') { // sent once only; just clear it eventually
      if (now - (a.startedAt || a.createdAt) > POTENTIAL_EXPIRE_MIN * 60000) await doc.ref.update({ status: 'expired', endedAt: now });
      continue;
    }
    if (now - (a.startedAt || a.createdAt) > ALERT_EXPIRE_MIN * 60000) {
      await doc.ref.update({ status: 'expired', endedAt: now });
      continue;
    }
    const tokens = (await doc.ref.collection('private').doc('tokens').get()).data() || {};
    await sendDue(db, doc.ref, a, tokens, cfg, now, false);
    if (TEAMS[a.team] && TEAMS[a.team].repeatSec < 60) fast = true;
  }
  return { active: q.size, fast };
}

// After any change: if enough people have acknowledged, stop and tell the others. Tell everyone if cancelled.
async function afterChange(db, ref, before, after, now = Date.now()) {
  if (!after) return;
  const cfg = () => settings(db);
  const quiet = async (a, message) => {
    const c = await cfg();
    await Promise.all(Object.entries(a.targets || {}).filter(([u]) => !(a.acks && a.acks[u]))
      .map(([, t]) => pushsafer(c, t.pushId, { title: (a.teamName || 'ACCTS'), message, loud: false }).catch(() => {})));
  };
  // Team lead upgraded a potential job to confirmed: start the full alarm.
  if (before && before.status === 'potential' && after.status === 'new' && after.level === 'confirmed') {
    await startAlert(db, ref, now);
    return;
  }
  // First acknowledgement of a confirmed alarm goes on the board as "Alert acknowledged".
  if (['active', 'acknowledged'].includes(after.status) && after.level !== 'potential') {
    const times = Object.entries(after.acks || {}).filter(([u]) => after.targets && after.targets[u]).map(([, t]) => t);
    const beforeN = before ? Object.keys(before.acks || {}).length : 0;
    if (times.length && times.length !== beforeN) await markBoard(db, after.team, ref.id, 'acked', Math.min(...times));
  }
  if (after.status === 'active' && after.needed && ackCount(after) >= after.needed) {
    await ref.update({ status: 'acknowledged', ackedAt: now, endedAt: now });
    const names = Object.keys(after.acks).filter((u) => after.targets[u]).map((u) => after.targets[u].name);
    await quiet(after, 'Acknowledged by ' + names.join(', ') + '. No need to respond.');
    return;
  }
  if (before && before.status === 'active' && after.status === 'cancelled') {
    await quiet(after, 'Job alert cancelled by the team lead.');
  }
  if (before && before.status === 'potential' && after.status === 'cancelled') {
    const c = await cfg();
    await Promise.all(Object.values(after.targets || {}).map((t) =>
      pushsafer(c, t.pushId, { title: after.teamName || 'ACCTS', message: 'Possible job stood down. No job.', loud: false }).catch(() => {})));
  }
}

// One-tap acknowledge from the link in the alarm. Returns a simple page.
async function ackByLink(db, q, now = Date.now()) {
  const { a, u, t } = q;
  if (!a || !u || !t) return [400, 'This link is incomplete.'];
  const ref = db.collection('alerts').doc(String(a));
  const tok = (await ref.collection('private').doc('tokens').get()).data() || {};
  const ok = tok[u] && tok[u].length === String(t).length && crypto.timingSafeEqual(Buffer.from(tok[u]), Buffer.from(String(t)));
  if (!ok) return [403, 'This link is not valid.'];
  const snap = await ref.get(); const al = snap.data();
  if (!al.acks || !al.acks[u]) {
    if (['active', 'acknowledged', 'potential'].includes(al.status)) await ref.update({ ['acks.' + u]: now });
  }
  const who = (al.targets[u] && al.targets[u].name) || '';
  if (al.status === 'potential') return [200, `Seen${who ? ', ' + who : ''}. Possible job for ${al.teamName}, not confirmed yet. You'll get a loud alarm if it's confirmed.`];
  if (al.status === 'cancelled') return [200, 'This job was stood down. No job.'];
  return [200, `Acknowledged${who ? ', ' + who : ''}. New job for ${al.teamName}. The team lead can see your response.`];
}

module.exports = { pushsafer, settings, startAlert, repeatAlerts, afterChange, ackByLink, ackCount };
