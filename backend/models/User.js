const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar:   { type: String, default: '' },
  
  // Profile for better matching
  bio:        { type: String, maxlength: 500, default: '' },
  location:   { type: String, default: 'Kigali City' },  // Rwanda district
  occupation: { type: String, default: '' },
  phone:      { type: String, default: '' },
  age:        { type: Number, min: 13, max: 100 },
  gender:     { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  
  // Interest Matching Fields
  interests: [{
    type: String,
    enum: ['Music', 'Sports', 'Comedy', 'Art', 'Food & Dining', 'Technology',
           'Fashion', 'Film & Cinema', 'Dance', 'Night Life', 'Culture & Heritage',
           'Business & Networking', 'Fitness & Wellness', 'Gaming', 'Photography']
  }],
  favoriteArtists: [{ type: String }],
  preferredEventTypes: [{ type: String }],
  
  // System
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  
  // Social
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);