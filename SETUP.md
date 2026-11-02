# ACCTS Timestamps – setup

Phone app: `index.html`. Team lead dashboard: `lead.html`. Shared times are stored in Google Firebase.

## 1. Create the Firebase project (about 10 minutes)

1. Go to <https://console.firebase.google.com>, sign in with a Google account, and choose **Create a project**. Name it `accts-timestamps`. Google Analytics can be turned off.
2. **Build → Authentication → Get started → Email/Password**: turn on the first switch and save.
3. **Authentication → Users → Add user**, five times. These are the sign-ins; no emails are sent to them.
   - `team1@5beaumonts.com`, `team2@5beaumonts.com`, `team3@5beaumonts.com`, `team4@5beaumonts.com`, each with that team's password
   - `lead@5beaumonts.com` with the team lead password
   - Passwords need at least 6 characters.
4. **Authentication → Settings → User actions** (if shown): untick **Enable create (sign-up)** so nobody else can make accounts.
5. **Authentication → Settings → Authorised domains → Add domain**: `pbeaumon57-ops.github.io`
6. **Build → Firestore Database → Create database**. Location: **europe-west2 (London)**. Start in **production mode**.
7. **Firestore Database → Rules**: replace everything with the contents of `firestore.rules`, then **Publish**.
8. **Project settings** (gear icon) **→ General → Your apps → Web (`</>`)**. Register the app as `ACCTS`; you don't need Firebase Hosting. Copy the four values `apiKey`, `authDomain`, `projectId` and `appId` into `config.js`.

The values in `config.js` aren't secret. Google designs them to sit in the web page, and access is controlled by the sign-ins and the rules in step 7.

## 2. Install on each iPhone

1. Open the app's web address in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the new icon, choose your team and enter the team password. A signal is needed for this first sign-in only.

## 3. Team lead dashboard

Open `lead.html` at the same address on any PC or tablet and sign in with the team lead password.

## Changing passwords or team names

- **Passwords:** Firebase console → Authentication → Users → ⋮ → Reset password.
- **Team names and the stage list:** edit `config.js` (team names) or `common.js` (stages).

## Alerts on the dashboard

While `lead.html` is open (a background tab is fine), every new or corrected time:
- plays a short chime
- shows a desktop pop-up, if you click **Turn on desktop pop-ups** and allow it
- highlights the row on that team's panel for 2 minutes
- adds an entry to **Latest updates**
- shows an unread count in the browser tab

Browsers only play sound after a click on the page, so click once after opening it. Use **Test alert** to check sound and pop-ups. Alerts can't arrive when the page is closed or the PC is asleep. Some Trust PCs block pop-ups; the sound and on-screen alerts still work.
