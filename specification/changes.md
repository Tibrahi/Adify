# ADIFY — MANDATORY REPAIR, DATABASE MIGRATION & FEATURE ENFORCEMENT PROMPT

## EXECUTION MODE: MANDATORY
**Priority: Critical — Fix existing failures before adding new features.**

Inspect the complete existing ADIFY repository and implement the following repairs directly in the codebase.

These instructions are mandatory. Do not merely provide explanations, recommendations, example snippets or a checklist. Inspect, modify, test and verify the implementation.

Do not rebuild the project from scratch. Preserve existing working features, authentication, UI, routes and business logic unless changes are necessary to resolve the specified issues.

---

# 1. CRITICAL: REMOVE S3 COMPLETELY

Remove S3 and all S3-related infrastructure from ADIFY.

Search the entire repository, including:
- Application source code.
- API routes.
- Server actions.
- Database schema and migrations.
- Storage utilities.
- Upload components.
- Dependencies.
- Environment configuration.
- `.env.example`.
- Package scripts.
- Documentation.
- Deployment configuration.
- Background jobs.
- Email templates.

Remove:
- S3Client and related integrations.
- AWS SDK packages used exclusively for S3.
- S3 upload/download/delete utilities.
- S3 bucket configuration.
- S3 endpoint configuration.
- S3 access keys and secrets.
- Presigned URL generation.
- S3-specific storage adapters.
- S3-only dependencies.
- S3-specific environment variables.
- S3-only documentation and scripts.

Remove all unused S3 configuration from environment examples and deployment documentation.

Identify existing S3-related database columns, references and migrations.

Create safe migrations where required. Do not blindly drop columns or tables that may contain meaningful existing data.

Preserve existing uploaded files where possible before removing their storage references or deleting any data.

Do not leave broken imports, dead storage services, unused S3 dependencies or references to S3 in active application code.

## Replacement Storage
Use Neon PostgreSQL as the application's persistent data storage system.

For event posters and supported images, implement a database-compatible storage solution without S3.

Requirements:
- Use validated image uploads.
- Enforce file size and type restrictions.
- Validate actual file content.
- Prevent unauthorized uploads.
- Use appropriate database storage, such as PostgreSQL BYTEA for supported image files, if suitable.
- Store image metadata and ownership information.
- Serve images through controlled server-side routes.
- Prevent unrestricted database file downloads.
- Enforce authorization for private files.
- Optimize image sizes before storage when practical.

Do not store image files as enormous base64 strings in ordinary event JSON fields.

If using PostgreSQL BYTEA, use a suitable separate image table and reference the image record from the event.

Apply strict file size limits and avoid loading unnecessarily large binary payloads into application memory.

If the existing database/provider limits make a proposed file storage implementation unsuitable, implement a safe supported alternative without reintroducing S3.

---

# 2. CRITICAL: NEON POSTGRESQL MUST BE THE SOURCE OF TRUTH

The existing application must not rely on hardcoded records, local arrays, in-memory objects, mock repositories, browser storage or temporary variables as substitutes for persistent production data.

Inspect all features and replace inappropriate temporary data storage with Neon PostgreSQL persistence.

This includes:
- User profiles.
- Organizer information.
- Events.
- Ceremonies.
- Event publication status.
- Booking requests.
- Booking status.
- Attendance settings.
- Event categories.
- Country and currency selections where persistence is required.
- Notifications.
- Help submissions, if the Help workflow remains implemented.
- Email notification records.
- Event image metadata and supported image content.
- User preferences.
- Relevant administrative records.

Static reference data, UI configuration, country metadata and non-user-specific constants may remain in code or maintained libraries where appropriate.

Do not persist every reference dataset unnecessarily.

## Mandatory Persistence Rules
1. Every successful data mutation must be persisted in Neon PostgreSQL.
2. A successful UI action must not merely update local component state.
3. Reloading the application must not erase saved data.
4. Logging out and logging back in must preserve the user's legitimate records.
5. Different users must see only their authorized data.
6. All protected mutations must be validated server-side.
7. Booking operations must enforce capacity and prevent duplicate submissions.
8. Do not use browser localStorage or IndexedDB as the primary source of truth for events, bookings, users or notifications.
9. Do not fabricate successful database writes.
10. Do not silently fall back to mock data when Neon is unavailable.

If the database is unavailable, show a meaningful error and preserve recoverable user input where appropriate.

---

# 3. CRITICAL: REPAIR EMAIL DELIVERY — EMAIL MUST ACTUALLY WORK

Email is a required ADIFY feature, not an optional placeholder.

The application already requires Nodemailer and Google SMTP. Repair the existing integration instead of replacing it unnecessarily.

Inspect:
- SMTP transport configuration.
- Environment variables.
- Email service initialization.
- Authentication and verification workflows.
- Registration routes.
- Login verification flows.
- Password recovery.
- Event creation workflows.
- Booking submission workflows.
- Help form.
- Notification templates.
- Server logs.
- Deployment configuration.
- Email error handling.

Identify the actual cause of email failure and fix it.

Do not assume the problem is the SMTP password without inspecting the implementation and available error messages.

## SMTP Configuration

Use the supported Google SMTP configuration.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
SUPPORT_EMAIL=
```

Use an eligible Google App Password or supported OAuth authentication.

Do not use a normal Google account password as an assumed working SMTP credential.

Do not hardcode credentials.

Validate:
- SMTP host.
- Port.
- Secure connection configuration.
- Authentication credentials.
- Sender configuration.
- Recipient configuration.
- TLS connection.
- Deployment environment availability.

Ensure the sender identity is authorized.

Do not disable TLS certificate validation to make email appear functional.

## Mandatory Email Diagnostic Command

Add an appropriate diagnostic script, such as:

`npm run email:check`

The diagnostic must:
- Verify the SMTP configuration exists.
- Validate configuration format.
- Initialize the mail transport.
- Verify SMTP connectivity/authentication when supported.
- Provide actionable failure messages.
- Avoid printing secrets.
- Exit with a nonzero status when required checks fail.

Do not claim that successful SMTP verification proves every future email will reach an inbox.

Add a separate controlled email test command or protected diagnostic workflow that can send a test email to an explicitly configured test recipient.

Do not send unsolicited test messages during builds or migrations.

## Mandatory Email Workflows

### A. Registration
Send an actual verification email when the registration flow requires email verification.

Include:
- Verification code or secure verification link.
- Expiration information.
- Clear instructions.

Verification codes must be:
- Cryptographically generated.
- Expiring.
- Single-use.
- Attempt-limited.
- Resend-limited.
- Stored securely, preferably hashed.

Do not activate an unverified account if verification is mandatory.

### B. Login
Implement the required login security notifications and verification challenges according to the existing authentication policy.

Do not introduce unnecessary verification emails on every routine login.

If login requires an email verification code, the code must actually be generated, persisted securely and delivered.

### C. Event / Ceremony Creation
Send the correct email notification when an event or ceremony is:
- Submitted for review.
- Published.
- Rejected or returned for corrections, where applicable.

Do not send a publication-success email when the listing remains a draft or pending approval.

### D. Booking
When a booking request is successfully persisted:
- Notify the attendee.
- Notify the event organizer or explicitly assigned authorized partner.

The notification must correspond to the actual booking state.

Include the correct booking reference and event information.

Do not notify unrelated users.

### E. Help & Support
If the Help workflow is retained, connect it to a functional server-side submission flow.

Send the message to the configured support recipient and provide appropriate acknowledgment.

Prevent spam, header injection, arbitrary recipient selection and oversized submissions.

---

# 4. EMAIL AND DATABASE CONSISTENCY

A booking or event creation must not fail simply because SMTP is temporarily unavailable after the database transaction succeeds.

Implement a durable notification workflow.

Recommended approach:
1. Validate the request.
2. Persist the event or booking in Neon PostgreSQL.
3. Record notification jobs in a database-backed outbox or notification table.
4. Commit the transaction.
5. Process notification jobs.
6. Send email.
7. Record the delivery attempt and result.
8. Retry temporary failures safely.
9. Mark permanently failed notifications for inspection or recovery.

Requirements:
- Use idempotency controls.
- Prevent duplicate email delivery where practical.
- Use bounded retries and backoff.
- Avoid infinite retry loops.
- Track queued, sent and failed statuses.
- Record useful diagnostic metadata without secrets.
- Ensure concurrent workers do not process the same job improperly.
- Keep user-facing booking status independent from SMTP availability.

Do not claim delivery before the mail transport reports success.

SMTP acceptance is not proof that a recipient has read or received the message in their inbox.

---

# 5. CRITICAL: IMPROVE NEON DATABASE COMMANDS IN PACKAGE.JSON

Inspect the existing database driver, schema system, migration framework and scripts.

Implement a reliable Neon PostgreSQL command workflow in `package.json`.

**Do not assume the project uses Prisma, Drizzle or another ORM. Inspect the actual implementation first.**

Provide compatible scripts equivalent to:

```json
{
  "scripts": {
    "db:check": "node scripts/db-check.mjs",
    "db:push": "node scripts/db-push.mjs",
    "db:migrate": "node scripts/db-migrate.mjs",
    "db:status": "node scripts/db-status.mjs",
    "db:verify": "node scripts/db-verify.mjs",
    "email:check": "node scripts/email-check.mjs"
  }
}
```

These are target command names. Adapt the implementation to the actual project conventions and existing scripts.

Do not overwrite working commands blindly.

## Required Commands

### `npm run db:check`
Check:
- Required database environment variables.
- Database URL validity.
- Neon PostgreSQL connectivity.
- Basic database readiness.
- Useful error output.

Never print credentials.

### `npm run db:push`
Provide a real schema synchronization workflow.

Requirements:
- Synchronize the intended schema using the project's actual supported schema tooling.
- Detect schema differences.
- Prevent accidental destructive changes.
- Require explicit approval or a dedicated flag for potentially destructive operations.
- Never silently erase existing data.
- Do not implement a fake push command that simply prints success.

If the project's migration framework does not support safe direct schema pushing, implement a compatible schema synchronization process or clearly separate schema generation from migration application.

Production schema changes should be managed through reviewed migrations.

### `npm run db:migrate`
Apply pending database migrations.

Requirements:
- Maintain migration history.
- Prevent concurrent migration conflicts.
- Handle repeated execution safely.
- Fail when migrations fail.
- Report applied migrations.
- Support recovery and diagnosis.
- Do not blindly rerun partially applied migrations.

### `npm run db:status`
Show:
- Database connectivity.
- Migration status.
- Pending migrations.
- Schema version, where available.

### `npm run db:verify`
Verify:
- Required tables.
- Required columns.
- Important indexes.
- Constraints.
- Migration state.
- Essential application database assumptions.

Do not expose database secrets.

## Additional Requirements
- Preserve existing migration history.
- Resolve migration conflicts safely.
- Handle existing enum types and already-existing relations correctly.
- Avoid duplicate schema objects.
- Avoid dropping existing user data.
- Support local development and deployment environments.
- Document the difference between schema synchronization and migration application.

Use a clear deployment workflow that applies approved migrations before the application is considered ready.

Do not run destructive schema operations against production automatically.

---

# 6. CRITICAL: REPAIR THE HELP PAGE ROUTE

The Help page currently returns a not-found response.

Fix this behavior.

**Mandatory requested behavior:** If the Help page route is missing or currently unresolved, redirect the user to the dashboard instead of displaying a 404 page.

Requirements:
- Inspect the existing Help route and navigation links.
- Identify the actual broken route.
- Implement a valid redirect from the unresolved Help destination to the correct dashboard route.
- Use the project's actual dashboard path.
- Ensure the redirect does not create a loop.
- Ensure guests are redirected through the existing authentication flow when required.
- Fix broken Help links that point to nonexistent routes.
- Ensure the redirect works for direct URL access, refresh and navigation.

Do not guess the dashboard route.

If a functional Help page already exists or can be repaired with minimal effort, preserve it. Apply the dashboard redirect specifically to the unresolved Help route as required.

Do not redirect unrelated routes or hide genuine application errors through blanket redirects.

---

# 7. CURRENCY SYSTEM — WORLD COUNTRIES SEARCH

Improve currency selection throughout ADIFY.

Remove manually typed currency selection wherever a standardized selector is required.

Use a reliable world countries dataset or maintained library.

Currency selection must be searchable.

## Currency Selection Behavior
Create a reusable searchable country/currency selector.

Users should be able to:
- Search by country name.
- Search by currency name.
- Search by ISO currency code.
- Select the relevant country/currency entry.
- See the selected currency clearly.
- Change the selection when appropriate.

Example search behavior:
- Rwanda → Rwandan franc → RWF.
- Kenya → Kenyan shilling → KES.
- Uganda → Ugandan shilling → UGX.
- Tanzania → Tanzanian shilling → TZS.
- Nigeria → Nigerian naira → NGN.
- South Africa → South African rand → ZAR.

Use actual library data rather than hardcoding these entries as the sole currency source.

## Important Currency Rules
A country may use:
- Multiple valid currencies.
- A shared currency.
- A currency different from what its country name might suggest.

Some territories may have different currency metadata.

Do not assume a one-to-one country-to-currency relationship.

Where necessary, let the user choose from the valid currencies associated with the selected country.

Store the selected ISO 4217 currency code in Neon PostgreSQL where persistence is needed.

Store monetary amounts in appropriate integer minor units or another carefully defined precision-safe representation.

Never use floating-point arithmetic as the authoritative representation for financial amounts.

Use `Intl.NumberFormat` for display.

Always preserve the currency code with the amount.

Do not infer the event's currency solely from the visitor's country.

For paid events:
- The organizer explicitly confirms the event currency.
- The event currency remains clear on its public listing.
- Booking and payment calculations use the correct currency.
- Currency conversion must not be implied unless an actual conversion service is implemented.

## Reusable Component
Implement a reusable component for:
- Event creation.
- Event editing.
- User preferences, when applicable.
- Booking interfaces, where currency display is necessary.

Use the same country/currency metadata source throughout ADIFY.

---

# 8. REMOVE UNUSED ENVIRONMENT VARIABLES

Audit all environment variables used across the repository.

Remove obsolete variables associated with:
- S3.
- AWS storage integrations.
- Presigned URLs.
- Removed storage services.
- Unused providers.
- Deprecated integrations.
- Unused configuration.

Update:
- `.env.example`.
- Configuration validators.
- Documentation.
- Deployment instructions.
- CI/CD configuration where relevant.

Do not delete unrelated variables that are still required.

Do not remove actual secrets from external deployment dashboards without verifying the exact variable names and impact. Provide a cleanup list for any deployment configuration that cannot be modified from the repository.

Never expose secret values in reports.

Retain only configuration required by the implemented application.

---

# 9. REQUIRED ERROR HANDLING AND UI REPAIRS

Review existing issues related to:
- Form input focus loss.
- Missing data after refresh.
- Database errors.
- SMTP failures.
- Broken routes.
- Inconsistent booking status.
- Stale homepage data.
- Duplicate form submissions.

Requirements:
- Preserve input focus and cursor position during typing.
- Use stable React component identities and keys.
- Avoid unnecessary remounts.
- Use real database data.
- Provide actionable user-facing errors.
- Handle network interruptions.
- Avoid showing false success messages.
- Preserve recoverable form inputs.
- Use appropriate loading indicators.
- Prevent duplicate bookings and email requests.
- Ensure all forms use proper validation.

Do not solve backend problems only by changing the frontend error message.

---

# 10. SECURITY REQUIREMENTS

Implement:
- Server-side authorization.
- Secure authentication sessions.
- Input validation.
- Rate limiting.
- Safe file upload handling.
- Protected notification management.
- Secure verification tokens.
- Database query parameterization.
- Ownership checks.
- Booking capacity protection.
- Safe error logging.
- Appropriate privacy restrictions.

Do not expose:
- SMTP credentials.
- Database connection strings.
- Verification codes.
- Password reset tokens.
- Private attendee information.
- Internal moderation records.
- Private event access links.

Ensure email notifications and booking data are visible only to authorized parties.

---

# 11. MANDATORY EXECUTION SEQUENCE

Execute in this order:

1. Inspect the repository and current project status.
2. Identify the actual email failure and Help route failure.
3. Inspect Neon database schema and migration workflow.
4. Audit all S3 dependencies, references and environment variables.
5. Audit fake, temporary and non-persistent data implementations.
6. Repair Neon PostgreSQL integration and persistence.
7. Implement safe schema migrations.
8. Remove S3 and replace required file handling.
9. Repair Nodemailer and all required email workflows.
10. Implement reliable notification persistence and retry handling.
11. Fix the Help route behavior.
12. Improve searchable country/currency selection.
13. Update package scripts and documentation.
14. Remove unused dependencies and configuration.
15. Run database checks and migration verification.
16. Run type checks, linting and production build.
17. Test registration, verification, login and recovery.
18. Test event creation and booking persistence.
19. Test notifications for both booking parties.
20. Test currency selection and Help redirection.
21. Test image upload and retrieval.
22. Test failure scenarios and authorization.
23. Report completed changes and unresolved external configuration requirements.

Do not skip testing because the build succeeds.

---

# 12. REQUIRED TEST SCENARIOS

### Database
- Valid Neon connection.
- Invalid credentials.
- Database unavailable.
- Migration already applied.
- Migration failure.
- Existing schema objects.
- Data survives refresh and logout/login.
- Unauthorized record access.
- Duplicate booking requests.
- Capacity exceeded.

### Email
- SMTP configuration missing.
- Invalid authentication.
- SMTP connection failure.
- Successful verification email.
- Expired verification code.
- Reused verification code.
- Resend rate limit.
- Successful event notification.
- Booking attendee notification.
- Booking organizer notification.
- Temporary email failure and retry.
- Notification deduplication.

### Help
- Direct Help route access.
- Navigation link.
- Unauthenticated access.
- Correct dashboard destination.
- No redirect loops.
- No unrelated route interception.

### Currency
- Country search.
- Currency search.
- ISO code search.
- Country with shared currency.
- Country with multiple valid currencies, if supported.
- Selected currency persistence.
- Correct formatting.
- Currency code retained with amounts.

### Storage
- Valid upload.
- Oversized upload.
- Invalid file type.
- Unauthorized upload.
- Unauthorized retrieval.
- Image rendering.
- Database storage limits.
- Image deletion and reference consistency.

---

# 13. FINAL ACCEPTANCE REQUIREMENTS

Do not declare this task complete until:

- S3 is removed from active implementation.
- Unused S3 dependencies and environment configuration are removed.
- Neon PostgreSQL is the persistent source of truth.
- Required database records survive refresh and reauthentication.
- Database commands genuinely work.
- Migrations are safe and repeatable.
- Email configuration is repaired.
- Real email delivery has been tested with an authorized test recipient.
- Registration and required verification emails work.
- Required event and booking notifications work.
- Booking emails notify the correct parties.
- Email failures do not silently discard successful bookings.
- The missing Help route redirects correctly to the actual dashboard.
- Currency selection supports searchable country/currency data.
- Existing features remain functional.
- Type checks and production builds pass, or documented pre-existing blockers are identified.
- Relevant automated tests pass.
- Remaining external setup requirements are clearly documented.

## Final Report
At completion, provide:

1. Root cause of the email failure.
2. Root cause of the Help route failure.
3. Files created, changed and removed.
4. S3 removal summary.
5. Database migration summary.
6. New `package.json` database commands.
7. Email delivery test result.
8. Booking notification test result for both parties.
9. Currency selector implementation summary.
10. Environment variables retained and obsolete variable names removed.
11. Build and test results.
12. Remaining blockers requiring credentials, provider configuration or manual approval.

**NON-NEGOTIABLE:** Do not fake success, bypass Neon, silently retain S3, simulate email delivery, replace persistent records with hardcoded arrays, or claim that a repair works without verification. Execute the repairs against the existing ADIFY project and report evidence-based results.
