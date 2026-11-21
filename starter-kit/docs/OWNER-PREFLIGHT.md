# Owner preflight: the hour that lets the agents work alone

Do this once per project, and repeat the last step (the smoke test) before each unattended run. Background: `docs/PLAYBOOK.md` section 20.

On MoveMatch, every console step waited for the owner. After this hour, the agents can do it themselves, and you only press the buttons that legally or physically need you.

## 1. Answer stage 1 (about 20 minutes)
Run `/kickoff <idea>` and answer the entrepreneur's questions. Most importantly:
- the **autonomy level** (playbook 20.5);
- the **monthly spend cap**;
- whether your name appears on the site;
- your **test phone numbers**.

## 2. Accounts that exist and are paid for
Agents never enter card details. Tick each one:

| Account | Done | Notes |
|---|---|---|
| GitHub: new repo, Claude GitHub App installed on it | ☐ | |
| Vercel (project can be created by the agent) | ☐ | Domain purchase is a payment: you click Buy |
| Supabase on **Pro**, EU region | ☐ | The free plan filled up with videos on MoveMatch |
| Twilio, upgraded (card added) | ☐ | |
| Meta Business portfolio | ☐ | The agent fills verification; you submit |
| Google Analytics + Google Ads with billing | ☐ | ChatGPT builds the campaigns Paused from Claude's brief; Claude checks; you press Enable |
| ChatGPT (agent mode) with access to the same Google Ads account | ☐ | Builds the campaigns |
| Microsoft Clarity (free; Microsoft or Google sign-in) | ☐ | Session recordings |
| Anthropic Console with billing | ☐ | The agent creates the key and sets a spend limit |
| Email on the domain (Workspace or forwarding) | ☐ | Needed for Twilio Trust Hub and Meta |
| Phone line for the WhatsApp business number | ☐ | Israeli number; can receive Meta's code |

## 3. Connect Claude to your tools
- On claude.ai: connect **GitHub, Supabase, Vercel, Gmail, Google Drive**.
- When an agent asks for an API credential (Twilio, for example), paste it into the **secure form** it shows you. Never paste keys into the chat.
- In a cloud session, allow the hosts the build needs now (the live domain, `api.twilio.com`, `api.vercel.com`). Approval prompts can't be answered overnight.

## 4. Chrome: log in once so the agents can reuse it
1. Install **Claude in Chrome**. In Claude Code run `/chrome` → enable, and set "Enabled by default".
2. In that Chrome profile, sign in to each of these and tick "stay signed in". Finish 2FA now.

| Console | URL | Logged in |
|---|---|---|
| Meta Business Suite / WhatsApp Manager | business.facebook.com | ☐ |
| Google Ads | ads.google.com | ☐ |
| Google Analytics | analytics.google.com | ☐ |
| Google Search Console | search.google.com/search-console | ☐ |
| Twilio console | console.twilio.com | ☐ |
| Vercel | vercel.com | ☐ |
| Supabase | supabase.com/dashboard | ☐ |
| Anthropic Console | console.anthropic.com | ☐ |
| Gmail / Workspace admin | mail.google.com | ☐ |
| Microsoft Clarity | clarity.microsoft.com | ☐ |
| ChatGPT (the agent pastes the ads brief here) | chatgpt.com | ☐ |

3. To run unattended in a cloud session that uses this browser: Claude desktop app → Settings → Claude Code → Remote Control, and keep the Mac awake. Plug it in, turn off sleep, or run `caffeinate -dims` in Terminal.

## 5. Documents folder
Put these in one folder and write its path in `docs/OWNER-SETUP.md`:
- incorporation certificate or עוסק מורשה;
- the exact registered business name, number and address (copied exactly; a mismatch got the Twilio profile rejected);
- logo;
- ID scan only if a service asks for it.

The agents fill forms from these. You press the final Submit.

## 6. Permissions
Start the session in **Auto mode** (or accept the kit's `.claude/settings.json`), so the run doesn't stop on prompts. The guard hook (`.claude/hooks/guard.mjs`) still blocks these:
- pushes to `main`;
- production deploys from the CLI;
- real message sends;
- destructive SQL.

Also turn on branch protection for `main` on GitHub. The agent can do this in the browser.

## 7. Notifications
Allow notifications from the Claude app on your phone (and enable push notifications in Claude Code if asked). Agents notify you immediately whenever something needs paying.

## 8. Smoke test (before every unattended run)
Run `/autopilot preflight`. The operator agent fills in this table:

| Check | Result | Date |
|---|---|---|
| Browser tools respond | | |
| Each console in step 4 opens logged in | | |
| GitHub push to a branch works | | |
| Vercel API reachable | | |
| Supabase MCP reachable | | |
| Twilio API reachable (read-only) | | |
| Gmail search works | | |

Fix any ❌, then start `/autopilot`.
