# Young Turings — booking

Parent booking page and internal Sales Desk for Young Turings free AI classes.
Live at **https://book.youngturings.com** (Vercel). The marketing site lives in `youngturings-landingpage`.

| Path | What it is |
|---|---|
| `/demo/` | Parent booking page. Cal.com inline embed, prefilled from `?n=parent&p=phone&c=child&a=age&l=leadId` |
| `/sales/` | Sales Desk (team only). Save a lead, open WhatsApp with the booking link, track status. **Import leads** from CSV/Excel (`assets/import.js`, template at `/assets/leads-template.csv`) |
| `/` | Redirects to youngturings.com (and forwards Supabase sign-in links to `/sales/`) |
| `/sprout-buddy/` | Example student startup site (sales artefact) |

**Accounts & wiring** (all settings in `assets/config.js`)
- Cal.com event `free-ai-class` (60 min, 9am–9pm IST daily, "Young Turings classes" schedule)
- Cal.com webhook → Supabase edge function `cal-webhook` → `leads` status `booked` / back to `link_sent` on cancel. Signed with `CAL_WEBHOOK_SECRET` (Supabase Vault).
- Supabase project `jcnactgfjvcifqbrktut`: tables `leads`, `lead_events`, `team_members`. Sales Desk access = email in `team_members` (RLS `is_team()`).
- Cal.com API key is in Supabase Vault as `CAL_API_KEY`.

Logo files come from the official kit (young-turings-logo-files-v2) in `assets/logo/`, `assets/favicon.svg`, `favicon.ico`, `assets/apple-touch-icon.png` and `assets/avatar.png`. Never redraw or retype the logo.

Static site, no build step. Push to `main` deploys.
