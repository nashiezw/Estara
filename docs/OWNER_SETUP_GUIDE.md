# ESTARA Owner Setup Guide

Last updated: 2026-08-20

This guide is for work you must do outside the codebase. Do not paste passwords, API keys or secret values into chat. Put secrets only into the deployment provider's secret store.

## 1. Decide The Launch Login Method

Decision: build standalone ESTARA email/password login before public launch.

What this means: agency owners and staff will create an ESTARA account with their email address and password. They will not need ChatGPT to log in.

Why this is the right public-launch choice:

- It feels normal for agencies and staff.
- It supports email verification, password reset and team invitations properly.
- It lets ESTARA become its own product, not something that depends on a ChatGPT account.
- It is easier to explain to customers: "Create your ESTARA account."

What needs to be built before public launch:

- Register with email and password.
- Verify email address.
- Resend verification email.
- Login.
- Logout.
- Forgot password.
- Reset password.
- Expired or invalid link screens.
- Protected routes for logged-in users only.
- Role and agency checks after login.
- Clear loading, success and error messages.

What you personally need to do:

1. Approve this decision.
2. Choose the email address customers should receive login emails from, for example `hello@estara.co.zw` or `support@estara.co.zw`.
3. Set up the production email provider later in this guide.

What success looks like:

- A new agency owner can open ESTARA, click sign up, create an account, verify their email, create their agency and reach the workspace.
- A returning user can log in with email and password.
- A user who forgets their password can reset it without contacting us.

If it fails:

- Do not launch publicly.
- Keep the app private until registration, verification, login and reset password work end to end.

## 2. Connect Production Hosting

What this does: puts ESTARA online so people can visit the platform in a browser.

Recommended option: Cloudflare.

Why I recommend Cloudflare for this codebase:

- This repository is already built around Cloudflare-style infrastructure.
- The app uses Cloudflare D1 for the database.
- The app uses Cloudflare R2-style private media storage.
- The code imports `cloudflare:workers`, which is Cloudflare-specific.
- Cloudflare also supports Workers custom domains and secrets.

Helpful links:

- Cloudflare dashboard: https://dash.cloudflare.com/
- Cloudflare Workers & Pages docs: https://developers.cloudflare.com/workers/
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/
- Cloudflare R2 docs: https://developers.cloudflare.com/r2/
- Cloudflare environment variables and secrets: https://developers.cloudflare.com/workers/configuration/environment-variables/
- Cloudflare Workers custom domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

Step-by-step: confirm the real Cloudflare D1 database id.

The app cannot deploy with the placeholder id `00000000-0000-4000-8000-000000000000`. Cloudflare will reject it. ESTARA currently commits the production D1 database id `e4fec45c-a64d-45f7-a056-58c19e6f34db` so the build does not depend on Cloudflare build variables.

1. Open https://dash.cloudflare.com/
2. Choose the Cloudflare account where ESTARA is being deployed.
3. In the left menu, open D1 SQL Database.
4. Click the ESTARA database. If there is no database yet, create one first.
5. Open Settings for that database.
6. Copy the Database ID.
7. Confirm it matches the value in this guide.
8. If the database id ever changes, update `ESTARA_PRODUCTION_D1_DATABASE_ID` in `vite.config.ts`, commit, push and redeploy.

You may still add `CLOUDFLARE_D1_DATABASE_ID` or `CLOUDFLARE_DATABASE_ID` as an override, but the current deploy no longer depends on Cloudflare build variables being available.

Step-by-step: confirm the media bucket.

1. In Cloudflare, open R2 Object Storage.
2. Open the bucket used for ESTARA media.
3. If the bucket is not named `site-creator-r2`, add an environment variable named `CLOUDFLARE_R2_BUCKET_NAME`.
4. Put the exact bucket name as the value.
5. Save it.

Step-by-step: deploy command.

In the Cloudflare project build/deploy settings, use:

```bash
npm run deploy
```

Do not use:

```bash
npx wrangler deploy
```

`npm run deploy` checks that the real D1 id exists, builds the app, then deploys the generated Worker config.

Can Vercel work?

Short answer: not as the easiest first choice for this exact repository.

Vercel is excellent for many Next.js apps, and it can host websites very well. But this ESTARA app currently depends on Cloudflare-specific runtime features. To use Vercel as the main host, we would need to deliberately refactor parts of the app away from Cloudflare D1/R2/Workers bindings or connect equivalent services in a different way.

Vercel could work later if we choose one of these paths:

1. Move the full app to Vercel and replace Cloudflare-specific pieces with Vercel-compatible database/storage/runtime services.
2. Use Vercel only for a separate marketing website, while the ESTARA app stays on Cloudflare.
3. Keep everything on Cloudflare for launch, then reconsider hosting once the MVP is selling.

Helpful Vercel links:

- Vercel dashboard: https://vercel.com/dashboard
- Vercel deployment docs: https://vercel.com/docs/projects/deploy-from-cli
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel domains: https://vercel.com/docs/domains

My recommendation for launch:

Use Cloudflare for the ESTARA product app.

Reason: it matches the codebase we already have, reduces risky hosting rewrites, and gets us closer to launch.

What you need before starting:

- A Cloudflare account.
- Access to the ESTARA Git repository.
- A production domain, for example `estara.co.zw` or another domain you own. If the domain ends in `.co.zw`, buy/register it outside Cloudflare first, then bring it into Cloudflare for DNS.
- A way to add secrets safely in Cloudflare.
- Later: email, monitoring and payment provider accounts.

Step-by-step: create or open your Cloudflare account.

1. Go to https://dash.cloudflare.com/
2. If you already have an account, sign in.
3. If you do not have an account, click sign up.
4. Use an email address you control long term.
5. After login, stay on the Cloudflare dashboard.

What success looks like:

- You can see the Cloudflare dashboard.
- You can access Workers & Pages.

Step-by-step: register `estara.co.zw` when Cloudflare cannot sell it.

Important: Cloudflare can host and manage DNS for a domain after you own it, but Cloudflare Registrar does not sell every domain extension. If `estara.co.zw` does not appear in Cloudflare's domain registration search, buy it through a `.co.zw` registrar first.

Recommended path:

1. Do not change the ESTARA platform name because of this. Keep `ESTARA`.
2. Register `estara.co.zw` through a Zimbabwe `.co.zw` registrar or hosting company that supports ZISPA/CO.ZW registrations.
3. Ask the registrar clearly: "Can you register `estara.co.zw` in my/company name and allow me to use Cloudflare nameservers?"
4. Make sure the owner details are yours or your company details, not the developer's, consultant's or registrar staff member's personal details.
5. Prepare the documents the registrar asks for. For a company, this may include company registration documents. For an individual, this may include identification.
6. Ask the registrar to confirm availability before you pay.
7. Pay for the domain only after they confirm it can be registered.
8. Ask the registrar to send written confirmation when `estara.co.zw` is registered.
9. After registration, continue with "add your main domain to Cloudflare" below.

Where to go:

- ZISPA information for `.co.zw`: https://www.zispa.org.zw/
- Cloudflare dashboard: https://dash.cloudflare.com/
- Cloudflare supported registrar extensions: https://developers.cloudflare.com/registrar/top-level-domains/

What to ask the registrar before paying:

1. "Will the domain be registered under my name/company name?"
2. "Can I later change the nameservers to Cloudflare nameservers?"
3. "How long does `.co.zw` approval normally take?"
4. "Will I receive access to manage the domain, or do I request nameserver changes from you?"
5. "What documents do you need from me?"
6. "What is the annual renewal cost?"
7. "Will you remind me before renewal?"

What success looks like:

- You receive confirmation that `estara.co.zw` is registered.
- The domain owner is you or your company.
- The registrar can change nameservers to Cloudflare when Cloudflare gives you the nameserver names.

If `estara.co.zw` is already taken or cannot be approved:

1. Try a close Zimbabwe option, such as `estaraonline.co.zw`, `estaraproperty.co.zw`, `estaraapp.co.zw` or `estara.africa`.
2. Also buy a global backup domain if available, such as `estara.app`, `estara.co`, `estara.io` or `estara.com`.
3. Choose one primary domain for launch.
4. Redirect the other domains to the primary domain later.

My recommendation:

- First choice: `estara.co.zw` if available and you can register it under your own/company name.
- Backup choice: buy one global domain too, ideally `estara.app` or another short ESTARA domain that is available through Cloudflare or another mainstream registrar.
- Use Cloudflare for DNS, security, SSL/TLS and app routing after the domain is registered.

Step-by-step: add your main domain to Cloudflare.

1. In the Cloudflare dashboard, click Add a domain or Add site.
2. Type your domain name, for example `estara.co.zw`.
3. Follow Cloudflare's setup instructions.
4. Cloudflare will show you two nameservers.
5. Copy those two nameserver names exactly.
6. Open the website where you bought your domain, or contact the registrar who registered it for you.
7. Find DNS or nameserver settings.
8. Replace the old nameservers with the two Cloudflare nameservers.
9. Save.
10. Return to Cloudflare and wait for the domain to become active.

What success looks like:

- Cloudflare shows the domain as active.
- Cloudflare can manage DNS for the domain.

If it fails:

- Check that you changed nameservers on the company where you bought the domain.
- Check spelling of the domain.
- Wait a few hours; nameserver changes can take time.
- If the registrar controls nameservers for you, send them the two Cloudflare nameservers and ask them to replace the current nameservers exactly.

If Cloudflare says "Records we found: 0":

This is not a launch blocker by itself. It means Cloudflare scanned the domain and did not find existing DNS records to copy.

What you should do next:

1. If you do not already have a live website or email on this domain, do not panic and do not add random records.
2. Continue through the Cloudflare setup until Cloudflare shows you two nameservers.
3. Copy the two Cloudflare nameservers exactly.
4. Go to the registrar where `estara.co.zw` was registered, or contact their support team.
5. Replace the current nameservers with the two Cloudflare nameservers.
6. Return to Cloudflare and wait for the domain to become active.
7. After the domain is active, connect the ESTARA app domain from the Worker/project, for example `app.estara.co.zw`.
8. If you want `www.estara.co.zw` or `estara.co.zw` to open a marketing page later, add those records after the hosting target is decided.
9. If you want email addresses like `hello@estara.co.zw`, set up the email provider first, then add the MX, SPF, DKIM and DMARC records the email provider gives you.

What the warnings mean:

- "To receive email at @estara.co.zw, add MX record" means email will not work until we choose and configure an email provider.
- "A, AAAA or CNAME record for www is required" means `www.estara.co.zw` will not open a website until we connect it.
- "A, AAAA or CNAME record pointing to the root domain is required" means `estara.co.zw` itself will not open a website until we connect it.

For ESTARA launch, use one main domain with clear rooms:

- `estara.co.zw` is the public homepage. This is what normal visitors should open first.
- `www.estara.co.zw` should also open the same public homepage, because many people type `www`.
- `app.estara.co.zw` is the product app. This is where owners, admins and agency staff log in and use the workspace.
- `sites.estara.co.zw` is the agency website area. Example: `prime-property.sites.estara.co.zw` can show Prime Property's public website.
- `hello@estara.co.zw` is email. Set this up only after choosing the email provider.

Recommended launch choice:

1. Put the public homepage on `estara.co.zw`.
2. Put the same public homepage on `www.estara.co.zw`.
3. Put the login/workspace app on `app.estara.co.zw`.
4. Use `sites.estara.co.zw` as the base for agency websites.
5. Add email DNS records only after choosing Resend, Google Workspace or Zoho Mail.

Very simple explanation of the words Cloudflare uses:

- Domain: the name people type, like `estara.co.zw`.
- Subdomain: a smaller name under the main domain, like `app.estara.co.zw`.
- DNS: the address book of the internet. It tells browsers where a domain should go.
- Nameservers: the company in charge of that address book. If nameservers point to Cloudflare, Cloudflare controls the DNS.
- DNS record: one line in the address book. It may say "send this name to this app" or "send email here".
- SSL/TLS certificate: the lock icon in the browser. It makes `https://` secure.

If your registrar lets you change nameservers:

1. Go to Cloudflare: https://dash.cloudflare.com/
2. Click Websites.
3. Click Add a domain or Add site.
4. Type `estara.co.zw`.
5. Cloudflare will give you two nameservers. They look like two short names ending in `cloudflare.com`.
6. Open your registrar account, or message the registrar support team.
7. Ask them to replace the current nameservers with the two Cloudflare nameservers.
8. Go back to Cloudflare and wait until the domain says Active.
9. After it is Active, connect `estara.co.zw`, `www.estara.co.zw` and `app.estara.co.zw` to the ESTARA Worker app.

If your registrar does not let you change nameservers:

This means Cloudflare may not be fully in charge of the domain. You may still be able to add DNS records manually, but the ESTARA Cloudflare Worker app may not accept `app.estara.co.zw` as a custom domain unless Cloudflare controls the zone.

Do this first:

1. Ask the registrar again: "Can you change the nameservers for `estara.co.zw` to Cloudflare nameservers?"
2. If they say yes, use the nameserver steps above.
3. If they say no, ask: "Can I add CNAME, TXT, MX and root domain records manually?"
4. If they say yes, manual DNS can still help with email and some website setups.
5. If they say no, use a different registrar or move the domain to a registrar that gives you full DNS control.

Where to go for each thing:

| What you want | Where you go | What you copy from there | Where you paste it |
| --- | --- | --- | --- |
| Public homepage at `estara.co.zw` | Cloudflare > Workers & Pages > ESTARA project > Settings > Domains & Routes | Add a Custom Domain for `estara.co.zw` | Cloudflare creates/manages the DNS record because the zone is active |
| Public homepage at `www.estara.co.zw` | Cloudflare > Workers & Pages > ESTARA project > Settings > Domains & Routes | Add a Custom Domain for `www.estara.co.zw` | Cloudflare creates/manages the DNS record because the zone is active |
| ESTARA app at `app.estara.co.zw` | Cloudflare > Workers & Pages > ESTARA project > Settings > Domains & Routes | Add a Custom Domain for `app.estara.co.zw` | Cloudflare creates/manages the DNS record because the zone is active |
| Agency websites under `sites.estara.co.zw` | Cloudflare DNS and ESTARA platform settings | Use `sites.estara.co.zw` as the tenant website suffix | Add a wildcard DNS record only when wildcard routing is ready |
| Sending emails | Resend > Domains | SPF, DKIM and DMARC TXT records | Registrar DNS or Cloudflare DNS |
| Receiving emails | Google Workspace or Zoho Mail | MX records plus SPF/DKIM/DMARC records | Registrar DNS or Cloudflare DNS |
| Proving ownership | Whatever provider asks you to verify the domain | A TXT record name and value | Registrar DNS or Cloudflare DNS |

Do not guess DNS records. If a provider shows a value, copy it exactly. One wrong letter can break the setup.

What to tell the registrar if they only allow manual DNS:

"I own or want to use `estara.co.zw`. I need to connect it to my app and email. Please confirm if I can add these DNS record types: CNAME, TXT, MX, SPF, DKIM, DMARC and a root/apex record such as A, ALIAS or ANAME. I also need to know if you can create a CNAME for `app.estara.co.zw` if my hosting provider gives me one."

Important decision in plain language:

- Best option: get Cloudflare nameserver access. This is the cleanest path for the ESTARA app.
- Okay option: manual DNS only. This may work for email and a simple marketing website, but may not be enough for the Cloudflare Worker app domain.
- Bad option: no nameserver changes and no manual DNS records. Do not use that setup for launch.

Step-by-step: create the production app/project.

1. In Cloudflare, open Workers & Pages.
2. Create a new Worker/Pages project for ESTARA.
3. Connect the Git repository if Cloudflare asks for it.
4. Choose the production branch, usually `main`.
5. Use the build command from the repository: `npm run build`.
6. Do not add secrets directly into code.
7. Add secrets and environment variables through Cloudflare settings.

What success looks like:

- Cloudflare can build the ESTARA project.
- A temporary Cloudflare URL opens the app.

If it fails:

- Copy the build error.
- Do not keep clicking deploy repeatedly without fixing the error.
- Ask for help with the exact error message.

Step-by-step: add environment variables and secrets.

1. In Cloudflare, open the ESTARA Worker/project.
2. Go to Settings.
3. Find Variables and Secrets.
4. Click Add.
5. For normal values, choose variable.
6. For passwords, API keys and private tokens, choose secret.
7. Add the values listed in `docs/ENVIRONMENT_VARIABLES.md`.
8. Save.
9. Deploy again so the app uses the new values.

What success looks like:

- Cloudflare shows the variables/secrets in the project settings.
- Secret values are hidden after saving.
- The next deployment can read them.

If it fails:

- Check the exact variable name.
- Check for missing underscores.
- Check whether the value was added to Production, not only Preview.

Step-by-step: connect your production domains after Cloudflare says the domain is Active.

Do these one at a time:

1. In Cloudflare, open Workers & Pages.
2. Open the ESTARA Worker/project.
3. Go to Settings.
4. Open Domains & Routes.
5. Click Add.
6. Choose Custom Domain.
7. Type `estara.co.zw`.
8. Save.
9. Wait until Cloudflare shows the domain/certificate is active.
10. Click Add again.
11. Choose Custom Domain.
12. Type `www.estara.co.zw`.
13. Save.
14. Wait until Cloudflare shows the domain/certificate is active.
15. Click Add again.
16. Choose Custom Domain.
17. Type `app.estara.co.zw`.
18. Save.
19. Wait until Cloudflare shows the domain/certificate is active.
20. Open `https://estara.co.zw`.
21. Open `https://www.estara.co.zw`.
22. Open `https://app.estara.co.zw/login`.
23. Open `https://app.estara.co.zw/workspace` after signing in.

What success looks like:

- `https://estara.co.zw` opens the public ESTARA homepage.
- `https://www.estara.co.zw` opens the same public ESTARA homepage.
- `https://app.estara.co.zw/login` opens the login page.
- `https://app.estara.co.zw/workspace` opens the workspace after login.
- The browser shows a secure lock icon on all three domains.

If it fails:

- Check that the domain is active in Cloudflare.
- Check there is no old conflicting DNS record.
- Wait a little and refresh the Cloudflare status.

Step-by-step: save launch evidence.

1. Write down the live production URL.
2. Write down the deployed commit SHA.
3. Save the deployment date.
4. Save screenshots or exported evidence showing the deployment succeeded.
5. Add this evidence to the production launch evidence bundle later.

What success looks like:

- We can prove exactly what version of ESTARA was deployed.
- We can prove it was deployed to the correct production URL.

Hosting decision summary:

- Best first launch choice: Cloudflare.
- Vercel can work only with a hosting refactor or as a separate marketing-site host.
- Do not launch until the production URL, secrets, domain, SSL/TLS and launch evidence are confirmed.

## 3. Connect Your Main Domain

What this does: it makes ESTARA open from a real web address instead of only a temporary Cloudflare address.

The easiest version:

1. Own `estara.co.zw`.
2. Let Cloudflare control its DNS by using Cloudflare nameservers.
3. Connect `estara.co.zw` to the ESTARA Worker app for the homepage.
4. Connect `www.estara.co.zw` to the ESTARA Worker app for people who type `www`.
5. Connect `app.estara.co.zw` to the ESTARA Worker app for login and workspace.
6. Later, connect agency websites under `sites.estara.co.zw`.

What you need before starting:

- The login for the company or registrar where `estara.co.zw` was registered.
- Proof that the domain belongs to you or your company.
- Your Cloudflare account login.
- The ESTARA Worker/project already created in Cloudflare.

Step-by-step, slowly:

1. Open Cloudflare: https://dash.cloudflare.com/
2. Click Websites.
3. Click Add a domain or Add site.
4. Type `estara.co.zw`.
5. Follow Cloudflare until it shows two nameservers.
6. Keep that Cloudflare tab open.
7. Open your domain registrar account in another tab.
8. Find Nameservers, DNS, Domain settings or Manage domain.
9. Replace the old nameservers with the two Cloudflare nameservers.
10. Save.
11. Go back to Cloudflare.
12. Wait until Cloudflare says the domain is Active.
13. Open Cloudflare > Workers & Pages.
14. Open the ESTARA Worker/project.
15. Go to Settings.
16. Open Domains & Routes.
17. Click Add.
18. Choose Custom Domain.
19. Type `estara.co.zw`.
20. Save.
21. Wait for Cloudflare to show the certificate is active.
22. Click Add again.
23. Choose Custom Domain.
24. Type `www.estara.co.zw`.
25. Save.
26. Wait for Cloudflare to show the certificate is active.
27. Click Add again.
28. Choose Custom Domain.
29. Type `app.estara.co.zw`.
30. Save.
31. Wait for Cloudflare to show the certificate is active.
32. Open `https://estara.co.zw`.
33. Open `https://www.estara.co.zw`.
34. Open `https://app.estara.co.zw/login`.

What success looks like:

- `https://estara.co.zw` opens the public ESTARA homepage.
- `https://www.estara.co.zw` opens the same homepage.
- `https://app.estara.co.zw/login` opens the app login page.
- `https://app.estara.co.zw/workspace` works after login.
- There is no red warning page.

If it fails:

- Check that `estara.co.zw`, `www.estara.co.zw` and `app.estara.co.zw` are spelled correctly.
- Check that Cloudflare says `estara.co.zw` is Active.
- Check that old DNS records are not pointing those names somewhere else.
- Wait 15 to 60 minutes and try again.
- If it still fails, copy the exact Cloudflare error message.

## 4. Prepare Agency Website Domains

What this does: allows agencies to use subdomains or custom domains for their public websites.

Recommended first launch setup:

- Use `sites.estara.co.zw` as the public website suffix.
- Agency websites can then use addresses like `prime-property.sites.estara.co.zw`.
- Do not use `app.estara.co.zw` for agency websites. Keep `app` only for the ESTARA product app.
- Do not point `estara.co.zw` directly to one agency. Keep it as the ESTARA homepage.

What you need:

- The platform tenant-domain suffix or public-site domain.
- DNS access for any custom agency domain.

Steps for the platform suffix:

1. In Cloudflare, open Websites.
2. Open `estara.co.zw`.
3. Open DNS > Records.
4. Add a CNAME record.
5. For Name, type `*.sites`.
6. For Target, use the target Cloudflare gives for the ESTARA Worker route, or attach `*.sites.estara.co.zw` from Workers & Pages > ESTARA project > Settings > Domains & Routes if Cloudflare allows the wildcard custom domain.
7. In the ESTARA super admin dashboard, open Platform settings.
8. Set Platform domain to `estara.co.zw`.
9. Set Tenant domain suffix to `sites.estara.co.zw`.
10. Save platform settings.

Steps for an agency custom domain:

1. In ESTARA, add the agency custom domain.
2. Copy the ownership token and expected DNS target shown by ESTARA.
3. Open the agency's DNS provider.
4. Add the requested TXT/CNAME records.
5. Return to ESTARA and verify the domain.
6. Wait for provider attachment and SSL/TLS activation.

What success looks like: the custom domain opens the correct agency public website and unknown domains fail closed.

If it fails: confirm the agency domain is unique, DNS records match exactly and SSL/TLS is active.

## 5. Set Up Email

What this does: lets ESTARA send verification, invite, enquiry, viewing and system emails.

What you need:

- A production email provider account.
- A verified sender/domain.
- API key and webhook secret.

Steps:

1. Create or open the email provider account.
2. Verify the sender email/domain.
3. Copy the API key.
4. Add the API key to the deployment secret store as `RESEND_API_KEY`.
5. Add the sender address as `RESEND_FROM_EMAIL`.
6. Configure the webhook secret as `RESEND_WEBHOOK_SECRET`.
7. Send a test email from the production environment.

What success looks like: the email arrives from the correct sender and the app records success/failure safely.

If it fails: check sender verification, DNS records, secret names and provider logs.

## 6. Set Up Payments

What this does: allows real subscriptions, invoices, failed-payment handling and settlement evidence.

What you need:

- Stripe or approved payment provider account.
- Live-mode access.
- Product/price IDs.
- Webhook endpoint.

Steps:

1. Open the payment provider dashboard.
2. Create the launch plans/prices.
3. Copy live secret key and webhook secret.
4. Add secrets as `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
5. Add price IDs as `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH`.
6. Run live-mode test flows for invoice, payment, refund and failed payment.
7. Save evidence for launch approval.

What success looks like: billing actions work in live mode and finance can reconcile payments.

If it fails: do not claim payments are production-ready.

## 7. Set Up Monitoring And Alerts

What this does: lets you know when ESTARA breaks.

What you need:

- Error monitoring account.
- Alerting destination, such as email or Slack.

Steps:

1. Create the monitoring project.
2. Copy the DSN and auth details.
3. Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`.
4. Configure alert recipients.
5. Trigger a safe test error in a non-public environment.
6. Confirm the alert arrives.

What success looks like: errors appear in monitoring without exposing customer data.

If it fails: check secrets, project names and alert rules.

## 8. Complete Final Launch Approval

What this does: confirms ESTARA is ready to sell.

What you need:

- Live URL.
- Tested commit SHA.
- Evidence bundle.
- Mobile audit results.
- Penetration test closure.
- Owner approval.

Steps:

1. Create a fresh demo agency.
2. Add one logo, phone number and property.
3. Activate the property.
4. Confirm the agency website and property page work.
5. Create marketing output.
6. Submit a public enquiry.
7. Record follow-up and viewing.
8. Generate/approve seller reporting.
9. Review launch evidence.
10. Approve or block launch.

What success looks like: a new agency can reach a professional live presence and respond to enquiries without developer help.

If it fails: record the blocker in `docs/PROJECT_STATUS.md` and fix it before launch.
