# ESTARA Mobile Journey Audit

This audit is the required manual proof for the remaining mobile launch gate. Automated tests cover the code-level foundations; this file defines the exact device work that must be run before the gate can be marked complete.

## Status

- Current state: criteria defined and source-level journey controls are test-backed.
- Launch gate: pending real-device execution on representative low-end Android and iOS devices.
- Evidence owner: product owner or QA lead.

## Required Devices

- Low-end Android phone: Android 10 or later, Chrome, 360px to 412px wide viewport.
- iPhone: iOS Safari, 375px to 430px wide viewport.
- Desktop sanity pass: current Chrome or Edge, responsive and keyboard-only checks.

## Required Network Profiles

- Normal mobile data or Wi-Fi.
- Slow 3G or equivalent throttled network.
- Offline or interrupted network during property capture and photo upload.
- Low-data mode enabled from the workspace header.

## Journeys To Exercise

1. Landing page to private workspace
   - Open the landing page.
   - Confirm ESTARA identity and calls to action fit without overlap.
   - Continue into the workspace.
   - Confirm mobile logo, bottom navigation and add-property floating action button are reachable.

2. Agency onboarding
   - Start with agency name, logo, phone number, colors, website template and subdomain.
   - Confirm each step is readable, tappable and recoverable after validation errors.
   - Confirm completion hands off to first-property capture.

3. Mobile property capture
   - Open capture from the floating action button.
   - Enter title, location, transaction, price, beds, baths, size and owner phone.
   - Use camera/file capture for multiple images.
   - Reload before saving and confirm the device draft and queued photos recover.
   - Save the secure draft and confirm upload retry or failure messaging is visible.

4. Property activation
   - Open the property list on mobile.
   - Confirm thumbnails are suppressed when low-data mode is enabled.
   - Complete required fields until activation is enabled.
   - Activate the property and confirm status, timeline and channel result feedback.

5. Public agency website
   - Open the agency home page, property list and property detail page.
   - Confirm call, WhatsApp, enquiry, viewing and share actions are visible and tappable.
   - Submit an enquiry with invalid/failed network and confirm retry messaging.
   - Submit a viewing request with a preferred time and confirm success feedback.

6. Agent daily operations
   - Record a manual enquiry.
   - Book a viewing from an enquiry.
   - Complete, reassign and reschedule next actions.
   - Confirm keyboard, date/time and phone inputs use appropriate mobile keyboards.

7. Accessibility and motion
   - Run the desktop keyboard-only pass with visible focus on buttons, links and form controls.
   - Enable reduced motion at OS/browser level and confirm animations/transitions do not distract.
   - Confirm modal backdrops can be dismissed intentionally and do not trap the user.

## Evidence To Record

For each device and network profile, record:

- Device model, OS version and browser version.
- Date, tester and environment URL.
- Pass/fail for each journey.
- Screenshots or short screen recordings for landing, capture, public detail and enquiry/viewing submission.
- Any issue ID or reproduction notes for failed steps.

## Completion Rule

Mark the delivery checklist mobile audit row complete only after both representative phones pass every required journey, or after all blocking issues have been fixed and re-tested on the same device classes.
