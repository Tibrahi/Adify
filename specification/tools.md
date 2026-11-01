# ADIFY — TOOLS.md
## Technology Stack, Libraries, UI Standards & System Implementation Rules

### 1. Project Overview
ADIFY is an Africa-focused public event and ceremony discovery, publishing and booking-request platform.

This document defines the required technologies, libraries, UI standards, email workflows, form behaviors, responsive design rules and implementation constraints for ADIFY.

Follow these requirements throughout the project.

---

## 2. Required Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework and routing |
| React | User interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive layouts |
| Neon PostgreSQL | Primary relational database |
| S3-compatible storage | Event posters, cover images and supported uploads |
| Nodemailer | Transactional email delivery |
| Google SMTP | Email transport using authorized Google account credentials |
| Font Awesome | Action-related interface icons |
| Roboto | Application typography |
| libphonenumber | Phone number parsing and validation |
| World Countries data/library | Country names, ISO codes, flags, calling codes and related country information where supported |
| Serwist | Progressive Web App functionality |
| Intl | Internationalization, locale formatting, currency and date presentation |
| date-fns | Date manipulation and formatting |
| date-fns-tz or supported timezone utilities | Timezone-aware event scheduling and display |

Use compatible, maintained packages and follow the existing repository architecture.

Do not introduce duplicate libraries when an equivalent implementation already exists and meets these requirements.

---

## 3. Database — Neon PostgreSQL

Use Neon PostgreSQL as the primary database.

Requirements:
- Store users, organizers, events, ceremonies, venues, booking records, notifications, moderation records and other structured application data.
- Use relational tables with appropriate constraints and relationships.
- Use database transactions for operations requiring atomic consistency.
- Add suitable indexes for discovery, filtering, booking lookup and lifecycle queries.
- Enforce booking capacity on the server/database.
- Use migrations for schema changes.
- Follow the project's existing migration tooling.
- Never hardcode database records as production content.
- Never expose database credentials to the client.
- Use connection management appropriate for Neon serverless workloads.
- Implement appropriate database error handling, logging and retry policies.

Do not retry non-idempotent database operations blindly.

---

## 4. File Storage — S3-Compatible Storage

Use S3-compatible object storage for supported files, including:
- Event posters.
- Event cover images.
- Approved supporting event materials, if required.

Requirements:
- Store object keys and relevant metadata in Neon PostgreSQL.
- Do not store large image files directly in relational tables.
- Validate file types, sizes and actual content.
- Generate unique object keys.
- Restrict upload permissions.
- Use presigned uploads or secure server-mediated uploads where appropriate.
- Prevent unauthorized file replacement or deletion.
- Use private storage by default for non-public materials.
- Serve publicly intended event images through controlled public access or an appropriate delivery layer.
- Do not expose secret access keys.
- Clean up abandoned uploads when safe.
- Implement image optimization and suitable fallback images.

Public posters must not reveal confidential organizer information or private event access instructions.

---

## 5. Email System — Nodemailer + Google SMTP

Use Nodemailer with Google SMTP for application email workflows.

Configure credentials through environment variables.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
APP_BASE_URL=
```

Use the authentication method supported by the configured Google account.

Prefer Google App Passwords when eligible and permitted, or an appropriate OAuth-based SMTP authentication setup.

Never use a normal Google account password as a substitute for supported SMTP authentication.

Never expose SMTP credentials to browser code, public API responses, logs or version control.

### Email Use Cases

#### A. Registration
Send:
- Email verification code.
- Verification instructions.
- Verification success or relevant account notification, where useful.

Requirements:
- Generate cryptographically secure verification codes.
- Set code expiration.
- Enforce attempt limits and resend cooldowns.
- Store verification codes securely, preferably as hashes.
- Invalidate codes after successful use.
- Prevent repeated code use.
- Avoid revealing account existence.

#### B. Login
Send security notifications for relevant login events and verification codes when required by the chosen authentication policy.

Do not require an email verification code for every login unless the configured authentication/security flow requires it.

Implement:
- Secure verification challenges when applicable.
- Expiring codes.
- Attempt limits.
- Resend restrictions.
- Secure session establishment.

Do not send unnecessary emails for every routine login.

#### C. Password Recovery
Send password reset instructions or secure reset links.

Use:
- Short-lived, single-use reset tokens.
- Secure token storage.
- Generic account recovery responses.
- Rate limiting.

#### D. Event and Ceremony Creation
When an event or ceremony is created:
- Notify the organizer that the draft or submission was saved, as appropriate.
- If submitted for review, send a submission acknowledgment.
- If approved and published, notify the organizer.
- If rejected or returned for corrections, communicate the relevant decision.

Only send the corresponding notification for the actual completed action.

#### E. Booking Notifications
When a user submits a booking request:
- Notify the attendee.
- Notify the event organizer or authorized assigned partner.

The attendee email should contain:
- Event or ceremony name.
- Booking reference.
- Request status.
- Date and attendance format.
- Relevant next steps.

The organizer/partner email should contain:
- Event name.
- Booking reference.
- Request summary.
- A secure link to manage the booking.

Do not send unnecessary attendee personal information in emails.

#### F. Booking Status Updates
Notify attendees when:
- A booking is approved.
- A booking is declined.
- A booking is cancelled.
- A waitlist status changes.
- Important event changes affect attendance.

Send organizer notifications for relevant booking and event changes.

#### G. Help & Support Form
Connect the ADIFY Help & Support form to Nodemailer.

On successful submission:
- Send the support message to the configured support recipient.
- Send an acknowledgment to the user when appropriate.
- Validate and sanitize inputs.
- Apply rate limiting and spam protection.
- Include a support reference number when implemented.

Use a configured support address, not a hardcoded personal address.

Never allow the submitted form to choose arbitrary email recipients.

Protect against email header injection and abuse.

### Email Reliability
Implement:
- Reusable email templates.
- Centralized mail transport configuration.
- Email delivery error handling.
- Retryable notification processing.
- Notification status tracking.
- Idempotent notification handling where applicable.

Prefer a transactional outbox or durable notification queue for critical notifications.

A successful booking must not depend on immediate SMTP delivery.

Do not falsely show that an email was delivered when only an attempt was made.

---

## 6. Icons — Font Awesome

Use Font Awesome icons only.

Requirements:
- Use black icons by default.
- Select icons directly related to their actions.
- Keep icons simple and recognizable.
- Maintain consistent icon sizing and alignment.
- Use consistent icon styles throughout the application.
- Do not mix Lucide, Material Icons, Bootstrap Icons or other icon libraries.

Examples:
- Search → magnifying glass.
- Register → user-plus.
- Login → right-to-bracket.
- Logout → right-from-bracket.
- Create event → calendar-plus.
- Booking → ticket or calendar-check.
- Location → location-dot.
- Email → envelope.
- Notifications → bell.
- Settings → gear.
- Help → circle-question.
- Edit → pen-to-square.
- Delete → trash.
- Expand/read more → angle-down or chevron-down.

Use accessible labels for icon-only buttons.

### Icon Color
- Default: Black.
- On dark backgrounds, use an accessible contrasting icon color only when required.
- Do not use colored icons decoratively.
- Avoid unnecessary icon backgrounds.

Use the appropriate Font Awesome package and import only required icons.

---

## 7. UI Colors

Primary UI direction:
- White.
- Light green.
- Black for text and action icons.

Suggested starting palette:

| Role | Color |
|---|---|
| Main background | #FFFFFF |
| Primary light green | #DDF5E4 |
| Soft green background | #F2FBF4 |
| Green action | #247A45 |
| Main text | #171717 |
| Secondary text | #666666 |
| Borders | #E5E7EB |
| Error | #B42318 |

Use these as initial design tokens and maintain consistent contrast.

Requirements:
- White should remain the dominant background.
- Use light green for selected states, subtle highlights and supporting surfaces.
- Use a sufficiently dark green for primary buttons and important actions.
- Keep error, warning and success states distinguishable.
- Avoid excessive color usage.
- Maintain WCAG-accessible contrast where applicable.

Do not use light green text on white if readability is insufficient.

---

## 8. Typography — Roboto

Use Roboto as the primary font across ADIFY.

Requirements:
- Apply consistent typography globally.
- Define a clear heading hierarchy.
- Use readable body text.
- Keep form labels clear and distinct.
- Avoid unnecessary font weights and decorative styles.
- Load fonts efficiently using an appropriate self-hosted or framework-supported font strategy.

Suggested hierarchy:
- Page heading: 28–36px desktop, responsive on mobile.
- Section heading: 20–24px.
- Card title: 16–18px.
- Body: 14–16px.
- Supporting text: 12–14px.

Ensure readable line lengths and spacing.

---

## 9. Responsive Design & Automatic Screen Adaptation

Use Tailwind CSS responsive utilities and CSS layout systems.

The application must automatically adapt to the available viewport width and height.

Requirements:
- Support mobile, tablet, laptop and desktop.
- Use responsive breakpoints.
- Use flexible grids and layouts.
- Avoid fixed-width page layouts.
- Prevent horizontal overflow.
- Use responsive typography and spacing.
- Account for mobile browser safe areas.
- Ensure forms and modals fit smaller screens.
- Use appropriate touch target sizes.
- Support portrait and landscape orientations.

### Width and Height
Adapt the interface to both available width and height where useful.

Use:
- CSS Grid.
- Flexbox.
- Responsive width constraints.
- `min-height: 100dvh` where appropriate.
- Container queries when useful.
- `min()`, `max()` and `clamp()` where appropriate.

Do not rely only on device detection or user-agent strings.

Use the actual available viewport dimensions through CSS layout behavior.

Do not implement JavaScript resize listeners for ordinary responsive layout when CSS can handle it.

Avoid layouts that hide essential content on short screens.

---

## 10. Forms — Global Form Standards

Every application form must be a real form, not a poster, image or decorative representation of a form.

Use semantic HTML forms with actual input elements.

Requirements:
- Visible labels.
- Correct input types.
- Validation.
- Required and optional field indicators.
- Clear error messages.
- Accessible keyboard interaction.
- Submit loading states.
- Success and failure feedback.
- Server-side validation.
- Protection against duplicate submissions.
- Preservation of entered values after recoverable errors.
- Stable input focus while typing.

Do not cause the entire form to rerender in a way that replaces active inputs and makes users lose focus.

Do not use placeholders as the only labels.

Use appropriate input types, including:
- `text`
- `email`
- `password`
- `tel`
- `number`
- `date`
- `time`
- `url`
- `file`
- `checkbox`
- `radio`
- `search`

Choose input types based on the actual data being collected.

---

## 11. Incremental / Decremental Dynamic Inputs

Support dynamically adding or removing repeated input fields when the form requires multiple entries.

Examples:
- Additional contact persons.
- Additional event schedule sessions.
- Additional venue instructions.
- Additional registration questions.
- Additional organizers, where supported.
- Multiple event program items.

Each dynamic input group must have:
- A clear field label.
- An appropriate input type.
- An Add action.
- A Remove action.
- A stable unique key.
- Validation rules.
- Appropriate minimum and maximum counts.

### Behavior
- Add creates another input group.
- Remove deletes the selected input group.
- Removing one entry must not clear or reorder other users' entered values unexpectedly.
- Maintain stable focus and cursor position.
- Preserve entered values during editing.
- Use stable IDs rather than array indexes as React keys.
- Enforce limits on the client and server.
- Display validation errors next to the relevant field.
- Prevent users from accidentally deleting mandatory fields.

Do not make every form dynamically extensible without a genuine requirement.

For fixed fields, use a normal, simple form.

---

## 12. Event Creation Form vs. Event Poster

An event creation form and an event poster are different components.

### A. Event Creation Form
The organizer uses a functional form to enter structured event information.

Include necessary fields:
- Event title.
- Event class.
- Category.
- Description.
- Cover image/poster upload.
- Start and end dates.
- Start and end times.
- Timezone.
- Country and city.
- Attendance format.
- Venue or online details.
- Free or paid.
- Capacity and booking configuration.
- Registration deadline.
- Organizer details.
- Required event policies.

Use conditional fields depending on the selected attendance format and pricing configuration.

Avoid displaying irrelevant fields.

### B. Public Event Poster/Card
The public event poster or event card is a visual representation of the saved event data.

It is not an input form.

Show only essential information:
- Cover image.
- Event or ceremony title.
- Category or class.
- Date and time.
- Location or Online.
- Free/Paid.
- Limited attendance label where applicable.
- Booking availability, if accurate.
- View Details / Read More action.

Use a consistent poster/card layout across the homepage.

Do not place all event information directly on the poster.

### C. Read More / Hide
Support progressive disclosure for longer descriptions.

For event cards:
- Show a short, truncated description when useful.
- Provide a Read More or View Details action.
- Prefer opening the event details page for the complete information.

For expandable descriptions:
- Use an explicit Read More / Show Less control.
- Preserve accessible keyboard interaction.
- Keep card dimensions reasonably consistent.
- Avoid excessive expansion that makes the homepage difficult to browse.

For event details:
- Show essential information first.
- Organize additional information into clear sections.
- Use expandable sections for lengthy policies, schedules or supporting information when appropriate.
- Provide a clear way to collapse expanded content.

Do not hide critical booking rules, payment terms, venue details or attendance restrictions behind misleading controls.

---

## 13. Countries & Phone Numbers

Use a reliable world countries data source and libphonenumber-based utilities where necessary.

### Country Data
Use standardized country information for:
- Country names.
- ISO country codes.
- Country selection.
- Flags, where available.
- International calling codes.
- Country-specific formatting and localization.

Requirements:
- Avoid maintaining duplicated hardcoded country lists.
- Validate country codes.
- Support country selection independently of browser location.
- Do not assume every country has a unique calling code.
- Do not infer citizenship from country selection.

### Phone Number Inputs
Use libphonenumber-compatible functionality for:
- International phone number parsing.
- Validation.
- Formatting.
- Country calling code selection.

Requirements:
- Allow users to select the country calling code.
- Support international number formats.
- Validate on the server when phone verification or phone-based functionality is used.
- Distinguish syntactically valid numbers from actually verified phone ownership.

Do not require phone numbers for every user interaction.

---

## 14. Date, Time & Internationalization

Use `Intl`, `date-fns` and suitable timezone utilities.

Requirements:
- Display dates according to the relevant locale.
- Display event times in the event's local timezone.
- Show the timezone when it helps prevent confusion.
- Support events in different African countries.
- Handle daylight-saving changes where applicable.
- Correctly process multi-day events.
- Use reliable UTC timestamps and retain the event's IANA timezone identifier.
- Validate start/end time relationships.
- Use consistent date and time formatting.

Do not assume all African countries use the same timezone.

Do not treat a browser's timezone as the event timezone.

Use `Intl.NumberFormat` for currency formatting and include the correct currency code.

Do not infer the currency solely from the user's language.

Use `date-fns` for date operations and appropriate timezone-aware utilities for conversions and calculations.

Avoid unsafe date parsing and ambiguous date strings.

---

## 15. Progressive Web App — Serwist

Use Serwist to implement supported Progressive Web App capabilities.

Objective:
Allow eligible users to install ADIFY on compatible devices as an app-like experience.

Implement:
- Web app manifest.
- Appropriate application icons.
- Theme and background colors.
- Service worker.
- Installability support.
- Responsive app experience.
- Offline fallback page where appropriate.
- Controlled caching strategies.

### Caching Rules
- Cache safe static assets where appropriate.
- Use careful strategies for public event discovery data.
- Avoid serving misleadingly outdated availability information.
- Do not cache private dashboard or attendee information in shared caches.
- Do not cache authentication responses, verification codes, private booking data or sensitive API responses indiscriminately.
- Respect logout and account-switching boundaries.
- Define cache expiration and invalidation policies.

The application must remain usable in the browser even when installation is unavailable.

Do not claim that all devices support every PWA feature.

---

## 16. Help & Support Form

Create a functional Help & Support form.

Recommended fields:
- Name.
- Email.
- Topic.
- Message.
- Optional booking reference.
- Optional contact preference.

Connect the form to the application's server-side Nodemailer workflow.

Requirements:
- Validate all inputs.
- Limit message size.
- Add rate limiting.
- Protect against spam.
- Sanitize displayed content.
- Prevent email header injection.
- Use a configured support recipient.
- Provide a clear submission state.
- Provide a support reference when supported.
- Send an acknowledgment where appropriate.

Do not expose SMTP configuration or send mail directly from the browser.

---

## 17. Environment Variables

Maintain a documented `.env.example`.

Possible variables:

```env
DATABASE_URL=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
SUPPORT_EMAIL=

APP_BASE_URL=
SESSION_SECRET=
```

Add only the environment variables actually used by the implementation.

Use separate credentials and configuration for development and production.

Never commit real secrets.

Validate required configuration at startup or when the relevant service initializes.

Do not expose private environment variables through public framework prefixes.

---

## 18. Quality & Implementation Rules

Before implementing any feature:
1. Inspect existing code and database schema.
2. Reuse existing working infrastructure.
3. Identify required schema changes.
4. Implement through the existing project workflow.
5. Validate server and client behavior.
6. Test error scenarios.
7. Check responsive layouts.
8. Update project documentation.

Prioritize:
- Security.
- Correctness.
- Accessibility.
- Maintainability.
- Performance.
- Reliable user experience.

Do not:
- Create fake data.
- Use decorative images instead of functional forms.
- Hardcode production email recipients or secrets.
- Trust client-side validation alone.
- Expose private attendee information.
- Introduce unnecessary dependencies.
- Break existing routes or authentication.
- Claim successful email delivery without evidence.
- Claim complete PWA support without testing.

---

## 19. Definition of Done

The implementation must ensure:
- Neon PostgreSQL works reliably.
- S3-compatible uploads are secure.
- Nodemailer sends configured notifications.
- Registration and login verification workflows work correctly.
- Booking notifications reach the intended parties through the configured notification system.
- Help requests are processed securely.
- Font Awesome icons follow the design rules.
- Roboto typography is consistent.
- White and light green styling is coherent.
- Responsive layouts work across different viewport sizes.
- Dynamic form inputs work without focus loss.
- Event creation forms are functional.
- Public posters/cards remain compact and informative.
- Read More and Show Less behaviors work correctly.
- Country and phone number utilities work.
- Event dates and timezones are correct.
- PWA installation and caching behavior are tested.
- Protected data remains private.
- Existing project functionality is preserved.

**Final instruction:** Follow this document as the shared implementation standard for ADIFY. When a requirement conflicts with the existing architecture or a provider's limitations, explain the conflict, choose a secure compatible solution and document the implementation decision.
