// Service settings: one block per service. Read by both the app and the server.
// Each deployment chooses its block with `profile` in config.js (app) and ACCTS_PROFILE in functions/.env (server).
//
// Team fields:
//   id            short code, lower case letters, numbers and dashes (don't change once in use)
//   name          as shown to staff
//   start, end    shift times "HH:MM". Leave both out for a team people can sign on to at any time (see shiftHours).
//   shiftHours    for teams without set times: how long a sign-on lasts (default 12)
//   ackNeeded     how many people must acknowledge a confirmed-job alarm
//   ackEachRole   true = instead, one person in each role on the team must acknowledge
//   repeatSec     how often an unacknowledged alarm repeats
//   potentialLoud true = potential-job alerts also sound through silent mode (once, no repeats)
(function (root) {
  const PROFILES = {
    'arcc-kss': {
      serviceName: 'ARCC KSS',
      // PLACEHOLDER: roles still to be confirmed.
      roles: ['Doctor', 'Practitioner', 'Nurse', 'Paramedic', 'Driver'],
      teams: [
        { id: 'd0820',  name: 'Day 08–20',   start: '08:00', end: '20:00', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
        { id: 'd1022a', name: 'Day 10–22 A', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
        { id: 'd1022b', name: 'Day 10–22 B', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
        { id: 'd1022c', name: 'Day 10–22 C', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60, potentialLoud: false },
        { id: 'n2008',  name: 'Night 20–08', start: '20:00', end: '08:00', ackNeeded: 2, repeatSec: 30, potentialLoud: false },
      ],
    },
    'access-london': {
      serviceName: 'ACCESS London',
      roles: ['Transfer Doctor', 'Transfer Practitioner'],
      // PLACEHOLDER: team names and shift times still to be confirmed. Without set times, staff can sign on at any time for 12 hours.
      teams: [
        { id: 'team-1', name: 'Team 1', shiftHours: 12, ackEachRole: true, repeatSec: 30, potentialLoud: false },
        { id: 'team-2', name: 'Team 2', shiftHours: 12, ackEachRole: true, repeatSec: 30, potentialLoud: false },
        { id: 'team-3', name: 'Team 3', shiftHours: 12, ackEachRole: true, repeatSec: 30, potentialLoud: false },
        { id: 'team-4', name: 'Team 4', shiftHours: 12, ackEachRole: true, repeatSec: 30, potentialLoud: false },
      ],
    },
  };
  for (const p of Object.values(PROFILES)) {
    p.alertExpireMin = p.alertExpireMin || 15;      // stop repeating a confirmed-job alarm after this long
    p.potentialExpireMin = p.potentialExpireMin || 120; // clear a potential job never confirmed or stood down
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = PROFILES;
  else root.ACCTS_PROFILES = PROFILES;
})(this);
