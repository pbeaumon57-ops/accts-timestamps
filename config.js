// Settings for your service. Paste your Firebase project's values below (Project settings → Your apps → Web app).
window.ACCTS_CONFIG = {
  firebase: {
    apiKey: 'PASTE_API_KEY',
    authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
    projectId: 'PASTE_PROJECT_ID',
    appId: 'PASTE_APP_ID',
  },
  // Sign-in names are team1@…, team2@…, team3@…, team4@… and lead@… on this domain.
  // No emails are ever sent to these addresses. Must match firestore.rules.
  accountDomain: '5beaumonts.com',
  teamNames: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
};
