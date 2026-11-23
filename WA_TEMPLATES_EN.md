# English WhatsApp templates (drafts, not submitted)

Clients from the English site (`leads.lang = 'en'`) currently get the **Hebrew** WhatsApp templates; their SMS is already English.
These are English versions of the three client templates, written to the same rules as the approved Hebrew v2 ones
(Utility category, the link written in the template text, no URL in a variable). Submit them in Twilio Content Template Builder
**as new templates in the `en` language**, one at a time, and only when the sender is healthy. Nothing in the code sends them yet:
once Meta approves them, the code needs env vars (proposed below) and a small switch in `app/api/leads/route.ts` and `lib/automations.ts` → `onBid`.

| Proposed name | Proposed env var | Category | Language |
|---|---|---|---|
| `mm_client_tender_opened_en` | `TWILIO_TPL_CLIENT_OPEN_EN` | UTILITY | en |
| `mm_client_first_offer_en` | `TWILIO_TPL_CLIENT_FIRST_EN` | UTILITY | en |
| `mm_client_new_offer_en` | `TWILIO_TPL_CLIENT_NEW_EN` | UTILITY | en |

## mm_client_tender_opened_en

```
Hello {{1}}, your moving request was received and tender no. {{2}} was opened for it.
Price quotes from movers will appear on your tender page:
https://movematch.co.il/en/t/{{3}}
We will update you here when a quote arrives.
The MoveMatch team
```
Sample: `Dana`, `284666`, `5ew98u`

## mm_client_first_offer_en

```
Hello {{1}}, the first price quote for your moving tender has arrived.
Route: {{2}}
Price: ₪{{3}}
To view the quote: https://movematch.co.il/en/t/{{4}}
We will update you here on every further quote.
The MoveMatch team
```
Sample: `Dana`, `Tel Aviv-Yafo → Haifa`, `3,500`, `ab3k9x`

## mm_client_new_offer_en

```
Hello {{1}}, another price quote has arrived for your moving tender.
Quote price: ₪{{2}}
Quotes in the tender: {{3}}
To view all quotes: https://movematch.co.il/en/t/{{4}}
The MoveMatch team
```
Sample: `Dana`, `2,400`, `3`, `5ew98u`

Note for `{{2}}` in the first-offer template: the route is built from the saved (Hebrew) city names today; for English clients
it should be sent with `cityEn()` from `lib/cities.ts`.
