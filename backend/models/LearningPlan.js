const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  topics: { type: [String], default: [] },
  hoursPerWeek: { type: Number, default: 5 },
  tasks: { type: [String], default: [] },
  status: { type: String, enum: ['pending','in-progress','completed'], default: 'pending' }
}, { _id: false });

const learningPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, default: 'Personalized Learning Plan' },
  description: { type: String, default: '' },
  weeks: { type: [weekSchema], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

learningPlanSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('LearningPlan', learningPlanSchema);
