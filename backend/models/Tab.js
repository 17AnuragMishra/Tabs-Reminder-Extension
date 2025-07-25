const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  reminderTime: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Tab', TabSchema); 