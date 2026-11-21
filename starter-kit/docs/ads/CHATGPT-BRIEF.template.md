# ChatGPT brief: Google Ads campaigns for <brand>

The marketing agent fills this in and saves it as `docs/ads/CHATGPT-BRIEF.md`. Everything from "Paste into ChatGPT" down is pasted into ChatGPT as is (agent mode, signed in to the Google Ads account below).

---

## Paste into ChatGPT

You are building Google Ads campaigns in the account **<Ads account name / customer ID>** for **<brand>** (<domain>), a free Hebrew service in Israel where customers get several quotes for <service> from vetted local providers.

**Rules**
1. Create everything with status **Paused**. Do not enable anything, do not change billing, and do not touch other campaigns in this account.
2. Use only the facts in "Allowed claims". No prices, discounts, ratings, customer numbers or promises that aren't listed.
3. Use the final URLs exactly as written, including their parameters.
4. Hebrew ads, Hebrew-language targeting, locations only from the list.
5. If something in the account doesn't match this brief (wrong conversion names, a missing GA4 link, another campaign optimising for the same conversions), stop and say so in the report instead of guessing.

**Account checks before building**
- Conversion actions present: `qualify_lead` (Primary), `lead_complete` (Secondary), both Count: One. Other campaigns in the account must not use them as goals (campaign-specific goals).
- GA4 property <G-XXXX> linked.

**Campaigns**
| Campaign | Type | Goal / bidding | Daily budget | Locations | Devices | Schedule |
|---|---|---|---|---|---|---|
| <name> | Search | <Maximize conversions on qualify_lead> | <₪> | <cities/areas> | <mobile only?> | <hours> |

**Ad groups**
| Campaign | Ad group | Final URL (exact) | Keywords (phrase/exact) | What it tests |
|---|---|---|---|---|
| | | `https://<domain>/a/photo?utm_source=google&utm_medium=cpc&utm_campaign=<c>&utm_content=<ag>` | | |

**WhatsApp (click-to-chat) ads, if any**
| Ad group | Business number | Prefilled starter text (exact, with #code) |
|---|---|---|
| | +972… | "היי, אשמח לקבל הצעות מחיר ל… #A1" |

**Allowed claims** (use only these): <free for customers · no obligation · several quotes from vetted local providers · quotes arrive on WhatsApp · …>

**Negative keywords**: <jobs, salary, courses, DIY, free used …>

**Ad copy guidance**: <tone, headline ideas in Hebrew, sitelinks, callouts>

**When finished, reply with this report and nothing else:**
```
REPORT
Account: <name / ID>
Conversion check: <ok / problem>
GA4 link: <ok / problem>
Campaigns created (all Paused): <name | type | budget | bidding | locations | devices>
Ad groups: <campaign | ad group | final URL | # keywords | # ads>
WhatsApp ads: <ad group | number | starter text>
Negatives: <list or shared list name>
Anything not done or unclear: <list>
```

---

## After ChatGPT (for Claude)
1. Save ChatGPT's report as `docs/ads/CHATGPT-REPORT.md`.
2. Operator: open Google Ads read-only and check each row above against the account. Write `docs/ads/CHECK-<date>.md` with pass/fail per row and a correction prompt for ChatGPT.
3. When all rows pass: queue "Enable campaigns" for the owner in `docs/QUESTIONS.md`.
