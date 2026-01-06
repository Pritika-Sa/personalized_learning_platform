import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LearningDashboard.css';

/**
 * Learning Dashboard Component
 * 
 * Comprehensive view of:
 * - Current week's learning plan
 * - Topic mastery tracking with progress bars
 * - Next recommended action
 * - Learning metrics and consistency
 * - Copilot suggestions
 * 
 * This component fetches data from:
 * - GET /api/copilot/dashboard/:courseId
 * - GET /api/learning/topics/:courseId
 * - GET /api/copilot/next-topic/:courseId
 */

interface MasteryTopic {
  name: string;
  score: number;
}

interface WeekPlan {
  weekNumber: number;
  topics: string[];
  hoursPerWeek: number;
  status: string;
}

interface DashboardData {
  overview: {
    courseId: string;
    progressPercent: number;
    completedTopics: number;
    totalTopicsEstimated: number;
    currentWeek: number;
  };
  learningPlan: {
    currentWeek: number;
    currentWeekTopics: string[];
    currentWeekHours: number;
    currentWeekStatus: string;
  };
  topicMastery: {
    weak: MasteryTopic[];
    medium: MasteryTopic[];
    strong: MasteryTopic[];
  };
  statistics: {
    quizzesCompleted: number;
    averageQuizScore: number;
    mistakesMade: number;
    mistakesCorrected: number;
    totalTimeInvested: number;
    consistency: number;
  };
  learningPattern: {
    velocity: string;
    avgSessionDuration: number;
    preferredStudyTime: string;
    engagementLevel: string;
  };
  recommendations: {
    nextTopic: string;
    nextTopicReason: string;
    suggestedAction: string;
    weakTopicsCount: number;
  };
}

const LearningDashboard: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [courseId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/copilot/dashboard/${courseId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      setDashboard(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load learning dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="learning-dashboard loading">📊 Loading your learning dashboard...</div>;
  }

  if (error) {
    return <div className="learning-dashboard error">⚠️ {error}</div>;
  }

  if (!dashboard) {
    return <div className="learning-dashboard empty">No learning data yet. Start a course!</div>;
  }

  return (
    <div className="learning-dashboard">
      <h1>📚 Your Personalized Learning Dashboard</h1>

      {/* Overall Progress */}
      <section className="progress-section">
        <h2>📈 Overall Progress</h2>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${dashboard.overview.progressPercent}%` }}
            >
              {dashboard.overview.progressPercent}%
            </div>
          </div>
          <p className="progress-text">
            {dashboard.overview.completedTopics} of {dashboard.overview.totalTopicsEstimated} topics completed
          </p>
        </div>
      </section>

      {/* Current Week Plan */}
      <section className="week-plan-section">
        <h2>📅 This Week's Plan (Week {dashboard.learningPlan.currentWeek})</h2>
        <div className="week-card">
          <div className="week-header">
            <h3>Topics to Cover</h3>
            <span className={`status ${dashboard.learningPlan.currentWeekStatus}`}>
              {dashboard.learningPlan.currentWeekStatus}
            </span>
          </div>
          <ul className="topics-list">
            {dashboard.learningPlan.currentWeekTopics.map((topic, idx) => (
              <li key={idx} className="topic-item">
                <input type="checkbox" id={`topic-${idx}`} />
                <label htmlFor={`topic-${idx}`}>{topic}</label>
              </li>
            ))}
          </ul>
          <p className="week-hours">
            ⏱️ Target: {dashboard.learningPlan.currentWeekHours} hours this week
          </p>
        </div>
      </section>

      {/* Topic Mastery Tracker */}
      <section className="mastery-section">
        <h2>🎯 Topic Mastery Tracker</h2>
        
        {dashboard.topicMastery.weak.length > 0 && (
          <div className="mastery-category weak">
            <h3>⚠️ Weak Topics ({dashboard.topicMastery.weak.length})</h3>
            <div className="mastery-list">
              {dashboard.topicMastery.weak.map((topic, idx) => (
                <div key={idx} className="mastery-item weak">
                  <span className="topic-name">{topic.name}</span>
                  <div className="mastery-bar">
                    <div className="mastery-fill weak" style={{ width: `${topic.score}%` }}>
                      {topic.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dashboard.topicMastery.medium.length > 0 && (
          <div className="mastery-category medium">
            <h3>🟡 Medium Topics ({dashboard.topicMastery.medium.length})</h3>
            <div className="mastery-list">
              {dashboard.topicMastery.medium.map((topic, idx) => (
                <div key={idx} className="mastery-item medium">
                  <span className="topic-name">{topic.name}</span>
                  <div className="mastery-bar">
                    <div className="mastery-fill medium" style={{ width: `${topic.score}%` }}>
                      {topic.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dashboard.topicMastery.strong.length > 0 && (
          <div className="mastery-category strong">
            <h3>✅ Strong Topics ({dashboard.topicMastery.strong.length})</h3>
            <div className="mastery-list">
              {dashboard.topicMastery.strong.map((topic, idx) => (
                <div key={idx} className="mastery-item strong">
                  <span className="topic-name">{topic.name}</span>
                  <div className="mastery-bar">
                    <div className="mastery-fill strong" style={{ width: `${topic.score}%` }}>
                      {topic.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Learning Statistics */}
      <section className="statistics-section">
        <h2>📊 Learning Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Quizzes Completed</h4>
            <p className="stat-value">{dashboard.statistics.quizzesCompleted}</p>
          </div>
          <div className="stat-card">
            <h4>Average Quiz Score</h4>
            <p className="stat-value">{dashboard.statistics.averageQuizScore}%</p>
          </div>
          <div className="stat-card">
            <h4>Mistakes Made</h4>
            <p className="stat-value">{dashboard.statistics.mistakesMade}</p>
          </div>
          <div className="stat-card">
            <h4>Mistakes Corrected</h4>
            <p className="stat-value">{dashboard.statistics.mistakesCorrected}</p>
          </div>
          <div className="stat-card">
            <h4>Total Time Invested</h4>
            <p className="stat-value">{dashboard.statistics.totalTimeInvested}h</p>
          </div>
          <div className="stat-card">
            <h4>Consistency</h4>
            <p className="stat-value">{dashboard.statistics.consistency}%</p>
          </div>
        </div>
      </section>

      {/* Learning Pattern */}
      <section className="pattern-section">
        <h2>🧠 Your Learning Pattern</h2>
        <div className="pattern-grid">
          <div className="pattern-item">
            <span className="label">Learning Velocity:</span>
            <span className="value">{dashboard.learningPattern.velocity}</span>
          </div>
          <div className="pattern-item">
            <span className="label">Avg Session Duration:</span>
            <span className="value">{dashboard.learningPattern.avgSessionDuration} mins</span>
          </div>
          <div className="pattern-item">
            <span className="label">Preferred Study Time:</span>
            <span className="value">{dashboard.learningPattern.preferredStudyTime}</span>
          </div>
          <div className="pattern-item">
            <span className="label">Engagement Level:</span>
            <span className="value">{dashboard.learningPattern.engagementLevel}</span>
          </div>
        </div>
      </section>

      {/* Copilot Recommendation */}
      <section className="recommendation-section">
        <h2>🤖 Copilot Recommendation</h2>
        <div className="recommendation-card">
          <h3>Next Topic: {dashboard.recommendations.nextTopic}</h3>
          <p>{dashboard.recommendations.nextTopicReason}</p>
          {dashboard.recommendations.weakTopicsCount > 0 && (
            <div className="action-suggestion">
              <p>💡 You have {dashboard.recommendations.weakTopicsCount} weak topics that need attention.</p>
              <button className="btn-review-weak">Review Weak Topics</button>
            </div>
          )}
          <button className="btn-start-learning">Start Learning</button>
        </div>
      </section>
    </div>
  );
};

export default LearningDashboard;
