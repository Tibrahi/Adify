# ADIFY Authentication, Registration, Login & Dashboard Specification

## Objective
Implement the ADIFY authentication experience, event publishing entry points and user dashboard.

ADIFY is an Africa-focused public event and ceremony discovery platform. Users can discover public events without an account, but must register or log in to publish events, request attendance, reserve spots and manage their activities.

Build a clean, premium, responsive and secure experience consistent with the ADIFY homepage.

Inspect the existing repository, authentication implementation, database schema, routes, UI components and project conventions before making changes.

Do not rebuild existing functionality unnecessarily, introduce fake data or remove existing features.

---

# 1. Authentication Page Design

Create a shared Register/Login page using a **two-panel split-screen layout**.

## Desktop Layout

Split the authentication page into two sections:

### Left Panel — ADIFY Brand & Information
Approximately 45% of the available width.

Display:
- ADIFY logo and brand identity.
- A strong headline explaining the platform.
- A concise description of discovering events and ceremonies across Africa.
- A visually attractive event-related banner or carefully designed brand illustration.
- A short explanation of what users can do on ADIFY.
- Optional real, verified platform content only when available.

Suggested banner copy:

**Headline:** Your next experience starts here.

**Description:** Discover public events, meaningful ceremonies and opportunities to connect with people across Africa.

**Supporting points:**
- Discover events around you.
- Reserve your spot.
- Publish your own public gatherings.

Keep the panel visually engaging but uncluttered. Use a premium event-inspired design, subtle gradients or imagery, strong typography and sufficient contrast.

The left panel should remain consistent between registration and login.

Do not use fabricated event statistics, fake user testimonials, invented community sizes or misleading platform claims.

### Right Panel — Authentication Forms
Approximately 55% of the available width.

Display:
- A clear Register/Login form.
- Form title and short supporting description.
- Form fields.
- Primary submit button.
- Switch between Register and Login.
- Terms and privacy links.
- Appropriate validation and error messages.

Keep the form comfortably centered with a reasonable maximum width.

The authentication form must not feel cramped on desktop or mobile.

## Mobile Layout
On mobile:
- Use a compact ADIFY brand header.
- Reduce the banner to a small visual or concise brand introduction.
- Prioritize the authentication form.
- Avoid forcing users to scroll through a large banner before reaching the form.
- Maintain readable labels, accessible controls and comfortable spacing.

---

# 2. Registration Form

Create a simple account registration experience.

Required fields:
- Full name.
- Email address.
- Password.
- Password confirmation, if required by the authentication implementation.
- Agreement to applicable Terms of Service and Privacy Policy.

Optional fields:
- Country.
- Phone number, if genuinely needed.

Do not collect unnecessary personal information during registration.

Requirements:
- Validate required fields.
- Validate email format.
- Enforce password security requirements.
- Provide password visibility controls.
- Provide clear field-level validation.
- Prevent duplicate account creation.
- Normalize email addresses appropriately.
- Implement rate limiting and abuse protection.
- Handle email verification if supported or required.
- Prevent account enumeration through appropriate error messages.
- Never store plaintext passwords.
- Use secure authentication practices and session management.

After successful registration:
- Establish the authenticated session according to the existing auth architecture.
- Redirect the user to the intended destination or dashboard.
- Do not allow open redirects.
- Display a useful account verification step when applicable.

Provide a Login link for existing users.

---

# 3. Login Form

Required fields:
- Email address.
- Password.

Include:
- Password visibility toggle.
- Remember-me functionality only if securely supported and appropriately implemented.
- Forgot password.
- Login button.
- Register link.

Requirements:
- Validate inputs.
- Provide useful authentication errors.
- Apply rate limiting and abuse protection.
- Use secure session cookies and appropriate session expiration.
- Prevent unauthorized access.
- Support logout.
- Avoid revealing whether a particular email address has an account.

After successful login:
- Redirect users to their intended protected destination, if valid.
- Otherwise, redirect them to the ADIFY dashboard.

If the user came from a protected booking action or event creation flow, preserve the intended destination safely.

---

# 4. Authentication Entry Points

Authentication must integrate with the rest of ADIFY.

## From Homepage
Guests can:
- Browse events.
- Search.
- Filter.
- Read details.

When guests click:
- Post an Event.
- Request a Spot.
- Reserve a Spot.
- Manage Bookings.

Redirect them to registration/login as appropriate.

After authentication, return them to the relevant workflow.

## Post an Event
The Post an Event action should be accessible from:
- Homepage header.
- Authenticated dashboard.
- Organizer listing management interface.

For guests:
1. Click Post an Event.
2. Open authentication.
3. Complete registration or login.
4. Continue to the event creation workflow.

For authenticated users:
1. Click Post an Event.
2. Open the event creation form.

Do not require a separate organizer account registration.

Every authenticated eligible user can begin creating a public event or ceremony, subject to moderation and platform policies.

---

# 5. ADIFY Dashboard

Create a dashboard that acts as the user's personal workspace.

The dashboard should adapt based on the user's activities and permissions without requiring different accounts for attendees and organizers.

## Dashboard Layout

### Desktop
Use a structured layout:
- Left sidebar navigation.
- Main dashboard content.
- Optional compact contextual panels when useful.

### Mobile
Use:
- Compact top navigation.
- Collapsible sidebar or mobile navigation.
- Responsive cards and tables.
- Accessible menus and actions.

Keep the interface consistent with the ADIFY branding.

Avoid overcrowding the dashboard with unnecessary charts, empty widgets, fake statistics or features that do not exist.

---

# 6. Dashboard Sidebar

Recommended navigation:

1. Overview
2. Discover Events
3. My Bookings
4. My Events
5. Create Event
6. Notifications
7. Profile & Settings
8. Help & Support
9. Logout

Navigation should respect the user's permissions and actual available features.

Use clear icons and labels.

Highlight the active navigation item.

---

# 7. Dashboard Overview

The overview should be dynamic and personalized.

## Welcome Section
Display:
- User's name.
- Short welcome message.
- Post an Event action.
- Discover Events action.

## My Upcoming Bookings
Show upcoming confirmed reservations and relevant pending requests.

Display:
- Event title.
- Event date.
- Location or online format.
- Booking status.
- Booking reference.
- View Details action.

## My Events
Show the user's created events and ceremonies.

Display:
- Event title.
- Publication status.
- Event lifecycle status.
- Start date.
- Booking activity, when available.
- Manage action.

## Recent Notifications
Show relevant notifications such as:
- Booking request updates.
- Booking confirmations.
- Event changes.
- Event moderation decisions.
- Important platform notices.

## Empty Dashboard
If the user has no bookings or events:
- Explain that the relevant section is empty.
- Provide Discover Events or Post an Event actions.
- Avoid fake activity or fabricated statistics.

Show dashboard sections according to actual user activity.

---

# 8. My Bookings

Create a booking management page.

Include:
- All.
- Pending.
- Confirmed.
- Waitlisted, when supported.
- Cancelled.
- Past.

Each booking should show:
- Event or ceremony title.
- Booking reference.
- Date and time.
- Attendance format.
- Venue or online access information, where authorized.
- Booking status.
- Number of spots.
- Relevant payment status if payment integration exists.

Actions:
- View booking details.
- Cancel booking if allowed.
- Request cancellation if required by the event's policy.
- Access attendance instructions when authorized.

Never expose bookings belonging to other users.

Only show online meeting access details to eligible attendees according to the event's access policy.

---

# 9. My Events

Create an organizer workspace for event management.

Include tabs or filters for:

- All.
- Drafts.
- Pending Review.
- Published.
- Completed.
- Cancelled.
- Rejected, where applicable.

For each listing, display:
- Cover image.
- Title.
- Class.
- Publication status.
- Start date.
- Booking status.
- Capacity and availability, where applicable.

Actions:
- Create Event.
- Edit Event.
- Preview Public Listing.
- Manage Booking Requests.
- Publish or submit for review.
- Cancel Event.
- View Past Event.

Allow editing published events according to platform rules.

Changes to event dates, venues, pricing, attendance format or capacity must trigger appropriate validation and attendee notifications when relevant.

Completed events should remain accessible to their owners.

Do not permanently delete booking history when an event is removed from public discovery.

---

# 10. Create Event Workflow

When an authenticated user clicks Create Event, open a dedicated event creation workflow.

Use a structured multi-step form or clearly separated form sections.

### Step 1 — Basic Information
- Event title.
- Event or Ceremony.
- Category.
- Description.
- Cover image.

### Step 2 — Schedule
- Start date.
- End date.
- Start time.
- End time.
- Event timezone.
- Registration deadline.

### Step 3 — Attendance
- Physical.
- Online.
- Hybrid.

### Step 4 — Venue / Online Details
For physical:
- Venue name.
- Country.
- City.
- Address.
- Directions or map information.
- Accessibility details.

For online:
- Platform or session type.
- Access instructions.
- Secure attendance link handling.

For hybrid:
- Configure both options and their respective capacities where applicable.

### Step 5 — Reservations
- Free or Paid.
- Limited or unlimited capacity.
- Booking method.
- Booking deadline.
- Number of spots per booking.
- Eligibility requirements.
- Waitlist settings, if supported.

### Step 6 — Policies
- Cancellation policy.
- Refund terms if applicable.
- Attendance rules.
- Organizer contact details.
- Public listing confirmation.

### Step 7 — Preview & Submit
- Preview the public listing.
- Validate required fields.
- Save as Draft or submit for publication/review.

The event must not become publicly visible unless it satisfies publication requirements.

Support saving drafts and safely recovering entered form data where appropriate.

Prevent input focus loss, accidental resets and duplicate submissions.

---

# 11. Booking Request Management for Organizers

Inside each event management page, create a booking requests section.

Show:
- Request reference.
- Attendee information limited to what the organizer needs.
- Request date.
- Number of requested spots.
- Booking status.
- Payment status, if relevant.

Allow authorized organizers to:
- Approve requests.
- Decline requests.
- Manage waitlists if enabled.
- Cancel bookings according to applicable rules.
- Contact attendees through approved communication methods.
- Export attendee lists only when necessary and authorized.

Requirements:
- Validate every organizer action server-side.
- Prevent unauthorized booking changes.
- Prevent capacity overruns.
- Record important actions in audit logs.
- Notify attendees of status changes.
- Do not rely exclusively on email for booking management.

---

# 12. User Roles and Permissions

Use clear permission boundaries.

### Guest
- Browse public events.
- Search and filter.
- Read public details.

### Authenticated User
- Request or reserve attendance.
- Manage personal bookings.
- Create events.
- Manage owned events.

### Event Organizer
- Manage assigned or owned listings.
- Manage requests for their events.
- Access authorized attendee information.

Organizer capabilities may be granted to ordinary authenticated users for their own events.

### Partner
- Access only specifically assigned events and permitted workflows.

### Administrator
- Manage moderation, platform operations and authorized administrative actions.

Do not trust client-side roles or user-submitted ownership identifiers.

Enforce access permissions on the server for every protected route and operation.

---

# 13. Profile and Settings

Provide:
- Full name.
- Profile image, if supported.
- Email and verification status.
- Country.
- Optional phone number.
- Notification preferences.
- Password and security settings.
- Session/logout controls.
- Account privacy controls.
- Account deletion request, subject to applicable retention obligations.

Keep personal information private by default.

Do not expose personal email addresses or phone numbers publicly without a valid reason and appropriate consent.

---

# 14. Technical Requirements

Before coding:
1. Inspect the repository and existing routes.
2. Inspect the actual database schema.
3. Inspect the authentication and session implementation.
4. Reuse established components and conventions.
5. Identify missing infrastructure before introducing dependencies.

Implement:
- Secure authentication.
- Server-side authorization.
- Database-backed dashboard data.
- Protected dashboard routes.
- Reliable form validation.
- Proper error handling.
- Loading and empty states.
- Responsive design.
- Database migrations through the established project workflow.
- Tests for authentication, permissions, booking ownership and organizer access.

Do not:
- Create fake users, bookings or event metrics.
- Hardcode dashboard records.
- Bypass existing authentication.
- Expose private attendee information.
- Introduce unnecessary payment or social features.
- Remove existing working functionality.
- Claim a feature is implemented if it is only a visual mockup.

---

# 15. Final Acceptance Criteria

The implementation is complete when:

- Registration works.
- Login and logout work.
- Authentication errors are handled properly.
- The split-screen authentication layout works on desktop and mobile.
- Registration and login share a consistent brand panel.
- Guests can browse public events.
- Guests are redirected to authentication for protected actions.
- Successful authentication returns users to their intended workflow.
- Authenticated users can access their dashboard.
- Dashboard information is fetched from real database records.
- Users can manage their own bookings.
- Organizers can manage only their own or explicitly assigned events.
- Eligible users can create public events and ceremonies.
- Event creation validates required information.
- Event publication follows the moderation policy.
- Booking management respects capacity and authorization.
- Notifications reflect actual system actions.
- Empty states and errors work properly.
- The interface is responsive, accessible and production-ready.

**Final instruction:** ADIFY authentication should be the entry point to a unified platform. One account should allow users to discover events, reserve attendance, publish public gatherings and manage their activities without unnecessary registration complexity or separate attendee and organizer accounts.
