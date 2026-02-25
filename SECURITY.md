# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Maillifier, please report it responsibly.

**Email:** [support@maillifier.com](mailto:support@maillifier.com)

Please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact

We will acknowledge your report within 48 hours and provide a timeline for a fix. Please do not disclose the vulnerability publicly until we have addressed it.

## Architecture & Data Handling

### No data storage outside Google

Maillifier does not operate any backend servers, databases, or third-party storage. All email processing happens inside the Google Apps Script runtime within the agent's own Google account. Email content is passed to the Gemini API for draft generation and is not stored by Maillifier.

### Split-Scope OAuth

The automatic installer at maillifier.com requests only the `script.projects` scope — the minimum required to create the Apps Script project. All other permissions (Gmail, Drive, Docs, Sheets) are requested by the Apps Script project itself and are confined to the agent account. Your personal Google account never grants broad access.

### Scope summary

| Scope | Purpose |
| --- | --- |
| `gmail.modify` | Read forwarded emails, send draft replies, manage labels |
| `drive.file` | Access only files the script created (Knowledge Base, activity log) |
| `documents` | Create and update the Knowledge Base document |
| `spreadsheets` | Create and update the activity log |
| `script.external_request` | Call the Gemini API |
| `script.scriptapp` | Create time-based triggers |

The `drive.file` scope is particularly important: it means the script **cannot** see, list, or access any files in the agent's Google Drive except the ones it created during setup.

### Access control

- Only email addresses listed in `WHITELIST_EMAILS` are processed. All other emails are moved to the `Filtered/External` label and ignored.
- Admin commands (`#ADD_USER`, `#REMOVE_USER`, `#SET_ADMIN`) can only be executed by the account listed in `ADMIN_EMAIL`.
- Personal rules set via `#SET_USER_PROMPT` are stored in Google Apps Script Properties and are isolated per user.

### What Maillifier does NOT do

- Does not access your personal Gmail inbox
- Does not store email content in any external database
- Does not send data to any server other than the Google Gemini API
- Does not require a persistent backend or cloud infrastructure
- Does not collect analytics or telemetry

## Recommended Practices

- Use a **dedicated Gmail account** as the agent account — do not install Maillifier on your personal inbox.
- **Rotate your Gemini API key** periodically.
- **Review the whitelist** regularly using `#LIST_USERS`.
- **Monitor the activity log** spreadsheet for unexpected entries.

## Supported Versions

| Version | Supported |
| --- | --- |
| Latest (`main` branch) | ✅ |
| Older commits | ❌ |

We recommend always using the latest version from the `main` branch.
