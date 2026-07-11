## Goal
Add three legal pages (Privacy Policy, Terms of Service, Cookie Policy) tailored to eFinSign, governed by Ontario, Canada law, with `support@efin.money` as the contact. Link them from the landing page footer only.

## Pages to create
All three pages share a consistent layout matching the existing `Trust.tsx` styling (same header, container width, card-based sections, `#003D8F` brand accent, back-to-landing link).

- **`src/pages/PrivacyPolicy.tsx`** — PIPEDA-aligned Canadian privacy notice covering: information collected (account, org, uploaded documents, signer data, usage/analytics), purposes of use, legal basis, disclosure to subprocessors (Supabase/Lovable Cloud, Stripe, Resend, Google Gemini — mirrors Trust page list), storage & security, retention, user rights (access, correction, withdrawal, deletion), international transfers, children's privacy, changes to the policy, and contact.
- **`src/pages/TermsOfService.tsx`** — Ontario-governed terms covering: acceptance, description of service, account/eligibility, acceptable use, org admin responsibilities, electronic signatures & e-doc validity notice, subscriptions & billing (Stripe), intellectual property, third-party services, disclaimers, limitation of liability, indemnity, termination, changes, governing law (Ontario, Canada) & venue, and contact.
- **`src/pages/CookiePolicy.tsx`** — what cookies/local storage are used for: authentication session tokens (Supabase), theme preference, and essential app state. States no third-party advertising cookies. Explains browser controls and effect of disabling.

All content is generic legal placeholder wording — the user should have counsel review before production. A visible "Last updated" date and a short disclaimer noting this is not legal advice will be included.

## Routing
Update `src/App.tsx` to add three public routes (no auth required):
- `/privacy` → `PrivacyPolicy`
- `/terms` → `TermsOfService`
- `/cookies` → `CookiePolicy`

## Landing footer
Update `src/pages/Landing.tsx` footer to add three links (Privacy Policy · Terms of Service · Cookie Policy) alongside any existing footer content, styled to match the current landing dark theme.

## SEO
Each page sets `<title>` and `<meta description>` via a small `useEffect` (pattern already used elsewhere in the app), plus a single H1.

## Sitemap
Add `/privacy`, `/terms`, `/cookies` entries to `public/sitemap.xml`.

## Out of scope
- No database changes, no cookie consent banner, no analytics changes, no changes to auth/app-shell footers (per your "landing page footer only" choice).
