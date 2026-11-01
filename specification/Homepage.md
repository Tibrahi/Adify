# ADIFY Homepage Development Prompt

## Objective
Build the ADIFY homepage as a modern, dynamic, Africa-focused public event and ceremony discovery platform.

The homepage must display **only real, published, eligible public events and ceremonies fetched from the database**. Do not create a static marketing homepage, mock event listings, fake statistics, fabricated attendees, placeholder event data, or hardcoded event cards.

## 1. Homepage Design
Create a clean, premium, modern, responsive interface with:
- Professional typography and clear visual hierarchy.
- Minimal, organized layout with consistent spacing.
- Mobile-first design that works across mobile, tablet and desktop.
- Attractive event cover images with consistent aspect ratios.
- Clear event status, attendance format, price and availability labels.
- Fast loading, accessible controls and low-bandwidth optimization.
- A simple, recognizable ADIFY brand identity.

Avoid overcrowded sections, unnecessary animations, oversized banners, excessive colors and distracting UI elements.

## 2. Header
Create a compact, responsive header containing:
- ADIFY logo.
- Search access.
- Country/location selector.
- Sign in / Register for guests.
- User profile menu for authenticated users.
- **Post an Event** action.

For mobile, use an organized responsive navigation menu without hiding the primary discovery experience.

The Post an Event action should redirect guests to authentication and authenticated users to the event creation workflow.

## 3. Discovery Search
Provide a prominent search interface near the top of the homepage.

Allow users to search published events and ceremonies by:
- Event or ceremony title.
- Description keywords.
- Category.
- City.
- Country.
- Organizer name, where publicly available.

Include filters for:
- All.
- Events.
- Ceremonies.
- Free.
- Paid.
- Physical.
- Online.
- Hybrid.
- Upcoming.
- Happening now.
- Date range.
- Country and city.
- Available spots, when capacity information is reliable.

Filters must work with real backend query parameters and actual database records.

Support clearing filters, combining filters, pagination and useful empty states.

Do not display filters or categories that imply availability when no matching results exist, unless they remain useful as general search controls.

## 4. Dynamic Homepage Sections

Generate homepage sections from real published listings. Sections must appear only when matching records exist.

### A. Happening Now
Display eligible events and ceremonies currently in progress.

Requirements:
- Sort by relevance or configured discovery ranking, with predictable behavior.
- Display event title, cover, category, location, attendance format and booking availability.
- Show a clear **Happening Now** indicator.
- Provide a View All action.
- Exclude completed, cancelled, unpublished and suspended listings.

### B. Coming Up
Display upcoming published events and ceremonies.

Requirements:
- Sort primarily by the nearest upcoming start time.
- Display date, local event time, title, category, location, attendance format and price.
- Highlight relevant upcoming events without fabricated popularity indicators.
- Provide a View All action.

### C. Near You
Show upcoming and currently happening events based on the user's selected country and city, or location permission when voluntarily granted.

Requirements:
- Allow manual location selection.
- Do not require location permissions.
- Hide this section when no relevant listings exist.
- Never infer a precise location without permission.

### D. Explore by Category
Display categories derived from available public listings.

Examples:
- Education.
- Business.
- Technology.
- Culture.
- Entertainment.
- Community.
- Awards and celebrations.

Only display categories that have matching eligible listings.

Each category should open a filtered discovery page.

### E. Explore Across Africa
Provide a country discovery section based on available published listings.

Requirements:
- Show only countries with matching eligible listings.
- Display country names and optionally flags using a reliable country-data source.
- Selecting a country opens its event discovery results.
- Do not create fake country event counts.
- Keep the section compact and useful.

## 5. Event Cards
Create a reusable event card component with consistent layout.

Each card should display:
- Cover image, when available.
- Event or ceremony title.
- Class: Event or Ceremony.
- Category.
- Start date and time in the event's local timezone.
- City and country, or Online.
- Attendance format: Physical, Online or Hybrid.
- Free or Paid label.
- Limited attendance label when applicable.
- Accurate booking availability, if available.
- Organizer name or verified status, only when supported by actual data.

Card behavior:
- Clicking the card opens the event details page.
- The entire card should not contain nested conflicting interactive controls.
- Provide keyboard accessibility and visible focus states.
- Use optimized images and graceful fallbacks.
- Prevent layout shifts during loading.
- Do not show invented ratings, attendee numbers, remaining spots or popularity badges.

For limited-capacity events, show remaining spots only if the information is accurate and safe to disclose.

## 6. Listing Lifecycle and Visibility
The homepage must reflect event lifecycle automatically.

- Upcoming: Start time is in the future.
- Happening now: Current time falls within the event's active schedule.
- Completed: Event end time has passed.
- Cancelled: Organizer or authorized administrator cancelled the listing.
- Suspended: Listing has been disabled by moderation.
- Draft/Pending review: Not publicly discoverable.

Use the event's actual timezone and reliable server-side time calculations.

Requirements:
- Automatically remove completed events from active discovery.
- Exclude cancelled, suspended, rejected, draft and pending-review listings.
- Do not delete completed records from the database.
- Revalidate listing visibility and availability on the server.
- Ensure cached homepage results cannot continue displaying cancelled or suspended events beyond the defined freshness and invalidation policy.
- Support multi-day events and events with accurate start/end times.
- Use scheduled jobs only where required for additional lifecycle actions, not as the sole method of deciding whether an event is active.

## 7. Homepage Data and Backend
Before implementation, inspect the existing repository, architecture, database schema, authentication, routes, API handlers and reusable components.

Use the existing project conventions and database as the source of truth.

Requirements:
- Fetch homepage data from the actual database.
- Use server-side filtering and pagination.
- Add suitable database indexes for publication status, event dates, location, category and discovery queries.
- Avoid unnecessary database queries and N+1 request patterns.
- Select only the fields required for homepage cards.
- Implement appropriate caching, revalidation and invalidation.
- Handle database errors gracefully.
- Do not expose private organizer information, attendee records, internal moderation notes or unpublished listings.
- Enforce authorization on protected actions.
- Prevent duplicate listings within homepage sections where practical.
- Ensure every event card links to its correct event detail route.

Do not invent tables, columns, endpoints or existing infrastructure. Inspect the actual schema first and implement migrations through the project's established migration workflow.

## 8. Authentication Behavior
Guests can:
- Browse the homepage.
- Search and filter listings.
- Open event details.
- View public organizer information.

Authentication is required to:
- Create and publish events.
- Request or reserve attendance.
- Manage bookings.
- Manage organizer listings.

When a guest attempts a protected action, redirect them to authentication and preserve the intended destination where safe.

## 9. Booking Actions
On event cards, prioritize opening event details rather than placing multiple booking buttons everywhere.

On the event details page, provide the appropriate action:
- Request a Spot.
- Reserve a Spot.
- Join Waitlist, if enabled.
- Registration Closed.
- Sold Out.
- Event Ended.
- Event Cancelled.

Choose the action based on actual event configuration and booking availability.

Do not allow homepage data or client-side checks to bypass booking rules. Validate eligibility, deadlines, capacity and booking status on the server.

A request is not automatically a confirmed reservation.

## 10. Homepage States
Implement complete UI states:

### Loading
- Use skeleton cards matching the actual card dimensions.
- Avoid layout jumps.

### No Published Events
Display a simple empty state explaining that no public events are currently available.

Provide useful actions:
- Adjust filters.
- Explore other locations.
- Post an Event, when appropriate.

Do not insert fabricated listings to fill empty space.

### No Search Results
Show a clear message and a Reset Filters action.

### Database or Network Failure
Display a user-friendly error message and Retry action.
Do not silently present stale or fabricated content as live information.

### Partial Results
Allow available sections to render if another independent section fails, where appropriate.

## 11. Performance and Accessibility
- Optimize for low-end devices and slower African mobile networks.
- Use responsive images and lazy loading below the fold.
- Prioritize loading the main discovery content.
- Avoid unnecessary client-side JavaScript.
- Use semantic HTML.
- Support keyboard navigation.
- Provide accessible labels and sufficient contrast.
- Ensure date, price and location information remain readable on small screens.
- Avoid excessive API requests when users change filters.
- Debounce text search where appropriate.
- Preserve stable input focus while typing.
- Implement proper error boundaries and request cancellation where appropriate.

## 12. Recommended Homepage Layout Order
1. Compact navigation header.
2. Discovery headline and search.
3. Event type and primary filters.
4. Selected location indicator.
5. Happening Now.
6. Coming Up.
7. Near You.
8. Explore by Category.
9. Explore Across Africa.
10. Compact footer.

Hide sections that have no matching listings. Adapt section order based on available data and discovery relevance without compromising the core browsing experience.

On small screens, prioritize search, filters and event listings.

## 13. Final Acceptance Criteria
The homepage is complete only when:

- Every displayed listing comes from real, eligible database records.
- No static mock events or fake metrics are present.
- Search and filters return correct results.
- Event and ceremony classifications work correctly.
- Upcoming and active event statuses are accurate.
- Completed events disappear from active discovery.
- Cancelled and suspended events are excluded.
- Event cards open the correct details pages.
- Country and city selection work.
- Authentication redirects work properly.
- Loading, empty, error and retry states work.
- Pagination or load-more works correctly.
- Mobile and desktop layouts are responsive.
- Sensitive information is never exposed.
- Database failures and stale-cache scenarios are handled.
- Existing authentication, database migrations and project conventions remain intact.
- The implementation is tested against real database records and relevant edge cases.

**Final instruction:** Build the ADIFY homepage as a real-time-oriented public discovery interface, not a promotional landing page. Keep it clean, useful, data-driven, trustworthy and focused on helping people across Africa discover public events and ceremonies and proceed to their details and booking workflows.
