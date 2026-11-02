// Server copy of the team list. Keep in step with config.js and firestore.rules.
module.exports = {
  TEAMS: {
    d0820:  { name: 'Day 08–20',   ackNeeded: 1, repeatSec: 60 },
    d1022a: { name: 'Day 10–22 A', ackNeeded: 1, repeatSec: 60 },
    d1022b: { name: 'Day 10–22 B', ackNeeded: 1, repeatSec: 60 },
    d1022c: { name: 'Day 10–22 C', ackNeeded: 1, repeatSec: 60 },
    n2008:  { name: 'Night 20–08', ackNeeded: 2, repeatSec: 30 },
  },
  ALERT_EXPIRE_MIN: 15, // stop repeating after this long, acknowledged or not
};
