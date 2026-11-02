// Server copy of the team list. Keep in step with config.js and firestore.rules.
// potentialLoud: true makes a "potential job" alert sound through silent mode too (once, no repeats).
module.exports = {
  TEAMS: {
    d0820:  { name: 'Day 08–20',   ackNeeded: 1, repeatSec: 60, potentialLoud: false },
    d1022a: { name: 'Day 10–22 A', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
    d1022b: { name: 'Day 10–22 B', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
    d1022c: { name: 'Day 10–22 C', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
    n2008:  { name: 'Night 20–08', ackNeeded: 2, repeatSec: 30, potentialLoud: false },
  },
  ALERT_EXPIRE_MIN: 15,      // stop repeating a confirmed-job alarm after this long, acknowledged or not
  POTENTIAL_EXPIRE_MIN: 120, // a potential job that is never confirmed or stood down clears after this long
};
