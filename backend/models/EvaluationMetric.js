const mongoose = require('mongoose');

const evaluationMetricSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metricType: {
        type: String,
        enum: ['syllabus-coverage', 'answer-correctness', 'quiz-discrimination', 'mastery-improvement', 'latency'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EvaluationMetric', evaluationMetricSchema);
