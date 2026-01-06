const EvaluationMetric = require('../models/EvaluationMetric');
const Course = require('../models/Course');
const TopicMastery = require('../models/TopicMastery');

class EvaluationService {
    /**
     * Record a latency metric
     */
    async logLatency(type, ms) {
        return await EvaluationMetric.create({
            metricType: 'latency',
            value: ms,
            metadata: { type }
        });
    }

    /**
     * Calculate syllabus coverage for a course plan
     */
    async evaluateSyllabusCoverage(courseId, plan) {
        const course = await Course.findById(courseId);
        if (!course) return 0;

        const totalTopics = course.topics.length;
        const coveredTopics = new Set();

        plan.weeks.forEach(week => {
            week.topics.forEach(t => {
                if (course.topics.includes(t)) {
                    coveredTopics.add(t);
                }
            });
        });

        const coverage = (coveredTopics.size / totalTopics) * 100;

        await EvaluationMetric.create({
            courseId,
            metricType: 'syllabus-coverage',
            value: coverage,
            metadata: { totalTopics, coveredTopics: coveredTopics.size }
        });

        return coverage;
    }

    /**
     * Evaluate Quiz Discrimination (simulated)
     * How well easy vs hard questions separate student performance
     */
    async logQuizDiscrimination(courseId, easyAvg, hardAvg) {
        const discriminationIndex = hardAvg / (easyAvg || 1); // Simple ratio
        return await EvaluationMetric.create({
            courseId,
            metricType: 'quiz-discrimination',
            value: discriminationIndex,
            metadata: { easyAvg, hardAvg }
        });
    }

    /**
     * Log Answer Correctness
     */
    async logAnswerCorrectness(courseId, userId, score) {
        return await EvaluationMetric.create({
            courseId,
            userId,
            metricType: 'answer-correctness',
            value: score,
            metadata: { timestamp: new Date() }
        });
    }

    /**
     * Log Mastery Improvement
     */
    async logMasteryImprovement(courseId, userId, improvement) {
        return await EvaluationMetric.create({
            courseId,
            userId,
            metricType: 'mastery-improvement',
            value: improvement,
            metadata: { timestamp: new Date() }
        });
    }
}

module.exports = new EvaluationService();
