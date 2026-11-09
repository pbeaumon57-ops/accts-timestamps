const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const alarm = require('./alarm');

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west2', maxInstances: 5 });
const LEAD = 'lead@' + (process.env.ACCOUNT_DOMAIN || '5beaumonts.com');
const isLead = (req) => req.auth && req.auth.token && req.auth.token.email === LEAD;

// A phone joins the service with the join code, its owner's name and its Pushsafer device ID.
exports.register = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Not signed in');
  const { code, name, pushId } = req.data || {};
  const cfg = await alarm.settings(db);
  if (!cfg.joinCode) throw new HttpsError('failed-precondition', 'The team lead has not set a join code yet');
  if (String(code || '').trim().toLowerCase() !== String(cfg.joinCode).trim().toLowerCase()) throw new HttpsError('permission-denied', 'Wrong join code');
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) throw new HttpsError('invalid-argument', 'Enter your name');
  await db.doc('devices/' + req.auth.uid).set({ name: clean, pushId: String(pushId || '').trim().slice(0, 40), created: Date.now() });
  return { ok: true };
});

// A shared device (base PC, tablet) joins with a one-time set-up code made on the dashboard.
exports.registerShared = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Not signed in');
  const [ok, msg] = await alarm.registerShared(db, req.auth.uid, (req.data || {}).code);
  if (!ok) throw new HttpsError('permission-denied', msg);
  return { ok: true, name: msg };
});

// Send a test alarm: a phone to itself, or the team lead to any registered phone.
exports.testAlarm = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Not signed in');
  const uid = isLead(req) && req.data && req.data.uid ? String(req.data.uid) : req.auth.uid;
  const dev = await db.doc('devices/' + uid).get();
  if (!dev.exists) throw new HttpsError('not-found', 'Phone not registered');
  try {
    await alarm.pushsafer(await alarm.settings(db), dev.data().pushId, { title: 'ACCTS test alarm', message: 'This is how a new-job alarm will sound. No need to respond.', loud: true });
  } catch (e) { throw new HttpsError('unavailable', String(e.message || e)); }
  return { ok: true };
});

exports.alertCreated = onDocumentCreated('alerts/{id}', (e) => alarm.startAlert(db, e.data.ref));
exports.alertUpdated = onDocumentUpdated('alerts/{id}', (e) => alarm.afterChange(db, e.data.after.ref, e.data.before.data(), e.data.after.data()));

// Repeat unacknowledged alarms. Teams set to 30 s repeats get a second pass half way through the minute.
exports.repeatAlarms = onSchedule({ schedule: 'every 1 minutes', timeoutSeconds: 120 }, async () => {
  const r = await alarm.repeatAlerts(db);
  if (r.fast) { await new Promise((ok) => setTimeout(ok, 30000)); await alarm.repeatAlerts(db); }
});

const page = (msg, ok) => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACCTS</title>
<body style="margin:0;font:20px/1.4 -apple-system,system-ui,sans-serif;background:${ok ? '#0f3d2a' : '#3d1414'};color:#fff;display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center">
<div><div style="font-size:64px">${ok ? '✓' : '!'}</div><p>${msg}</p></div></body>`;
exports.ack = onRequest(async (req, res) => {
  try {
    const [code, msg] = await alarm.ackByLink(db, req.query);
    res.status(code).set('Cache-Control', 'no-store').send(page(msg, code === 200));
  } catch (e) { res.status(500).send(page('Could not record your response. Open the ACCTS app and tap Acknowledge.', false)); }
});

// Local testing only: run the repeat step on demand.
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  exports.devTick = onRequest(async (req, res) => res.json(await alarm.repeatAlerts(db, Date.now() + Number(req.query.ahead || 0))));
}
