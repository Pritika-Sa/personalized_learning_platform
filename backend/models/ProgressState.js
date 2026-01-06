const mongoose = require('mongoose');

const progressStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  currentWeek: { type: Number, default: 1 },
  currentTopic: { type: String, default: '' },
  progressPercent: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  state: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

progressStateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('ProgressState', progressStateSchema);
