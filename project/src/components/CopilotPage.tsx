import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import LearningPlanViewer from './LearningPlanViewer';
import CopilotChat from './CopilotChat';
import MasteryDashboard from './MasteryDashboard';

interface CopilotPageProps {
  courseId?: string;
  onBack?: () => void;
}

const CopilotPage: React.FC<CopilotPageProps> = ({ courseId, onBack }) => {
  const { user } = useAuth();
  const { courses } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId);
  const [selectedTab, setSelectedTab] = useState<'plan' | 'chat' | 'mastery'>('plan');
  const [loading, setLoading] = useState(false);

  // Find the course name
  const selectedCourse = courses.find((c: any) => c._id === selectedCourseId || c.id === selectedCourseId);
  const courseName = selectedCourse?.title || 'Course';

  // Load the first course by default if none selected
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0]._id || courses[0].id);
    }
  }, [courses, selectedCourseId]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Please log in to access the Learning Copilot</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft size={20} />
                Back
              </button>
            )}
            <BookOpen className="text-blue-600" size={28} />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Learning Copilot</h1>
              <p className="text-gray-600 text-sm">Personalized learning plans, instant help, and mastery tracking</p>
            </div>
          </div>

          {/* Course Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Select Course:</label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedTab('plan');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose a course --</option>
              {courses.map((course: any) => (
                <option key={course._id || course.id} value={course._id || course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!selectedCourseId ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Course Selected</h2>
            <p className="text-gray-600">Please select a course above to get started with your personalized learning plan.</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-6 flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setSelectedTab('plan')}
                className={`px-4 py-2 font-semibold border-b-2 transition ${
                  selectedTab === 'plan'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                📋 Learning Plan
              </button>
              <button
                onClick={() => setSelectedTab('chat')}
                className={`px-4 py-2 font-semibold border-b-2 transition ${
                  selectedTab === 'chat'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                💬 Copilot Chat
              </button>
              <button
                onClick={() => setSelectedTab('mastery')}
                className={`px-4 py-2 font-semibold border-b-2 transition ${
                  selectedTab === 'mastery'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                🎯 Mastery Tracking
              </button>
            </div>

            {/* Tab Content */}
            {selectedTab === 'plan' && (
              <div>
                <LearningPlanViewer courseId={selectedCourseId} courseName={courseName} />
              </div>
            )}

            {selectedTab === 'chat' && (
              <div style={{ height: '600px' }}>
                <CopilotChat courseId={selectedCourseId} courseName={courseName} />
              </div>
            )}

            {selectedTab === 'mastery' && (
              <div>
                <MasteryDashboard courseId={selectedCourseId} courseName={courseName} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Info */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Learning Plans</h3>
              <p className="text-sm text-blue-800">
                Get personalized, week-by-week learning paths tailored to your goals.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">💬 24/7 Help</h3>
              <p className="text-sm text-purple-800">
                Ask the Copilot anything about your course. Get instant, contextual help.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">🎯 Track Progress</h3>
              <p className="text-sm text-green-800">
                Monitor your mastery of each topic and identify areas for improvement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopilotPage;
