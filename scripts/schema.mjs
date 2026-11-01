// Intended ADIFY schema: the contract db:verify/db:push check the live
// database against. Updated alongside migrations/ (never edited to match a
// drifted database — drift is fixed with a reviewed migration instead).

export const EXPECTED_TABLES = {
  users: ['id', 'full_name', 'email', 'password_hash', 'country', 'phone', 'email_verified_at', 'created_at', 'updated_at'],
  sessions: ['token', 'user_id', 'created_at', 'expires_at'],
  verification_codes: ['id', 'user_id', 'purpose', 'code_hash', 'expires_at', 'attempts', 'consumed_at', 'created_at'],
  events: [
    'id', 'owner_id', 'title', 'class', 'category', 'description', 'cover_key', 'cover_url',
    'start_at', 'end_at', 'timezone', 'registration_deadline', 'attendance', 'venue_name',
    'country', 'city', 'address', 'directions', 'accessibility', 'online_platform',
    'online_access', 'pricing', 'price_amount', 'price_amount_minor', 'currency', 'capacity_type', 'capacity',
    'booking_method', 'spots_per_booking', 'eligibility', 'waitlist_enabled',
    'cancellation_policy', 'refund_terms', 'attendance_rules', 'organizer_contact',
    'public_listing', 'status', 'moderation_note', 'program_items', 'extra_contacts',
    'created_at', 'updated_at', 'published_at',
  ],
  bookings: ['id', 'event_id', 'user_id', 'reference', 'spots', 'status', 'payment_status', 'created_at', 'updated_at'],
  notifications: ['id', 'user_id', 'kind', 'title', 'body', 'link', 'read_at', 'created_at'],
  support_tickets: ['id', 'name', 'email', 'topic', 'message', 'booking_ref', 'contact_pref', 'status', 'created_at'],
  audit_log: ['id', 'actor_id', 'action', 'target_type', 'target_id', 'meta', 'created_at'],
  images: ['id', 'owner_id', 'mime', 'size_bytes', 'data', 'created_at'],
  email_outbox: ['id', 'idempotency_key', 'recipient', 'subject', 'body_text', 'body_html', 'status', 'attempts', 'next_attempt_at', 'last_error', 'sent_at', 'created_at'],
  schema_migrations: ['filename', 'checksum', 'status', 'attempts', 'last_error', 'applied_at'],
};

export const EXPECTED_INDEXES = [
  'idx_users_email',
  'idx_sessions_user',
  'idx_codes_user_purpose',
  'idx_events_status_start',
  'idx_events_status_end',
  'idx_events_country_city',
  'idx_events_category',
  'idx_events_class',
  'idx_events_owner',
  'idx_bookings_event_status',
  'idx_bookings_user',
  'idx_notifications_user',
  'idx_audit_target',
  'idx_images_owner',
  'idx_outbox_status_next',
];

// Uniqueness the application relies on (capacity/dedupe guards assume these).
export const EXPECTED_UNIQUES = [
  { table: 'users', columns: ['email'] },
  { table: 'bookings', columns: ['reference'] },
  { table: 'bookings', columns: ['event_id', 'user_id'] },
  { table: 'email_outbox', columns: ['idempotency_key'] },
];
