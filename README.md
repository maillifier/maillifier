<p align="center">
  <h1 align="center">Maillifier</h1>
  <p align="center">AI email assistant that runs entirely inside your own Google account.<br/>Forward any email → get an AI-drafted reply in minutes.</p>
</p>

<p align="center">
  <a href="https://github.com/maillifier/maillifier/blob/main/LICENSE"><img src="https://img.shields.io/github/license/maillifier/maillifier?style=flat-square" alt="License"></a>
  <a href="https://github.com/maillifier/maillifier/stargazers"><img src="https://img.shields.io/github/stars/maillifier/maillifier?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/maillifier/maillifier/issues"><img src="https://img.shields.io/github/issues/maillifier/maillifier?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/maillifier/maillifier/commits/main"><img src="https://img.shields.io/github/last-commit/maillifier/maillifier?style=flat-square" alt="Last Commit"></a>
</p>

<p align="center">
  <b>Website:</b> <a href="https://maillifier.com">maillifier.com</a> · <b>Support:</b> <a href="https://github.com/maillifier/maillifier/issues">GitHub Issues</a>
</p>

---

## Why Maillifier?

Most AI email tools require you to grant full access to your inbox, route your messages through third-party servers, or lock you into a proprietary platform. Maillifier takes a fundamentally different approach:

- **No third-party inbox access** — the agent only sees emails you explicitly forward to it.
- **Runs entirely in your Google account** — a Google Apps Script project in a dedicated Gmail account. No external servers.
- **Zero vendor lock-in** — the source code is yours. Fork it, modify it, host it yourself.
- **Transparent architecture** — every line of code is in this repository, nothing hidden.
- **Admin-controlled user access** — whitelist who can use the agent, revoke access instantly.

---

## Demo

> **Screenshots and a demo GIF are coming soon.** If you would like to contribute screenshots of your setup, please open a PR.

<!-- When ready, uncomment:
![Architecture](docs/architecture.svg)
-->

### Architecture

```
Your inbox ──Forward──▶ Agent Gmail ──▶ Apps Script ──▶ Gemini API
                              │                              │
                              │         Knowledge Base       │
                              │         Activity Log         │
                              ◀──────── Draft reply ◀────────┘
```

The agent account is a standalone Gmail account. Your personal inbox is never accessed. See [Architecture](#architecture-1) below for details.

---

## How it works

Maillifier installs a Google Apps Script project directly into a dedicated Gmail account (the "agent account"). The script monitors the agent inbox, processes forwarded emails using the Gemini API, and sends AI-drafted replies back to you. Your personal Gmail account is never accessed — all processing happens inside the agent account.

---

## Installation

There are two ways to install Maillifier.

### Option A — Automatic (via maillifier.com)

> **Note:** Maillifier is currently awaiting Google OAuth verification. Until verification is complete, the automatic installer is available to approved testers only. If you would like to join the testing programme, email [support@maillifier.com](mailto:support@maillifier.com).

Once you have been added as a tester: visit [maillifier.com](https://maillifier.com), sign in with the Google account you want to use as the agent, and follow the on-screen steps. The installer creates the Apps Script project, Knowledge Base document, activity log, and trigger automatically.

After installation, you will receive an activation email with instructions to add your Gemini API key.

### Option B — Manual (from this repository)

Use this method to install immediately without waiting for tester approval. You will need to copy the files manually, but the result is identical to the automatic installer.

#### Step 1 — Prerequisites

* A dedicated Gmail account to use as the agent (e.g. `myagent@gmail.com`). Using a separate account is strongly recommended — do not use your personal inbox.
* A Gemini API key. Get one free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
* The Gemini API must be enabled in your Google Cloud project. Open [this link](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com), select the correct project, and click Enable if it is not already enabled.

#### Step 2 — Enable Google Apps Script API

This step is required for the script to run.

1. Open [myaccount.google.com](https://myaccount.google.com) **while logged in as the agent account**.
2. Go to **Security** → scroll down to **Third-party apps with account access**.
3. Open [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
4. Turn on **Google Apps Script API**.

#### Step 3 — Create a new Apps Script project

1. Open [script.google.com](https://script.google.com) while logged in as the agent account.
2. Click **New project**.
3. Rename the project to `Maillifier Agent` (or any name you prefer).

#### Step 4 — Add the source files

In the Apps Script editor, create a new script file for each `.gs` file in this repository. Copy the contents of each file exactly.

The files in this repository are:

* `Config.gs` — global configuration, reads all settings from Script Properties
* `Main.gs` — core email processing loop, runs every minute
* `GeminiAPI.gs` — Gemini API integration, handles multimodal content and file generation
* `AdminCommands.gs` — handles `#ADD_USER`, `#REMOVE_USER`, `#LIST_USERS`, `#SET_ADMIN` commands
* `AutoSetup.gs` — one-time setup script, creates resources and configures the project

#### Step 5 — Set Script Properties

1. In the Apps Script editor, open **Project Settings** (gear icon on the left).
2. Scroll down to **Script Properties** and click **Edit script properties**.
3. Add the following properties:

| Property | Description | Example |
| --- | --- | --- |
| `AGENT_NAME` | Display name for your agent | `Maillifier` |
| `ADMIN_EMAIL` | Your personal email address (receives setup instructions and agent commands) | `you@gmail.com` |
| `WAITING_INTERVAL` | How often to check for new emails, in minutes | `1` |
| `GEMINI_API_KEY` | Your Gemini API key | `AIza...` |

Do not add `KNOWLEDGE_BASE_URL`, `LOG_SHEET_URL`, or `AGENT_EMAIL` — these are set automatically by `AutoSetup.gs` in the next step.

#### Step 6 — Run the setup

1. In the function dropdown at the top of the editor, select `runInitialSetup`.
2. Click **Run**.
3. Google will ask you to authorise the script. You will see the following permissions:

   | Permission | Why it is needed |
   | --- | --- |
   | Read, compose, and send emails | To monitor the agent inbox, send draft replies, and create Gmail labels |
   | See and manage Google Drive files created by this app | To access the Knowledge Base document and activity log — no other Drive files are visible |
   | See, edit, create, and delete Google Docs | To create and write to the Knowledge Base document during setup |
   | See, edit, create, and delete Google Sheets | To create and write to the activity log spreadsheet |
   | Connect to an external service | To call the Gemini API to generate email drafts |
   | Run when you are not present | To create a time-based trigger that checks for new emails every minute |

   Click **Allow**.
4. Wait for the execution log to show `Setup complete!`.

The setup function will:

* Create a Knowledge Base document in the agent's Google Drive
* Create an activity log spreadsheet
* Write all Script Properties including the resource URLs
* Create Gmail labels `Maillifier-History` and `Filtered/External`
* Create a time-based trigger that runs `processEmails` every minute
* Send an activation email to `ADMIN_EMAIL`

#### Step 7 — Verify the trigger

1. In the Apps Script editor, open **Triggers** (clock icon on the left).
2. Confirm there is a trigger for `processEmails` set to run every minute.

The agent is now active.

---

## Usage

### Forwarding emails

Forward any email from your personal account to the agent account email address. Within 1–5 minutes you will receive an AI-drafted reply.

You can add your own instructions above the forwarded message:

```
Use a formal tone. The client is a long-term partner.

---------- Forwarded message ---------
From: client@example.com
...
```

The agent will take your instructions into account when generating the draft.

### Email commands

Send these commands as plain text in the email body from your personal account (`ADMIN_EMAIL`) to the agent account.

#### AI behaviour

**`#SET_USER_PROMPT`** — set personal rules for the AI. The rules are applied to all future drafts for your email address.

```
#SET_USER_PROMPT
Use a friendly and concise tone.
Always include my Calendly link: https://calendly.com/yourname
I am on vacation until March 10th.
```

**`#GET_PROMPT`** — view your current personal rules and the global Knowledge Base configuration.

To clear your personal rules, send `#SET_USER_PROMPT` with no text following it.

#### User management (admin only)

These commands can only be sent from `ADMIN_EMAIL`.

**`#ADD_USER user@example.com`** — grant a user permission to forward emails to the agent.

**`#REMOVE_USER user@example.com`** — revoke a user's access.

**`#LIST_USERS`** — show all currently authorised users.

**`#SET_ADMIN new-admin@example.com`** — transfer admin rights to another account. This is irreversible — you will lose admin access immediately.

---

## Configuration

### Knowledge Base

The Knowledge Base is a Google Doc created in the agent's Drive during setup. Open it in a private/incognito window logged in as the agent account. Add your company information — the more detail you include, the better the AI drafts will be.

Suggested structure:

```
=== COMPANY INFORMATION ===
Company Name: Acme Corp
Website: www.acme.com
Contact: hello@acme.com

=== SERVICES ===
Describe your products and services here.

=== PRICING ===
Include pricing details the AI can reference.

=== TONE GUIDELINES ===
Professional but approachable. Always sign off with "Best regards".
```

### Script Properties reference

All configuration is stored in Script Properties. You can edit them at any time in Project Settings without redeploying.

| Property | Set by | Description |
| --- | --- | --- |
| `AGENT_NAME` | You | Display name used in emails and labels |
| `AGENT_EMAIL` | AutoSetup | Email address of the agent account |
| `ADMIN_EMAIL` | You | Admin email — receives instructions, can run admin commands |
| `WHITELIST_EMAILS` | AutoSetup / `#ADD_USER` | Comma-separated list of emails allowed to forward to the agent |
| `WAITING_INTERVAL` | You | Trigger interval in minutes |
| `GEMINI_API_KEY` | You | Gemini API key |
| `KNOWLEDGE_BASE_URL` | AutoSetup | URL of the Knowledge Base Google Doc |
| `LOG_SHEET_URL` | AutoSetup | URL of the activity log spreadsheet |

### Adding more users

To allow a colleague to use the agent, send the `#ADD_USER` command from your admin account:

```
#ADD_USER colleague@example.com
```

Their email is added to `WHITELIST_EMAILS`. They can now forward emails to the agent and use `#SET_USER_PROMPT` to set their own personal rules.

---

## Architecture

### Split-Scope design

Maillifier uses a Split-Scope OAuth architecture. The installer at maillifier.com requests only `script.projects` — the minimum scope needed to create the Apps Script project. All Gmail, Drive, and Docs access is requested by the Apps Script project itself, which runs inside the agent account. Your personal Google account never grants broad permissions.

### Privacy

* The agent only processes emails that are explicitly forwarded to it.
* Processed emails are moved to the `Maillifier-History` label and marked as read.
* Emails from addresses not in `WHITELIST_EMAILS` are moved to `Filtered/External` and never processed.
* The agent's Drive access uses the `drive.file` scope — it can only access files it created (the Knowledge Base and activity log). It cannot read or list any other files in the account.
* No email content is stored outside of Google's infrastructure.

For a full description of security practices, see [SECURITY.md](SECURITY.md).

### File structure

```
maillifier/maillifier
├── Config.gs           — reads all settings from Script Properties at runtime
├── Main.gs             — processEmails() runs every minute, orchestrates the pipeline
├── GeminiAPI.gs        — Gemini API calls, multimodal input, file generation markers
├── AdminCommands.gs    — #ADD_USER, #REMOVE_USER, #LIST_USERS, #SET_ADMIN
└── AutoSetup.gs        — runInitialSetup(), one-time setup, creates all resources
```

---

## Roadmap

- [ ] Gmail add-on UI
- [ ] Multi-agent support (multiple agent accounts, centralised management)
- [ ] Template presets for common response scenarios
- [ ] Advanced rate limiting and quota management
- [ ] Conversation threading improvements
- [ ] Attachment analysis (images, PDFs) in forwarded emails
- [ ] Web dashboard for configuration and monitoring

Have an idea? [Open an issue](https://github.com/maillifier/maillifier/issues) — we'd love to hear from you.

---

## Troubleshooting

**The agent is not responding to forwarded emails.**
Check that your email address is in `WHITELIST_EMAILS` in Script Properties. Check the Triggers page in the Apps Script editor to confirm the `processEmails` trigger is active. Open Executions to see if there are any errors.

**`GEMINI_API_KEY not found` error.**
The key is missing or has extra spaces. Open Script Properties and verify the value of `GEMINI_API_KEY`.

**`HTTP 400: Unknown name "thinkingConfig"` error.**
Update `GeminiAPI.gs` from this repository — an older version of the file is installed.

**`Gemini API Error (HTTP 403)`.**
The Gemini API is not enabled in your Google Cloud project. Open [this link](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) as the agent account and enable it.

**`Gemini API Error (HTTP 429)`.**
You have exceeded the free tier rate limit. Wait a few minutes and try again, or set up billing in Google Cloud.

**Emails from colleagues are not being processed.**
Use `#ADD_USER colleague@example.com` from your admin account to add them to the whitelist.

**The trigger disappeared.**
Re-run `runInitialSetup()` — it will recreate the trigger without overwriting your existing configuration. Alternatively, create the trigger manually: Triggers → Add trigger → `processEmails` → Time-driven → Minutes timer → Every 1 minute.

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes.

For security-related issues, see [SECURITY.md](SECURITY.md).

---

## License

[MIT](LICENSE)

---

## About the Author

Built by [Maillifier](https://maillifier.com) — making AI email assistance private, transparent, and self-hosted.

Questions or feedback? Open an issue or email [support@maillifier.com](mailto:support@maillifier.com).
