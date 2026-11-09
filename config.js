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

  // Which service this deployment is for. Teams, roles and alarm rules are in functions/profiles.js.
  // Must match ACCTS_PROFILE in functions/.env.  'arcc-kss' or 'access-london'
  profile: 'arcc-kss',

  earlySignOnMin: 60,   // people can start a shift up to this long before it begins
  lateFinishHours: 6,   // after the shift ends, a team can keep recording times on a running job for this long
  alertRedAfterMin: 3,  // dashboard turns red if an alarm isn't acknowledged within this time
};
