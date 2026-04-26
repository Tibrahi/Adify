const express = require('express');
const Event = require('../models/Event');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────
const buildFeedQuery = (user) => {
  // If user logged in, include interest-matching in sort (see below)
  return {};
};

const formatEvent = (event, userId) => {
  const e = event.toObject ? event.toObject({ virtuals: true }) : event;
  const isOwner = userId && e.organizer._id?.toString() === userId.toString();

  // Apply privacy settings for non-owners
  if (!isOwner) {
    if (e.privacy?.hideAttendeeCount) e.attendees = [];
    if (e.privacy?.hideComments)      e.comments = [];
    if (e.privacy?.hideInsights) {
      delete e.views;
    }
  }
  e.isOwner = isOwner;
  e.isAttending = userId ? (event.attendees || []).some(
    a => a._id?.toString() === userId.toString() || a.toString() === userId.toString()
  ) : false;
  return e;
};

// ─── GET /api/events/feed — interest-based feed ──────────────
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip  = (page - 1) * limit;
    const { category, status, district, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status)   query.status   = status;
    if (district) query.district = district;
    if (search)   query.$text    = { $search: search };

    let events = await Event.find(query)
      .populate('organizer', 'fullName avatar location interests occupation')
      .populate('comments.author', 'fullName avatar')
      .populate('comments.replies.author', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userId = req.user?._id;

    // Interest-based scoring for logged-in users
    if (req.user?.interests?.length > 0) {
      events = events.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        const userInterests = req.user.interests;

        // Match by category/interest
        if (userInterests.includes(a.category)) scoreA += 10;
        if (userInterests.includes(b.category)) scoreB += 10;

        // Match by district
        if (a.district === req.user.location) scoreA += 5;
        if (b.district === req.user.location) scoreB += 5;

        // Boost by attendee count
        scoreA += Math.min((a.attendees?.length || 0) * 0.5, 5);
        scoreB += Math.min((b.attendees?.length || 0) * 0.5, 5);

        // Boost active events
        if (a.status === 'active') scoreA += 8;
        if (b.status === 'active') scoreB += 8;

        return scoreB - scoreA;
      });
    }

    // Format with privacy & ownership
    const formatted = events.map(e => {
      const isOwner = userId && e.organizer._id?.toString() === userId?.toString();
      const isAttending = userId ? (e.attendees || []).some(
        a => a?.toString() === userId?.toString()
      ) : false;

      const result = { ...e, isOwner, isAttending };

      if (!isOwner) {
        if (e.privacy?.hideAttendeeCount) result.attendees = [];
        if (e.privacy?.hideComments)      result.comments  = [];
        if (e.privacy?.hideInsights)      delete result.views;
      }
      return result;
    });

    const total = await Event.countDocuments(query);
    res.json({ events: formatted, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ message: 'Error fetching feed.' });
  }
});

// ─── GET /api/events/my — current user's events ──────────────
router.get('/my', requireAuth, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your events.' });
  }
});

// ─── GET /api/events/:id ─────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'fullName avatar location occupation interests')
      .populate('attendees', 'fullName avatar')
      .populate('comments.author', 'fullName avatar')
      .populate('comments.replies.author', 'fullName avatar');

    if (!event) return res.status(404).json({ message: 'Event not found.' });

    // Increment view count (don't await — fire & forget)
    Event.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    res.json({ event: formatEvent(event, req.user?._id) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching event.' });
  }
});

// ─── POST /api/events — create event ─────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title, category, description, bannerImage,
      location, address, district, dateTime, endDateTime,
      price, ticketLink, maxAttendees, tags, customFields, privacy
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required.' });
    }

    const event = await Event.create({
      title, category,
      description: description || '',
      bannerImage:  bannerImage  || '',
      location:     location     || '',
      address:      address      || '',
      district:     district     || req.user.location || '',
      dateTime:     dateTime     || undefined,
      endDateTime:  endDateTime  || undefined,
      price:        price        || 'Free',
      ticketLink:   ticketLink   || '',
      maxAttendees: maxAttendees || undefined,
      tags:         tags         || [],
      customFields: customFields || [],
      organizer:    req.user._id,
      privacy:      privacy      || {}
    });

    const populated = await Event.findById(event._id)
      .populate('organizer', 'fullName avatar location');

    res.status(201).json({ message: 'Event created!', event: populated });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ message: 'Error creating event.' });
  }
});

// ─── PUT /api/events/:id — update event ──────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const allowedFields = [
      'title','category','description','bannerImage','location','address',
      'district','dateTime','endDateTime','price','ticketLink',
      'maxAttendees','tags','customFields','status','privacy'
    ];
    allowedFields.forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });
    await event.save();

    const updated = await Event.findById(event._id)
      .populate('organizer', 'fullName avatar location')
      .populate('comments.author', 'fullName avatar')
      .populate('comments.replies.author', 'fullName avatar');

    res.json({ message: 'Event updated!', event: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating event.' });
  }
});

// ─── DELETE /api/events/:id ───────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await event.deleteOne();
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting event.' });
  }
});

// ─── PUT /api/events/:id/status — update status ──────────────
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'postponed', 'over', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can change event status.' });
    }
    event.status = status;
    await event.save();
    res.json({ message: `Status updated to ${status}.`, event });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status.' });
  }
});

// ─── PUT /api/events/:id/privacy ─────────────────────────────
router.put('/:id/privacy', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can change privacy settings.' });
    }
    event.privacy = { ...event.privacy, ...req.body };
    await event.save();
    res.json({ message: 'Privacy settings updated.', privacy: event.privacy });
  } catch (err) {
    res.status(500).json({ message: 'Error updating privacy.' });
  }
});

// ─── POST /api/events/:id/attend — toggle attend ─────────────
router.post('/:id/attend', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const userId = req.user._id.toString();
    const idx = event.attendees.findIndex(a => a.toString() === userId);

    if (idx === -1) {
      // Check capacity
      if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
        return res.status(400).json({ message: 'This event has reached maximum capacity.' });
      }
      event.attendees.push(req.user._id);
    } else {
      event.attendees.splice(idx, 1);
    }
    await event.save();

    res.json({
      attending: idx === -1,
      attendeeCount: event.attendees.length,
      message: idx === -1 ? 'You are now attending!' : 'Attendance removed.'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling attendance.' });
  }
});

// ─── POST /api/events/:id/comments — add comment ─────────────
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.privacy?.hideComments && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Comments are disabled for this event.' });
    }

    event.comments.push({ author: req.user._id, text: text.trim() });
    await event.save();

    // Populate the new comment
    await event.populate('comments.author', 'fullName avatar');
    const newComment = event.comments[event.comments.length - 1];
    res.status(201).json({ comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Error adding comment.' });
  }
});

// ─── POST /api/events/:id/comments/:cId/reply ────────────────
router.post('/:id/comments/:cId/reply', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required.' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const comment = event.comments.id(req.params.cId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    comment.replies.push({ author: req.user._id, text: text.trim() });
    await event.save();
    await event.populate('comments.replies.author', 'fullName avatar');

    const updatedComment = event.comments.id(req.params.cId);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];
    res.status(201).json({ reply: newReply });
  } catch (err) {
    res.status(500).json({ message: 'Error adding reply.' });
  }
});

// ─── PUT /api/events/:id/comments/:cId/react ─────────────────
router.put('/:id/comments/:cId/react', requireAuth, async (req, res) => {
  try {
    const { action } = req.body; // 'like' or 'dislike'
    if (!['like','dislike'].includes(action)) {
      return res.status(400).json({ message: 'Action must be like or dislike.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const comment = event.comments.id(req.params.cId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    const userId = req.user._id.toString();
    const likeIdx    = comment.likes.findIndex(id => id.toString() === userId);
    const dislikeIdx = comment.dislikes.findIndex(id => id.toString() === userId);

    if (action === 'like') {
      if (likeIdx > -1) {
        comment.likes.splice(likeIdx, 1);   // toggle off
      } else {
        comment.likes.push(req.user._id);
        if (dislikeIdx > -1) comment.dislikes.splice(dislikeIdx, 1); // remove dislike
      }
    } else {
      if (dislikeIdx > -1) {
        comment.dislikes.splice(dislikeIdx, 1);
      } else {
        comment.dislikes.push(req.user._id);
        if (likeIdx > -1) comment.likes.splice(likeIdx, 1);
      }
    }

    await event.save();
    res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: 'Error reacting to comment.' });
  }
});

// ─── PUT /api/events/:id/comments/:cId/replies/:rId/react ────
router.put('/:id/comments/:cId/replies/:rId/react', requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['like','dislike'].includes(action)) return res.status(400).json({ message: 'Invalid action.' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    const comment = event.comments.id(req.params.cId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });
    const reply = comment.replies.id(req.params.rId);
    if (!reply) return res.status(404).json({ message: 'Reply not found.' });

    const userId = req.user._id.toString();
    const likeIdx    = reply.likes.findIndex(id => id.toString() === userId);
    const dislikeIdx = reply.dislikes.findIndex(id => id.toString() === userId);

    if (action === 'like') {
      if (likeIdx > -1) { reply.likes.splice(likeIdx, 1); }
      else { reply.likes.push(req.user._id); if (dislikeIdx > -1) reply.dislikes.splice(dislikeIdx, 1); }
    } else {
      if (dislikeIdx > -1) { reply.dislikes.splice(dislikeIdx, 1); }
      else { reply.dislikes.push(req.user._id); if (likeIdx > -1) reply.likes.splice(likeIdx, 1); }
    }

    await event.save();
    res.json({ likes: reply.likes.length, dislikes: reply.dislikes.length });
  } catch (err) {
    res.status(500).json({ message: 'Error reacting to reply.' });
  }
});

// ─── DELETE /api/events/:id/comments/:cId ────────────────────
router.delete('/:id/comments/:cId', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const comment = event.comments.id(req.params.cId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    const isOwner = event.organizer.toString() === req.user._id.toString();
    const isAuthor = comment.author.toString() === req.user._id.toString();
    if (!isOwner && !isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment.' });
    }

    comment.deleteOne();
    await event.save();
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting comment.' });
  }
});

module.exports = router;