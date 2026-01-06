const mongoose = require('mongoose');

const masterySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  topic: { type: String, required: true },
  score: { type: Number, default: 0 }, // 0-100 mastery
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date, default: null },
  history: { type: [{ at: Date, score: Number }], default: [] }
}, { timestamps: true });

masterySchema.index({ userId: 1, courseId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('Mastery', masterySchema);
