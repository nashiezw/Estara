# ESTARA Launch Gates Step-By-Step Walkthrough

Last updated: 2026-08-22

Use this document as the exact working guide for clearing the launch gates shown in the ESTARA Super Admin screen.

The screenshots are evidence of the current ESTARA state. They are not instructions. The user request is: make a very detailed, plain-language walkthrough so the remaining production gates can be completed.

## Read This First

The launch screen still says the gates are not done because ESTARA needs proof files, not only a domain that appears to be connected.

For the "Domain and TLS evidence" gate, success means all of these are true:

1. The real production domain is attached to the deployed ESTARA Worker.
2. DNS points to the correct Cloudflare-controlled target.
3. The browser opens the URL with `https://`.
4. The browser shows no security warning.
5. An unknown/wrong host does not open another tenant or a private app page.
6. A smoke test proves the public route works.
7. The proof is saved inside the launch evidence bundle.
8. The command `npm run launch:evidence -- docs/evidence/production-launch.json` passes.

Do not paste API keys, passwords, private keys, Stripe keys, Cloudflare API tokens or other secret values into chat or into this document. Put secret values only inside the provider dashboard or Cloudflare secret store.

## The Five Gates You See In Super Admin

The Super Admin screen shows these gates:

1. `Provider accounts and live secrets`
2. `Domain and TLS evidence`
3. `D1 restore rehearsal`
4. `Mobile device audit`
5. `Owner launch approval`

There are also supporting evidence checks behind those gates:

1. Deployment proof
2. External penetration test closure
3. Billing settlement proof
4. Low-data hosted measurement
5. First sellable MVP approval

All of them go into one final file:

```text
docs/evidence/production-launch.json
```

## Folder Setup

Do this once before collecting evidence.

1. Open the ESTARA project folder on your computer.
2. Open the folder named `docs`.
3. Inside `docs`, create a new folder named `evidence` if it does not already exist.
4. The final folder path must be:

```text
docs/evidence
```

5. Save all screenshots, exported reports and text outputs for launch approval inside that folder.
6. Use clear file names. Good examples:

```text
cloudflare-domain-app-estara-co-zw.png
cloudflare-tls-active-app-estara-co-zw.png
provider-health-output.json
d1-restore-tenant-attacks.txt
mobile-audit-android.png
mobile-audit-ios.png
owner-launch-approval.txt
```

## Step 1: Confirm The Production URL

Use this section to decide the exact URL that should count as production.

Recommended ESTARA launch URLs:

```text
https://estara.co.zw
https://www.estara.co.zw
https://app.estara.co.zw
https://prime-property.estara.co.zw
```

Recommended meaning:

1. `https://estara.co.zw` is the public ESTARA homepage.
2. `https://www.estara.co.zw` opens the same public homepage.
3. `https://app.estara.co.zw` is the login/workspace app.
4. `https://{agency}.estara.co.zw` is the pattern for agency websites.

For the evidence bundle, choose the main production app URL as:

```text
https://app.estara.co.zw
```

If you are using a different final domain, replace every `estara.co.zw` example in this guide with your real domain.

## Step 2: Confirm Cloudflare Controls The Domain

This must be done before TLS can fully pass.

1. Open a browser.
2. Go to:

```text
https://dash.cloudflare.com/
```

3. Sign in to the Cloudflare account that owns ESTARA production.
4. On the left side, click `Websites`.
5. Look for your domain, for example:

```text
estara.co.zw
```

6. Click the domain name.
7. Look near the top of the page for the domain status.
8. The status must say `Active`.

If the domain is not listed:

1. Click `Add a domain` or `Add site`.
2. Type the domain exactly, for example:

```text
estara.co.zw
```

3. Continue until Cloudflare gives you two nameservers.
4. Keep the Cloudflare tab open.
5. Open your domain registrar in a new tab.
6. Find `Nameservers`, `DNS`, `Domain settings` or `Manage domain`.
7. Replace the old nameservers with the two Cloudflare nameservers.
8. Save.
9. Go back to Cloudflare.
10. Wait until Cloudflare says the domain is `Active`.

Save evidence:

1. Take a screenshot showing the domain name and `Active` status.
2. Save it as:

```text
docs/evidence/cloudflare-zone-active.png
```

## Step 3: Open The ESTARA Worker Project

1. In Cloudflare, click `Workers & Pages`.
2. Click `Overview`.
3. Click the ESTARA Worker or Pages project.
4. Confirm you are in the production project, not a test project.
5. Open the latest production deployment.
6. Confirm the latest deployment says it is successful.

Save evidence:

1. Take a screenshot of the successful deployment.
2. Save it as:

```text
docs/evidence/cloudflare-production-deployment.png
```

3. Copy the deployment URL shown by Cloudflare.
4. Copy the deployed Git commit SHA.
5. Keep both values ready for `production-launch.json`.

## Step 4: Add The Custom Domains And Tenant Wildcard Route

Cloudflare's current Worker path is:

```text
Workers & Pages > Overview > your Worker > Settings > Domains & Routes > Add > Custom Domain
```

Do the domains one at a time.

Use Custom Domains only for explicit hostnames such as `app.estara.co.zw`, `estara.co.zw`, `www.estara.co.zw` and approved agency-owned custom domains. ESTARA-hosted tenant websites use the wildcard Worker route `*.estara.co.zw/*`, not a wildcard Custom Domain.

### Add `app.estara.co.zw`

1. In Cloudflare, stay inside the ESTARA Worker project.
2. Click `Settings`.
3. Click `Domains & Routes`.
4. Click `Add`.
5. Click `Custom Domain`.
6. In the domain box, type:

```text
app.estara.co.zw
```

7. Click `Add Custom Domain`.
8. Wait for Cloudflare to create the DNS record and certificate.
9. Do not close the page until Cloudflare shows the domain as active or ready.

Save evidence:

1. Take a screenshot showing `app.estara.co.zw` attached to the Worker.
2. Save it as:

```text
docs/evidence/cloudflare-custom-domain-app.png
```

### Add `estara.co.zw`

1. Click `Add`.
2. Click `Custom Domain`.
3. Type:

```text
estara.co.zw
```

4. Click `Add Custom Domain`.
5. Wait for the status to become active or ready.

Save evidence:

```text
docs/evidence/cloudflare-custom-domain-root.png
```

### Add `www.estara.co.zw`

1. Click `Add`.
2. Click `Custom Domain`.
3. Type:

```text
www.estara.co.zw
```

4. Click `Add Custom Domain`.
5. Wait for the status to become active or ready.

Save evidence:

```text
docs/evidence/cloudflare-custom-domain-www.png
```

### Add The Hosted-Tenant Wildcard Route

This route is for ESTARA-hosted agency websites such as:

```text
https://prime-property.estara.co.zw
```

Do not create tenant sites under nested hostnames, and do not use `app.estara.co.zw` for an agency.

1. In Cloudflare, open `Websites`.
2. Click `estara.co.zw`.
3. Click `DNS`.
4. Click `Records`.
5. Add a proxied wildcard placeholder DNS record:

```text
Type: AAAA
Name: *
Content: 100::
Proxy status: Proxied
```

6. Go back to `Workers & Pages`.
7. Open the ESTARA Worker.
8. Click `Settings`.
9. Click `Domains & Routes`.
10. Add or confirm this Worker route:

```text
*.estara.co.zw/*
```

11. Confirm the route points to the ESTARA Worker.
12. Confirm `app.estara.co.zw` remains listed separately as an explicit Custom Domain.

Save evidence:

```text
docs/evidence/cloudflare-wildcard-tenant-route.png
```

If Cloudflare refuses to add a domain because an old DNS record already exists:

1. Go to Cloudflare.
2. Click `Websites`.
3. Click `estara.co.zw`.
4. Click `DNS`.
5. Click `Records`.
6. Look for the record with the same name, for example `app`.
7. If it points to an old target, delete or edit that old record.
8. Go back to `Workers & Pages`.
9. Open the ESTARA Worker.
10. Go back to `Settings > Domains & Routes`.
11. Add the custom domain again.

Do not delete MX, SPF, DKIM or DMARC email records unless you know they are wrong.

## Step 5: Prove TLS Is Active

Do this after each explicit custom domain is attached, and then also prove the wildcard tenant route has valid TLS.

1. Open a new private/incognito browser window.
2. In the address bar, type:

```text
https://app.estara.co.zw/login
```

3. Press Enter.
4. Confirm the page opens.
5. Confirm the browser does not show a red warning page.
6. Click the lock or tune icon next to the address bar.
7. Open `Connection is secure` or `Certificate`.
8. Confirm the certificate is valid for `app.estara.co.zw`.

Save evidence:

```text
docs/evidence/tls-app-estara-co-zw.png
```

Repeat for:

```text
https://estara.co.zw
https://www.estara.co.zw
https://prime-property.estara.co.zw
```

For the hosted tenant test, use a real onboarded agency slug when one exists. If no agency is onboarded yet, use an intentionally unknown slug such as `wrong-launch-test.estara.co.zw`; that host should still have a valid certificate but must not expose tenant data.

Save evidence:

```text
docs/evidence/tls-root-estara-co-zw.png
docs/evidence/tls-www-estara-co-zw.png
docs/evidence/tls-tenant-estara-co-zw.png
```

## Step 6: Prove The Domain Opens The Correct Routes

Open these in a browser:

```text
https://estara.co.zw
https://www.estara.co.zw
https://app.estara.co.zw/login
https://prime-property.estara.co.zw
```

For each page:

1. Wait for the page to finish loading.
2. Confirm the page shows ESTARA.
3. Confirm there is no browser security warning.
4. Confirm the URL still starts with `https://`.

For the tenant URL, use a real onboarded agency slug. Also open `https://wrong-launch-test.estara.co.zw` and confirm it fails closed instead of showing another tenant's website.
5. Take a screenshot.

Save evidence:

```text
docs/evidence/public-route-root.png
docs/evidence/public-route-www.png
docs/evidence/public-route-app-login.png
```

Then sign in to ESTARA.

1. Open:

```text
https://app.estara.co.zw/login
```

2. Type the production owner email.
3. Type the password.
4. Click the login button.
5. Open:

```text
https://app.estara.co.zw/workspace
```

6. Confirm the workspace opens.
7. Take a screenshot.
8. Save it as:

```text
docs/evidence/public-route-app-workspace.png
```

## Step 7: Prove Unknown Hosts Fail Closed

This proves that a wrong domain does not accidentally open private content.

1. Open a browser.
2. In the address bar, type a fake host under your domain:

```text
https://wrong-launch-test.estara.co.zw
```

3. Press Enter.
4. Confirm it does not open a private workspace.
5. Confirm it does not open another agency tenant.
6. A not-found page, blocked page, DNS error or safe public error is acceptable.

Save evidence:

```text
docs/evidence/unknown-host-fail-closed.png
```

## Step 8: Complete Provider Accounts And Live Secrets

The app expects these provider areas to be production-ready:

1. Cloudflare hosting, DNS, TLS, D1, R2, Queues and WAF
2. Resend transactional email
3. Firebase Cloud Messaging web push
4. Sentry and Cloudflare logs
5. Stripe online payments

### Add Cloudflare Variables And Secrets

1. Open Cloudflare.
2. Click `Workers & Pages`.
3. Click the ESTARA Worker project.
4. Click `Settings`.
5. Find `Variables and Secrets`.
6. Click `Add`.
7. Add each value below that is not already managed by `config/cloudflare-production-vars.json`.
8. For private values, choose `Secret`.
9. For non-private configuration values, choose `Text`.
10. Click `Deploy` or save the changes so Cloudflare applies them to the Worker.

The deployment config already owns these normal non-secret Worker variables:

```text
PUBLIC_SITE_DOMAIN=estara.co.zw
MEDIA_BUCKET=site-creator-r2
BACKUP_BUCKET=estara-backups
```

Do not manually maintain different dashboard values for those three. If they need to change, update `config/cloudflare-production-vars.json` and redeploy.

Required Cloudflare provider values:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Required Resend values:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_WEBHOOK_SECRET
```

Required Firebase values:

```text
FCM_PROJECT_ID
FCM_CLIENT_EMAIL
FCM_PRIVATE_KEY
NEXT_PUBLIC_FCM_VAPID_KEY
```

Required Sentry values:

```text
SENTRY_DSN
SENTRY_RELEASE
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

Required Stripe values:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER
STRIPE_PRICE_GROWTH
```

Save evidence:

1. Take screenshots showing the variable names are present.
2. Make sure secret values are hidden in screenshots.
3. Save them as:

```text
docs/evidence/cloudflare-vars-secrets.png
```

### Resend Email Evidence

1. Open Resend.
2. Open the ESTARA sending domain.
3. Confirm the domain is verified.
4. Confirm SPF, DKIM and DMARC are passing or accepted by Resend.
5. Open webhooks.
6. Confirm the production webhook endpoint is configured.
7. Send a production test email from ESTARA.
8. Confirm the email arrives.
9. Confirm Resend shows delivered status.

Save evidence:

```text
docs/evidence/resend-domain-verified.png
docs/evidence/resend-webhook-configured.png
docs/evidence/resend-delivered-email.png
```

### Firebase Push Evidence

1. Open Firebase Console.
2. Open the ESTARA Firebase project.
3. Open project settings.
4. Confirm the Web Push certificate/VAPID key exists.
5. Open ESTARA in production at:

```text
https://app.estara.co.zw
```

6. Sign in.
7. Enable notifications only if the browser asks for permission.
8. Confirm the app captures a device token.
9. Send a safe test push.
10. Confirm the browser receives it or the delivery ledger records the attempt.

Save evidence:

```text
docs/evidence/firebase-web-push-configured.png
docs/evidence/firebase-test-push-result.png
```

### Sentry And Logs Evidence

1. Open Sentry.
2. Open the ESTARA project.
3. Confirm the production release exists.
4. Confirm the release tag matches the deployed commit SHA or release name.
5. Trigger a safe test error in a non-public or controlled production test path.
6. Confirm Sentry records the error.
7. Confirm alert recipients are configured.
8. Open Cloudflare logs.
9. Confirm production requests are being retained.

Save evidence:

```text
docs/evidence/sentry-release-active.png
docs/evidence/sentry-alerts-configured.png
docs/evidence/cloudflare-logs-retained.png
```

### Stripe Evidence

1. Open Stripe.
2. Make sure the dashboard is in `Live` mode.
3. Open Products.
4. Confirm the Starter price exists.
5. Confirm the Growth price exists.
6. Open Developers.
7. Open Webhooks.
8. Confirm the production webhook endpoint exists.
9. Run a real or approved live-mode payment test.
10. Confirm a paid invoice exists.
11. Confirm settlement or payout reconciliation is recorded.
12. Confirm refund handling is tested.
13. Confirm failed-payment handling is tested.
14. Ask the finance owner to sign off.

Save evidence:

```text
docs/evidence/stripe-live-prices.png
docs/evidence/stripe-webhook-configured.png
docs/evidence/stripe-paid-invoice.png
docs/evidence/stripe-settlement-reconciled.png
docs/evidence/stripe-refund-tested.png
docs/evidence/stripe-failed-payment-tested.png
docs/evidence/finance-signoff.txt
```

## Step 9: Check The ESTARA Health Page

The screenshot shows `System health` stuck on `Running service checks...`. That means the page had not yet received a successful health response when the screenshot was taken.

After the production deployment and secrets are added:

1. Open:

```text
https://app.estara.co.zw/health
```

2. Wait 30 seconds.
3. If it still says `Running service checks...`, refresh the page.
4. If it shows `healthy`, continue.
5. If it shows `unhealthy`, read the provider readiness section.
6. Write down every missing environment variable or failing service.
7. Go back to Cloudflare `Variables and Secrets`.
8. Fix the missing values.
9. Deploy again.
10. Open `/health` again.

Save evidence:

```text
docs/evidence/provider-health-output.png
```

If you can export or copy the health JSON, save it as:

```text
docs/evidence/provider-health-output.json
```

## Step 10: Complete The D1 Restore Rehearsal

Important: do not restore production in place for this rehearsal. Use an isolated recovery database or isolated environment.

You need a person with Cloudflare and command-line access for this section.

### Confirm The Production D1 Backend

1. Open a terminal in the ESTARA project folder.
2. Run:

```bash
npx wrangler d1 info <PRODUCTION_DATABASE_NAME_OR_ID>
```

3. Confirm the output says:

```text
version: production
```

4. Save the output as:

```text
docs/evidence/d1-production-info.txt
```

### Capture The Time Travel Bookmark

1. In the same terminal, run:

```bash
npx wrangler d1 time-travel info <PRODUCTION_DATABASE_NAME_OR_ID>
```

2. Copy the current bookmark from the output.
3. Save the full output as:

```text
docs/evidence/d1-time-travel-info.txt
```

### Restore Into An Isolated Recovery Target

1. Create or choose a recovery-only D1 database.
2. Confirm it is not the production database.
3. Restore the selected bookmark or timestamp into the recovery target.
4. Use Cloudflare's D1 Time Travel restore command only against the recovery target.
5. Record the restored bookmark from the output.
6. Save the restore output as:

```text
docs/evidence/d1-restore-output.txt
```

### Bind The App To The Restored Database

1. Deploy or preview the exact tested ESTARA app revision.
2. Bind it to the recovery D1 database.
3. Use a recovery-only URL or binding name.
4. Confirm the recovery URL is not public launch traffic.

Save evidence:

```text
docs/evidence/d1-recovery-binding.png
```

### Run The Tenant Attack Suite

1. Open a terminal in the ESTARA project folder.
2. Make sure the environment points to the restored recovery database.
3. Run:

```bash
node --test tests/cross-tenant-attacks.test.mjs
```

4. Confirm the command exits successfully.
5. Save the command output as:

```text
docs/evidence/d1-restore-tenant-attacks.txt
```

### Create `d1-restore-rehearsal.json`

Create this file:

```text
docs/evidence/d1-restore-rehearsal.json
```

Use this shape and replace the example values with the real values:

```json
{
  "rehearsalId": "d1-restore-2026-08-22",
  "startedAt": "2026-08-22T08:00:00.000Z",
  "completedAt": "2026-08-22T08:42:00.000Z",
  "appRevision": "0123456789abcdef",
  "isolatedEnvironment": true,
  "productionBackendVersion": "production",
  "restoreTarget": "estara-recovery-2026-08-22",
  "sourceDatabase": "estara-prod",
  "restoredDatabaseBinding": "ESTARA_RECOVERY_D1",
  "sourceBookmark": "paste-real-source-bookmark-here",
  "restoredBookmark": "paste-real-restored-bookmark-here",
  "snapshotId": "snapshot-2026-08-22",
  "rpoHours": 1,
  "rtoMinutes": 42,
  "validations": {
    "rowCountsVerified": true,
    "foreignKeysVerified": true,
    "tenantOwnershipVerified": true,
    "objectManifestVerified": true,
    "sampledPrivateObjectsVerified": true,
    "healthCheckPassed": true
  },
  "tenantAttackSuite": {
    "command": "node --test tests/cross-tenant-attacks.test.mjs",
    "exitCode": 0,
    "completedAt": "2026-08-22T08:39:00.000Z",
    "outputRef": "d1-restore-tenant-attacks.txt"
  },
  "approval": {
    "recoveryOwner": "Actual Recovery Owner Name",
    "dataOwner": "Actual Data Owner Name",
    "decision": "accepted"
  }
}
```

Then verify it:

```bash
npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json
```

Success looks like the command passes with no errors.

## Step 11: Complete The Mobile Device Audit

Use real devices. Browser resizing on a laptop is not enough for this gate.

Required devices:

1. Low-end Android phone with Chrome.
2. iPhone with Safari.
3. Desktop Chrome or Edge for a sanity pass.

Required networks:

1. Normal Wi-Fi or mobile data.
2. Slow 3G or throttled network.
3. Interrupted/offline test during property capture and photo upload.
4. Low-data mode enabled inside ESTARA.

For each device:

1. Open:

```text
https://app.estara.co.zw
```

2. Sign in.
3. Go through landing to workspace.
4. Complete agency onboarding.
5. Add a property from mobile.
6. Add title, location, transaction type, price, beds, baths, size and owner phone.
7. Add multiple photos using the phone camera or file picker.
8. Reload before saving and confirm the draft recovers.
9. Save the property.
10. Activate the property.
11. Open the public agency website.
12. Open a property detail page.
13. Tap call, WhatsApp, enquiry, viewing and share actions.
14. Submit an enquiry.
15. Submit a viewing request.
16. Turn on low-data mode.
17. Confirm images are reduced or suppressed where expected.
18. Test keyboard-only navigation on desktop.
19. Turn on reduced motion in the device/browser if available.
20. Confirm the app remains usable.

Create this evidence file:

```text
docs/evidence/mobile-audit.txt
```

Use this exact structure:

```text
ESTARA Mobile Audit
Date:
Tester:
Production URL:

Android device:
Android OS version:
Chrome version:
Network profiles tested:
Result: PASS or FAIL
Screenshots saved:
Issues found:
Retest result:

iPhone device:
iOS version:
Safari version:
Network profiles tested:
Result: PASS or FAIL
Screenshots saved:
Issues found:
Retest result:

Desktop browser:
Browser version:
Keyboard-only result:
Reduced-motion result:

Final mobile audit decision:
Android passed: yes/no
iOS passed: yes/no
Tester sign-off:
```

Save screenshots or recordings as:

```text
docs/evidence/mobile-android-landing.png
docs/evidence/mobile-android-property-capture.png
docs/evidence/mobile-android-public-detail.png
docs/evidence/mobile-android-enquiry.png
docs/evidence/mobile-ios-landing.png
docs/evidence/mobile-ios-property-capture.png
docs/evidence/mobile-ios-public-detail.png
docs/evidence/mobile-ios-enquiry.png
```

## Step 12: Complete Low-Data Hosted Measurement

This must run against the hosted production deployment, not only local development.

Create:

```text
docs/evidence/low-data-production.json
```

Run the low-data verification command:

```bash
npm run low-data:verify -- docs/evidence/low-data-production.json
```

The final production evidence file must point to this file.

If this command fails:

1. Read the exact failure message.
2. Fix the missing viewport, image request count or byte-reduction issue.
3. Re-run the command.
4. Do not mark low-data evidence complete until it passes.

## Step 13: Complete External Penetration Test

This cannot be self-approved by the product owner or developer.

1. Hire or assign an independent security tester.
2. Give them the production URL.
3. Give them the agreed scope.
4. Include public pages, login, workspace, tenant isolation, uploads, seller portal, viewing requests, enquiries and billing.
5. Receive the report.
6. Fix all launch-blocking findings.
7. Ask the tester to confirm closure.

Save evidence:

```text
docs/evidence/penetration-test-report.pdf
docs/evidence/penetration-test-closure.txt
```

The final evidence requires:

```text
independentTester: true
launchBlockingFindingsOpen: 0
```

## Step 14: Complete Owner Launch Approval

Create:

```text
docs/evidence/owner-launch-approval.txt
```

Use this structure:

```text
ESTARA Owner Launch Approval

Product owner:
Production URL:
Deployed commit SHA:
Approved access level: public
Launch date:
Approval timestamp:

I approve ESTARA for public launch using the production URL and deployed commit SHA listed above.

Product owner name:
Decision: approved
```

The final evidence file must also include the owner name, approval timestamp and access level `public`.

## Step 15: Complete First Sellable MVP Approval

Create:

```text
docs/evidence/first-sellable-mvp-approval.txt
```

Use this checklist:

```text
ESTARA First Sellable MVP Approval

Product owner:
Production URL:
Commit SHA:
Approval timestamp:

Approved journeys:
[ ] landing-to-workspace
[ ] onboarding
[ ] property-capture
[ ] public-site
[ ] enquiry
[ ] viewing
[ ] seller
[ ] billing
[ ] admin
[ ] recovery

Decision: approved / blocked
Notes:
```

Every journey must be approved before `production-launch.json` can pass.

## Step 16: Create The Final Production Evidence File

Create:

```text
docs/evidence/production-launch.json
```

Use this template. Replace every example value with the real value.

```json
{
  "productionUrl": "https://app.estara.co.zw",
  "commitSha": "0123456789abcdef",
  "capturedAt": "2026-08-22T10:00:00.000Z",
  "deployment": {
    "sitesProjectId": "paste-real-cloudflare-or-sites-project-id",
    "deploymentUrl": "https://paste-real-deployment-url.example",
    "commitSha": "0123456789abcdef",
    "ready": true
  },
  "providers": [
    {
      "area": "hosting_dns_tls_storage",
      "configuredEnv": true,
      "healthReady": true,
      "smokeTestPassed": true,
      "activationEvidenceRefs": [
        "cloudflare-production-deployment.png",
        "cloudflare-custom-domain-app.png",
        "tls-app-estara-co-zw.png",
        "provider-health-output.png",
        "cloudflare-logs-retained.png",
        "unknown-host-fail-closed.png"
      ]
    },
    {
      "area": "transactional_email",
      "configuredEnv": true,
      "healthReady": true,
      "smokeTestPassed": true,
      "activationEvidenceRefs": [
        "resend-domain-verified.png",
        "resend-webhook-configured.png",
        "resend-delivered-email.png"
      ]
    },
    {
      "area": "web_push",
      "configuredEnv": true,
      "healthReady": true,
      "smokeTestPassed": true,
      "activationEvidenceRefs": [
        "firebase-web-push-configured.png",
        "firebase-test-push-result.png",
        "provider-health-output.png"
      ]
    },
    {
      "area": "error_retention_alerting",
      "configuredEnv": true,
      "healthReady": true,
      "smokeTestPassed": true,
      "activationEvidenceRefs": [
        "sentry-release-active.png",
        "sentry-alerts-configured.png",
        "cloudflare-logs-retained.png"
      ]
    },
    {
      "area": "online_payments",
      "configuredEnv": true,
      "healthReady": true,
      "smokeTestPassed": true,
      "activationEvidenceRefs": [
        "stripe-live-prices.png",
        "stripe-webhook-configured.png",
        "stripe-paid-invoice.png",
        "stripe-settlement-reconciled.png"
      ]
    }
  ],
  "domainTls": {
    "domainAttached": true,
    "dnsVerified": true,
    "tlsActive": true,
    "unknownHostFailClosed": true,
    "publicRouteSmokeTestPassed": true
  },
  "d1Restore": {
    "isolatedEnvironment": true,
    "timeTravelRestoreVerified": true,
    "tenantAttackSuitePassed": true,
    "evidenceRef": "d1-restore-rehearsal.json"
  },
  "penetrationTest": {
    "independentTester": true,
    "launchBlockingFindingsOpen": 0,
    "reportRef": "penetration-test-report.pdf"
  },
  "publicAccessApproval": {
    "productOwner": "Actual Product Owner Name",
    "approvedAt": "2026-08-22T10:30:00.000Z",
    "accessLevel": "public"
  },
  "billingSettlement": {
    "liveMode": true,
    "paidInvoiceVerified": true,
    "settlementReconciled": true,
    "refundVerified": true,
    "failedPaymentVerified": true,
    "financeSignoff": "Actual Finance Owner Name"
  },
  "lowData": {
    "verifierPassed": true,
    "evidenceFile": "low-data-production.json"
  },
  "mobileAudit": {
    "androidPassed": true,
    "iosPassed": true,
    "auditRef": "mobile-audit.txt"
  },
  "mvpApproval": {
    "productOwner": "Actual Product Owner Name",
    "approvedAt": "2026-08-22T11:00:00.000Z",
    "journeysApproved": [
      "landing-to-workspace",
      "onboarding",
      "property-capture",
      "public-site",
      "enquiry",
      "viewing",
      "seller",
      "billing",
      "admin",
      "recovery"
    ]
  }
}
```

Important:

1. `deployment.commitSha` must exactly match the top-level `commitSha`.
2. `productionUrl` must start with `https://`.
3. Local evidence file names must point to files inside `docs/evidence`.
4. Do not use fake screenshots or fake sign-offs.
5. Do not mark a field as `true` until the evidence exists.

## Step 17: Run The Final Checks

Open a terminal in the ESTARA project folder.

Run:

```bash
npm run launch:readiness
```

Then run:

```bash
npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json
```

Then run:

```bash
npm run low-data:verify -- docs/evidence/low-data-production.json
```

Then run:

```bash
npm run launch:evidence -- docs/evidence/production-launch.json
```

Final success means:

1. D1 restore evidence passes.
2. Low-data evidence passes.
3. Production launch evidence passes.
4. `npm run launch:readiness` no longer reports public-launch blockers.

## If Domain And TLS Still Shows As Not Done

Use this exact troubleshooting order.

1. Open Cloudflare.
2. Click `Websites`.
3. Click `estara.co.zw`.
4. Confirm the zone says `Active`.
5. Click `DNS`.
6. Click `Records`.
7. Confirm there is no old conflicting record for `app`.
8. Confirm there is a proxied wildcard DNS record for `*`.
9. Click `Workers & Pages`.
10. Open the ESTARA Worker.
11. Click `Settings`.
12. Click `Domains & Routes`.
13. Confirm `app.estara.co.zw` is listed as a Custom Domain.
14. Confirm `estara.co.zw` is listed if the root homepage is meant to use the Worker.
15. Confirm `www.estara.co.zw` is listed if www is meant to use the Worker.
16. Confirm `*.estara.co.zw/*` is listed as a Worker route for hosted tenant websites.
17. Open `https://app.estara.co.zw/login` in a private browser window.
18. Open a hosted tenant URL such as `https://prime-property.estara.co.zw` or an unknown-host test such as `https://wrong-launch-test.estara.co.zw`.
19. Confirm the lock icon appears.
20. Confirm the unknown-host test fails closed and does not show another tenant's public website.
21. Take the screenshot.
22. Save the screenshot inside `docs/evidence`.
23. Open `docs/evidence/production-launch.json`.
24. Confirm `domainTls.domainAttached` is `true`.
25. Confirm `domainTls.dnsVerified` is `true`.
26. Confirm `domainTls.tlsActive` is `true`.
27. Confirm `domainTls.unknownHostFailClosed` is `true`.
28. Confirm `domainTls.publicRouteSmokeTestPassed` is `true`.
29. Confirm the related screenshots are referenced in `providers[0].activationEvidenceRefs`.
30. Run:

```bash
npm run launch:evidence -- docs/evidence/production-launch.json
```

If it still fails, read the exact line printed by the command. Fix that exact missing field or missing file.

## Official References Used For Cloudflare Steps

Cloudflare documents the same dashboard paths used here:

1. Worker Custom Domains: `Workers & Pages > Worker > Settings > Domains & Routes > Add > Custom Domain`
2. Worker Variables and Secrets: `Workers & Pages > Worker > Settings > Variables and Secrets > Add`
3. D1 Time Travel: `wrangler d1 time-travel info` and `wrangler d1 time-travel restore`

Helpful links:

```text
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
https://developers.cloudflare.com/workers/configuration/environment-variables/
https://developers.cloudflare.com/workers/configuration/secrets/
https://developers.cloudflare.com/d1/reference/time-travel/
```
