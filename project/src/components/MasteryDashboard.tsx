import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Award, TrendingUp, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import copilotService, { MasteryRecord } from '../services/copilotService';

interface MasteryDashboardProps {
  courseId: string;
  courseName?: string;
  masteryRecords?: MasteryRecord[];
}

const MasteryDashboard: React.FC<MasteryDashboardProps> = ({
  courseId,
  courseName = 'Course',
  masteryRecords = [],
}) => {
  const [records, setRecords] = useState<MasteryRecord[]>(masteryRecords);
  const [quizScores, setQuizScores] = useState<{ [topic: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate overall mastery
  const calculateOverallMastery = () => {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + r.score, 0);
    return Math.round(total / records.length);
  };

  // Handle quiz submission
  const handleSubmitQuiz = async (topic: string, e: React.FormEvent) => {
    e.preventDefault();
    const score = quizScores[topic];
    
    if (score === undefined || score < 0 || score > 100) {
      alert('Please enter a valid score (0-100)');
      return;
    }

    setSubmitting(true);
    const result = await copilotService.submitQuizResult(courseId, topic, score);
    setSubmitting(false);

    if (result.success && result.mastery) {
      // Update local records
      const existingIndex = records.findIndex(r => r.topic === topic);
      if (existingIndex >= 0) {
        const updated = [...records];
        updated[existingIndex] = result.mastery;
        setRecords(updated);
      } else {
        setRecords([...records, result.mastery]);
      }
      
      // Clear input
      setQuizScores({ ...quizScores, [topic]: 0 });
      setSuccess(`Great! ${result.mastery.topic} mastery updated. ${result.suggestion || ''}`);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getMasteryLabel = (score: number) => {
    if (score >= 80) return 'Mastered';
    if (score >= 60) return 'Proficient';
    if (score >= 40) return 'Learning';
    return 'Struggling';
  };

  const overallMastery = calculateOverallMastery();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-purple-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-800">Topic Mastery</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Overall Mastery</p>
          <p className="text-3xl font-bold text-purple-600">{overallMastery}%</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5" size={20} />
          <div>
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Overall Progress Bar */}
      {records.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-purple-900">Overall Progress</p>
            <p className="text-sm text-purple-700">{records.length} topics tracked</p>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-500"
              style={{ width: `${overallMastery}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Topic Mastery Cards */}
      {records.length > 0 ? (
        <div className="space-y-4 mb-6">
          {records.map((record) => (
            <div
              key={record._id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen size={16} />
                    {record.topic}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {record.attempts} attempt{record.attempts !== 1 ? 's' : ''} • Latest: {Math.round(record.history?.[record.history.length - 1]?.score || 0)}%
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getMasteryColor(record.score)}`}>
                  {getMasteryLabel(record.score)}
                </span>
              </div>

              {/* Score Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600">Mastery Score</p>
                  <p className="text-sm font-bold text-gray-800">{record.score}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${getMasteryColor(record.score)} h-full transition-all duration-500`}
                    style={{ width: `${record.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Score History (last 3) */}
              {record.history && record.history.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded flex items-center gap-2">
                  <TrendingUp size={14} className="text-gray-600" />
                  <div className="flex gap-1">
                    {record.history.slice(-3).map((entry, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="text-gray-600 font-semibold">{entry.score}%</div>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 ml-auto">Recent attempts</span>
                </div>
              )}

              {/* Quiz Input */}
              {record.score < 80 && (
                <form onSubmit={(e) => handleSubmitQuiz(record.topic, e)} className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Enter quiz score"
                    value={quizScores[record.topic] || ''}
                    onChange={(e) =>
                      setQuizScores({ ...quizScores, [record.topic]: parseInt(e.target.value) || 0 })
                    }
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !quizScores[record.topic]}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-gray-400 transition"
                  >
                    {submitting ? 'Saving...' : 'Log Score'}
                  </button>
                </form>
              )}

              {record.score >= 80 && (
                <div className="p-2 bg-green-50 rounded flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle size={16} />
                  Mastered! Great job on this topic.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <Award className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-gray-600 mb-2">No mastery records yet</p>
          <p className="text-sm text-gray-500">
            Complete quizzes and log your scores to track your mastery progress on different topics.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">Tips for mastery:</p>
            <ul className="text-blue-800 text-xs mt-2 space-y-1">
              <li>• Complete practice quizzes regularly</li>
              <li>• Aim for 80%+ score to master a topic</li>
              <li>• Review weaker topics frequently</li>
              <li>• The Copilot can help you understand difficult concepts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasteryDashboard;
