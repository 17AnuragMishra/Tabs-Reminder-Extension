const express = require('express');
const Tab = require('../models/Tab');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all tabs for user
router.get('/', auth, async (req, res) => {
  try {
    const tabs = await Tab.find({ user: req.user }).sort({ updatedAt: -1 });
    res.json(tabs);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// Add a new tab
router.post('/', auth, async (req, res) => {
  try {
    const { title, url, reminderTime } = req.body;
    const tab = await Tab.create({
      user: req.user,
      title,
      url,
      reminderTime: reminderTime ? new Date(reminderTime) : undefined,
    });
    res.json(tab);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// Update a tab
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, url, reminderTime } = req.body;
    const tab = await Tab.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { title, url, reminderTime: reminderTime ? new Date(reminderTime) : undefined },
      { new: true }
    );
    if (!tab) return res.status(404).json({ message: 'Tab not found.' });
    res.json(tab);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// Delete a tab
router.delete('/:id', auth, async (req, res) => {
  try {
    const tab = await Tab.findOneAndDelete({ _id: req.params.id, user: req.user });
    if (!tab) return res.status(404).json({ message: 'Tab not found.' });
    res.json({ message: 'Tab deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router; 