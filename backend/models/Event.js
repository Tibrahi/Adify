const mongoose = require('mongoose');
const { Schema } = mongoose;

// Reply subdocument
const replySchema = new Schema({
  author:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, required: true, maxlength: 500, trim: true },
  likes:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Comment subdocument
const commentSchema = new Schema({
  author:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, required: true, maxlength: 1000, trim: true },
  likes:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies:  [replySchema]
}, { timestamps: true });

// Custom field (user-defined extra info)
const customFieldSchema = new Schema({
  label: { type: String, maxlength: 50 },
  value: { type: String, maxlength: 200 }
}, { _id: false });

// Main Event schema
const eventSchema = new Schema({
  // === REQUIRED ===
  title:    { type: String, required: true, trim: true, maxlength: 200 },
  category: {
    type: String, required: true,
    enum: ['Music', 'Sports', 'Comedy', 'Art', 'Food & Dining', 'Technology',
           'Fashion', 'Film & Cinema', 'Dance', 'Night Life', 'Culture & Heritage',
           'Business & Networking', 'Fitness & Wellness', 'Gaming', 'Photography', 'Other']
  },

  // === OPTIONAL ===
  description:  { type: String, maxlength: 5000, default: '' },
  bannerImage:  { type: String, default: '' },         // URL
  location:     { type: String, maxlength: 200 },      // Venue name
  address:      { type: String, maxlength: 300 },      // Street address
  district:     { type: String, default: '' },         // Rwanda district
  dateTime:     { type: Date },                        // Start
  endDateTime:  { type: Date },                        // End
  price:        { type: String, default: 'Free' },
  ticketLink:   { type: String, default: '' },
  maxAttendees: { type: Number, min: 1 },
  tags:         [{ type: String, maxlength: 30 }],
  customFields: [customFieldSchema],                   // Extra user-defined fields

  // === SYSTEM ===
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['active', 'postponed', 'over', 'cancelled'],
    default: 'active'
  },
  attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments:  [commentSchema],
  views:     { type: Number, default: 0 },

  // === PRIVACY (owner controls) ===
  privacy: {
    hideAttendeeCount: { type: Boolean, default: false },
    hideAttendeeList:  { type: Boolean, default: false },
    hideComments:      { type: Boolean, default: false },
    hideInsights:      { type: Boolean, default: false }
  }
}, { timestamps: true });

// Text index for search
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual: attendee count
eventSchema.virtual('attendeeCount').get(function () {
  return this.attendees.length;
});

module.exports = mongoose.model('Event', eventSchema);