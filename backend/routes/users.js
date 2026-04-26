const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile — get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile.' });
  }
});

// PUT /api/users/profile — update profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      'fullName', 'avatar', 'bio', 'location', 'occupation', 'phone',
      'age', 'gender', 'interests', 'favoriteArtists', 'preferredEventTypes'
    ];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(
      req.user._id, updates, { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated!', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile.' });
  }
});

// PUT /api/users/password — change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error changing password.' });
  }
});

// GET /api/users/:id/events — public events by user
router.get('/:id/events', async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.params.id, status: { $ne: 'cancelled' } })
      .populate('organizer', 'fullName avatar')
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user events.' });
  }
});

// GET /api/users/interests/options — static list
router.get('/interests/options', (req, res) => {
  res.json({
    interests: [
      'Music', 'Sports', 'Comedy', 'Art', 'Food & Dining', 'Technology',
      'Fashion', 'Film & Cinema', 'Dance', 'Night Life', 'Culture & Heritage',
      'Business & Networking', 'Fitness & Wellness', 'Gaming', 'Photography'
    ],
    districts: [
      'Kigali City', 'Nyarugenge', 'Gasabo', 'Kicukiro',
      'Huye', 'Musanze', 'Rubavu', 'Rwamagana', 'Kayonza',
      'Muhanga', 'Karongi', 'Nyanza', 'Gicumbi', 'Other'
    ],
    categories: [
      'Music', 'Sports', 'Comedy', 'Art', 'Food & Dining', 'Technology',
      'Fashion', 'Film & Cinema', 'Dance', 'Night Life', 'Culture & Heritage',
      'Business & Networking', 'Fitness & Wellness', 'Gaming', 'Photography', 'Other'
    ]
  });
});

// GET /api/users/stats — admin: user count
router.get('/stats/overview', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
  try {
    const [userCount, eventCount] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments()
    ]);
    res.json({ users: userCount, events: eventCount });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;