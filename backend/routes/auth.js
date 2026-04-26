const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'adify_secret_key';
const JWT_EXPIRES = '30d';

const generateToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      fullName, email, password,
      bio, location, occupation, phone, age, gender,
      interests, favoriteArtists, preferredEventTypes
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      fullName, email, password,
      bio: bio || '',
      location: location || 'Kigali City',
      occupation: occupation || '',
      phone: phone || '',
      age: age || undefined,
      gender: gender || 'prefer_not_to_say',
      interests: interests || [],
      favoriteArtists: favoriteArtists || [],
      preferredEventTypes: preferredEventTypes || []
    });

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

    // Update last active
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({ message: 'Logged in successfully!', token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me — get current user from token
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;