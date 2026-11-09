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

- **Join code:** at least 6 characters. Staff use it once to register their phone. Once saved, its **QR code** appears below, with a printable poster.
- **Pushsafer private key:** from your pushsafer.com account page.
- **Alarm sound number:** the Pushsafer sound you chose in your test. Leave it empty for the default.

## 5. Each staff member's iPhone (once)

1. Install **Pushsafer** from the App Store and sign in. Pushsafer → Settings → turn on **Critical Alerts** and allow it. Set the critical alert volume high.
   - All phones join one Pushsafer account, the service's. Each phone has its own **device ID**, shown in the app and on pushsafer.com under Devices.
2. Open the phone address above in **Safari → Share → Add to Home Screen**.
3. Open ACCTS **from the Home Screen icon**, not Safari. Tap **Scan QR code** and scan the join QR code, or type the join code. Add your name and your Pushsafer device ID.
   - Scan inside the app, not with the iPhone Camera app. The Camera app opens Safari, which keeps its data separately from the Home Screen app.
4. Tap **Send me a test alarm** with the phone on silent to check it sounds.

## 6. Shared devices: base PC, crew-room or vehicle tablets (once each)

These stay signed in permanently and aren't tied to a person.

1. On the dashboard: **Settings → Shared devices**. Give the device a name and choose its type:
   - **Board:** shows all teams. Use it for a wall screen or base PC.
   - **Station for a team:** shows that team's times all the time, and anyone can record on it.
2. Press **Make set-up code**. A QR code and an 8-letter code appear. They work once, within 24 hours.
3. On the device: open the phone address, add it to the Home Screen on an iPad, then choose **Setting up a shared PC or tablet?** Scan the QR code or type the code.
4. Shared devices don't get new-job alarms. Remove a lost device from **Registered devices** on the dashboard.

## Day to day

- **Start of shift:** ACCTS → **Start your shift** → tap your team → choose your **role** → **Start shift**.
  - Tick **Supernumerary or in training** if that applies. Any number of people can sign on to the same team and role.
  - People can sign on up to 1 hour early, and come off duty automatically at the shift end.
  - A team still on a job can keep recording times for up to 6 hours after the shift ends, but gets no new alarms.
- **Potential job:** the team lead presses **Potential job** on the team's panel.
  - Everyone on duty for that team gets one normal notification. It doesn't repeat, and it doesn't sound through silent mode, so a sleeping night team isn't woken for a maybe.
  - Staff tap **SEEN** in the alert, or the amber **POSSIBLE JOB** banner in ACCTS. The dashboard shows who has seen it.
  - The lead then presses **Confirm job · sound alarm**, which starts the full alarm below, or **Stand down**, which sends everyone a quiet "Possible job stood down" message.
  - To make potential-job alerts also sound through silent mode, set `potentialLoud: true` for that team in `functions/profiles.js`.
- **Confirmed job:** the team lead presses **Confirmed job alarm**, or confirms a potential job.
  - If ACCTS is open on a phone, it turns into a flashing red **NEW JOB** screen that sounds continuously until **ACKNOWLEDGE** is tapped. The phone must have been tapped at least once since ACCTS was opened, because iPhones only let a web app make sound after a tap.
  - Pushsafer repeats its Critical Alert every 30 seconds. Choose a long alarm sound in Pushsafer so the gaps between repeats are short.
  - It repeats until enough people acknowledge. For ARCC KSS it repeats every 30 s, until 1 person acknowledges for day teams and 2 at night. For ACCESS London (placeholder settings) it needs one Transfer Doctor and one Transfer Practitioner.
  - It stops after 15 minutes. The panel turns red if nobody has acknowledged within 3 minutes.
  - Staff acknowledge by tapping **ACKNOWLEDGE** in the alarm, or the red **NEW JOB** banner in ACCTS. The others then get a quiet "Acknowledged by …" message.
- **Job times:** the first two times fill in automatically from a confirmed-job alarm.
  - **Alert sent:** when the lead sounds it.
  - **Alert acknowledged:** when the first person on the team acknowledges it.
  - If the lead phoned the team instead, they tap **Alert acknowledged** themselves.
  - If the team is already on a job when a new alarm goes out, that job's times are left alone.
- **End of shift:** ACCTS → **End my shift**, or let it end automatically. The team lead can also sign people off, and can remove lost or replaced phones.

## Services, teams, roles and shift times

All of these are in **`functions/profiles.js`**, with one block per service. Both the app and the server read this file.

- **`arcc-kss`:** ARCC KSS. The five shift teams are set up; the **roles are placeholders** until confirmed.
- **`access-london`:** ACCESS London. Roles are Transfer Doctor and Transfer Practitioner; one of each must acknowledge an alarm. The **4 teams and their hours are placeholders**: for now, staff can sign on at any time for 12 hours.

Each service runs as its own deployment, with its own Firebase project, join code and team lead login, so the two services' data stays apart. A deployment chooses its service in two places, which must match:

- `config.js`: `profile: 'arcc-kss'`
- `functions/.env`: `ACCTS_PROFILE=arcc-kss`

## Dashboard alerts for the team lead

While `lead.html` is open (a background tab is fine), every new or corrected time and every alarm response:

- plays a chime
- shows a desktop pop-up, if turned on
- highlights the team's panel
- adds an entry to **Latest updates**

Click the page once after opening it so the browser allows sound.
