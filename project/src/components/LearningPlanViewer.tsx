import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Clock, CheckCircle, AlertCircle, RefreshCw, Loader } from 'lucide-react';
import copilotService, { LearningPlan, Week } from '../services/copilotService';

interface LearningPlanViewerProps {
  courseId: string;
  courseName?: string;
}

const LearningPlanViewer: React.FC<LearningPlanViewerProps> = ({ courseId, courseName = 'Course' }) => {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  // Load existing plan on mount
  useEffect(() => {
    loadPlan();
  }, [courseId]);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    const result = await copilotService.getLearningPlan(courseId);
    setLoading(false);
    
    if (result.success && result.plan) {
      setPlan(result.plan);
    } else {
      setError(result.error || 'No learning plan found. Generate one to get started!');
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError(null);
    const result = await copilotService.generateLearningPlan(courseId, 8, 5, `Learn ${courseName}`);
    setGenerating(false);

    if (result.success && result.plan) {
      setPlan(result.plan);
    } else {
      setError(result.error || 'Failed to generate learning plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-800">Learning Plan</h2>
        </div>
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {generating ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          {generating ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="text-amber-800 font-medium">No Plan Available</p>
            <p className="text-amber-700 text-sm">{error}</p>
            {!plan && (
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="mt-2 px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:bg-gray-400 transition"
              >
                {generating ? 'Generating...' : 'Create Your Plan'}
              </button>
            )}
          </div>
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-1">{plan.title}</h3>
            <p className="text-sm text-blue-700">{plan.description}</p>
          </div>

          <div className="space-y-3">
            {plan.weeks && plan.weeks.map((week: Week) => (
              <div
                key={week.weekNumber}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      {week.weekNumber}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">
                        Week {week.weekNumber}: {week.topics?.[0] || 'Topics'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {week.hoursPerWeek ? `${week.hoursPerWeek} hours/week` : ''} • {week.topics?.length || 0} topics
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {week.status === 'completed' && <CheckCircle className="text-green-500" size={20} />}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      week.status === 'completed' ? 'bg-green-100 text-green-700' :
                      week.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {week.status || 'not-started'}
                    </span>
                  </div>
                </button>

                {expandedWeek === week.weekNumber && (
                  <div className="px-4 py-3 bg-white border-t">
                    <div className="space-y-3">
                      {week.topics && week.topics.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                            <BookOpen size={16} /> Topics
                          </h4>
                          <ul className="space-y-1">
                            {week.topics.map((topic, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                {topic}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {week.tasks && week.tasks.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle size={16} /> Tasks
                          </h4>
                          <ul className="space-y-1">
                            {week.tasks.map((task, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {week.hoursPerWeek && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                          <Clock size={16} />
                          <span>{week.hoursPerWeek} hours recommended for this week</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPlanViewer;
