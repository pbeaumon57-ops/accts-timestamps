// Settings for your service. Paste your Firebase project's values below (Project settings → Your apps → Web app).
window.ACCTS_CONFIG = {
  firebase: {
    apiKey: 'PASTE_API_KEY',
    authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
    projectId: 'PASTE_PROJECT_ID',
    appId: 'PASTE_APP_ID',
  },
  functionsRegion: 'europe-west2',

  // The team lead signs in to the dashboard as lead@<this domain>. No emails are sent to it.
  accountDomain: '5beaumonts.com',

  // Teams by shift. If you change this list, change functions/teams.js and the team list in firestore.rules to match.
  // ackNeeded: how many people must acknowledge a new-job alarm. repeatSec: how often it repeats until then.
  teams: [
    { id: 'd0820',  name: 'Day 08–20',   start: '08:00', end: '20:00', ackNeeded: 1, repeatSec: 60 },
    { id: 'd1022a', name: 'Day 10–22 A', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60 },
    { id: 'd1022b', name: 'Day 10–22 B', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60 },
    { id: 'd1022c', name: 'Day 10–22 C', start: '10:00', end: '22:00', ackNeeded: 1, repeatSec: 60 },
    { id: 'n2008',  name: 'Night 20–08', start: '20:00', end: '08:00', ackNeeded: 2, repeatSec: 30 },
  ],
  earlySignOnMin: 60,   // people can start a shift up to this long before it begins
  lateFinishHours: 6,   // after the shift ends, a team can keep recording times on a running job for this long
  alertRedAfterMin: 3,  // dashboard turns red if an alarm isn't acknowledged within this time
};
