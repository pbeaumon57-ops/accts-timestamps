# ACCTS Timestamps – setup

- **Phone app:** `index.html`. Staff register their phone once, sign on to a team at the start of each shift, record stage times, and get new-job alarms.
- **Team lead dashboard:** `lead.html`. Shows the teams on shift, who's on duty, live times, and has the **New job alarm** button.
- **Server:** Firebase stores the data. Small server functions in `functions/` send and repeat the alarms through Pushsafer.

## 1. Firebase project

1. Go to <https://console.firebase.google.com> and choose **Create a project**. Name it `accts-timestamps`. Google Analytics can be turned off.
2. **Upgrade to the Blaze (pay-as-you-go) plan.** It's needed for the alarm functions. At your volumes the usage should stay inside Google's free allowance.
   - In Google Cloud Billing, set a **budget alert** (e.g. £5 a month) so you'd hear about any unexpected cost.
3. **Build → Authentication → Get started.** Under **Sign-in method**, turn on:
   - **Anonymous**, which phones use after registering with the join code
   - **Email/Password**, for the team lead
4. **Authentication → Users → Add user:** `lead@5beaumonts.com` with the team lead password. No emails are sent to this address.
5. **Authentication → Settings → Authorised domains → Add domain:** `pbeaumon57-ops.github.io`
6. **Build → Firestore Database → Create database.** Location: **europe-west2 (London)**. Start in **production mode**.
7. **Project settings (gear icon) → General → Your apps → Web (`</>`).** Register it as `ACCTS`. Copy `apiKey`, `authDomain`, `projectId` and `appId` into `config.js`, or send them to Claude to do it.

## 2. Let GitHub deploy the server parts

1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts> and select the `accts-timestamps` project.
2. **Create service account.** Name it `github-deploy` and give it these roles:
   - **Editor**
   - **Service Account User**
   - **Cloud Functions Admin**
   - **Firebase Admin**
3. Open the new account → **Keys → Add key → Create new key → JSON**. A file downloads. Keep it private.
4. In the GitHub repository: **Settings → Secrets and variables → Actions**.
   - **New repository secret:** name `FIREBASE_SERVICE_ACCOUNT`. Paste the whole contents of the JSON file.
   - **Variables tab → New repository variable:** name `FIREBASE_PROJECT_ID`, value your project ID.
   - Then delete the downloaded JSON file from your computer.
5. **Actions tab → Deploy Firebase → Run workflow.** This publishes the functions and database rules. If the first run fails with a permissions message about "Eventarc" or "service agent", wait 5 minutes and run it again. This is normal on a new project.

## 3. Website hosting (GitHub Pages)

In the repository: **Settings → Pages → Deploy from a branch → main → / (root) → Save**.

- Phones: `https://pbeaumon57-ops.github.io/accts-timestamps/`
- Dashboard: `https://pbeaumon57-ops.github.io/accts-timestamps/lead.html`

## 4. Team lead first sign-in

Open the dashboard, sign in, and open **Settings and registered phones**. Fill in each of these and press its **Save** button:

- **Join code:** at least 6 characters. Staff use it once to register their phone.
- **Pushsafer private key:** from your pushsafer.com account page.
- **Alarm sound number:** the Pushsafer sound you chose in your test. Leave it empty for the default.

## 5. Each staff member's iPhone (once)

1. Install **Pushsafer** from the App Store and sign in. Pushsafer → Settings → turn on **Critical Alerts** and allow it. Set the critical alert volume high.
   - All phones join one Pushsafer account, the service's. Each phone has its own **device ID**, shown in the app and on pushsafer.com under Devices.
2. Open the phone address above in **Safari → Share → Add to Home Screen**.
3. Open ACCTS from the home screen. Enter the join code, your name and your Pushsafer device ID.
4. Tap **Send me a test alarm** with the phone on silent to check it sounds.

## Day to day

- **Start of shift:** ACCTS → **Start your shift** → tap your team → **Start shift**. People can sign on up to 1 hour early. They come off duty automatically at the shift end.
  - A team still on a job can keep recording times for up to 6 hours after the shift ends, but gets no new alarms.
- **New job:** the team lead presses **New job alarm** on the team's panel.
  - It repeats every 60 s for day teams and every 30 s for the night team, until enough people acknowledge: 1 for day teams, 2 at night.
  - It stops after 15 minutes. The panel turns red if nobody has acknowledged within 3 minutes.
  - Staff acknowledge by tapping **ACKNOWLEDGE** in the alarm, or the red **NEW JOB** banner in ACCTS. The others then get a quiet "Acknowledged by …" message.
- **End of shift:** ACCTS → **End my shift**, or let it end automatically. The team lead can also sign people off, and can remove lost or replaced phones.

## Changing teams or shift times

Edit the team list in all three places so they match:

- `config.js`: names, hours, how many must acknowledge, repeat interval
- `functions/teams.js`: the same names, acknowledgements and repeat intervals
- `firestore.rules`: the list of team IDs

## Dashboard alerts for the team lead

While `lead.html` is open (a background tab is fine), every new or corrected time and every alarm response:

- plays a chime
- shows a desktop pop-up, if turned on
- highlights the team's panel
- adds an entry to **Latest updates**

Click the page once after opening it so the browser allows sound.
