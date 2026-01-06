import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { ArrowLeft, Clock, Users, Star, Award, Play, CheckCircle, Lock, CreditCard, DollarSign, X, ChevronRight } from 'lucide-react';
import ReviewSection from './ReviewSection';
import PaymentModal from './PaymentModal';
import LearningDashboard from './LearningDashboard';
import CopilotChat from './CopilotChat';
import AdaptiveQuizRenderer from './AdaptiveQuizRenderer';

// paymentService removed — payments deprecated. Course access checked via course status API.

interface CourseDetailProps {
  course: any;
  onLessonSelect: (lesson: any) => void;
  onAssessmentStart: () => void;
  onAssessmentComplete?: (passed: boolean) => void;
  onBack: () => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  onLessonSelect,
  onAssessmentStart,
  onAssessmentComplete,
  onBack
}) => {
  const { user } = useAuth();
  const { getCourseProgress, getLastLessonId } = useCourses();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  // Add this prop to force refresh review eligibility after assessment
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [showMessage, setShowMessage] = useState<string | null>(null);
  const [justCompletedAssessment, setJustCompletedAssessment] = useState(false);

  // Payment related state
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Learning Copilot state
  const [learningPlanInitialized, setLearningPlanInitialized] = useState(false);

  // Calculate progress and completion status
  useEffect(() => {
    if (!course || !user) return;

    // Check for query parameters from checkout redirect
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    const paymentSuccess = urlParams.get('payment');

    if (message === 'already-enrolled') {
      setShowMessage('already-enrolled');
      // Clear the URL parameter
      navigate(location.pathname, { replace: true });
    } else if (message === 'free-course') {
      setShowMessage('free-course');
      navigate(location.pathname, { replace: true });
    } else if (paymentSuccess === 'success') {
      setShowMessage('payment-success');
      navigate(location.pathname, { replace: true });
    }

    // Auto-hide message after 5 seconds
    if (showMessage) {
      const timer = setTimeout(() => setShowMessage(null), 5000);
      return () => clearTimeout(timer);
    }

    const courseId = (course as any)._id || course.id;
    const userId = (user as any).id || (user as any)._id;

    // Get progress from context
    const currentProgress = getCourseProgress(courseId, userId);
    setProgress(currentProgress);

    // Course should only be considered "completed" if all videos are watched (100% progress)
    // AND the user has passed the assessment
    const isAllVideosWatched = currentProgress === 100;

    // Check payment status and course access
    const checkCourseAccess = async () => {
      try {
        setPaymentLoading(true);

        const token = localStorage.getItem('authToken');
        // Query backend for course status (enrollment / access)
        const statusResp = await fetch(`http://localhost:5001/api/courses/${courseId}/status`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        let status: any = { isFree: (course.price || 0) === 0, isEnrolled: false, canAccess: false };
        if (statusResp.ok) {
          status = await statusResp.json();
        }

        setPaymentStatus(status);

        // Auto-enroll user in free courses if not already enrolled
        if (status.isFree && !status.isEnrolled) {
          try {
            const enrollResponse = await fetch(`http://localhost:5001/api/courses/${courseId}/enroll`, {
              method: 'POST',
              headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
            });

            if (enrollResponse.ok) {
              status.isEnrolled = true;
              status.canAccess = true;
            }
          } catch (enrollError) {
            console.error('Error auto-enrolling in free course:', enrollError);
          }
        }

        const hasAccess = status.canAccess || (status.isFree && status.isEnrolled);
        setHasAccess(hasAccess);

        if (hasAccess) {
          // Re-check completion status from backend
          if (token) {
            const response = await fetch(`http://localhost:5001/api/courses/${courseId}/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const courseStatus = await response.json();
              const backendCompleted = courseStatus.completed;
              const isFullyCompleted = backendCompleted && isAllVideosWatched;
              setIsCompleted(isFullyCompleted);
            }
          }
        }
      } catch (error) {
        console.error('Error checking course access:', error);
        const isFreeFromPricing = (course.price || 0) === 0;
        setHasAccess(isFreeFromPricing);
        setPaymentStatus({ isFree: isFreeFromPricing, canAccess: isFreeFromPricing, error: true });
        setIsCompleted(false);
      } finally {
        setPaymentLoading(false);
      }
    };

    checkCourseAccess();

    console.log('Course Detail Debug:', {
      courseId,
      userId,
      currentProgress,
      hasAssessments: course.assessments && course.assessments.length > 0,
      totalLessons: course.lessons?.length || course.videos?.length || 0
    });
  }, [course, user, getCourseProgress]);

  // Handle forced refresh after assessment completion
  useEffect(() => {
    const forceRefresh = sessionStorage.getItem('forceRefreshCourse');
    if (forceRefresh) {
      sessionStorage.removeItem('forceRefreshCourse');

      // Immediately check course completion status again
      const recheckCompletion = async () => {
        if (user && course) {
          const courseId = (course as any)._id || course.id;
          const token = localStorage.getItem('authToken');

          if (token) {
            try {
              const response = await fetch(`http://localhost:5001/api/courses/${courseId}/status`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                const courseStatus = await response.json();
                setIsCompleted(courseStatus.completed);

                // Also update progress to 100% if completed
                if (courseStatus.completed) {
                  setProgress(100);
                }
              }
            } catch (error) {
              console.error('Error rechecking course completion:', error);
            }
          }
        }
      };

      recheckCompletion();
    }
  }, [course, user]);

  if (!course) return null;

  const resolvedUserId = (user as any)?.id || (user as any)?._id || '';
  const lessonProgressKey = `progress_${resolvedUserId}_${(course as any)._id || course.id}`;
  const lessonProgress = JSON.parse(localStorage.getItem(lessonProgressKey) || '{}');

  const lastLessonId = getLastLessonId((course as any)._id || course.id, resolvedUserId);
  const lessons = course.lessons || course.videos || [];

  // Debug lesson progress
  console.log('CourseDetail Lesson Progress Debug:', {
    userId: resolvedUserId,
    userObject: user,
    courseId: (course as any)._id || course.id,
    lessonProgressKey,
    lessonProgress,
    allLocalStorageKeys: Object.keys(localStorage).filter(key => key.includes('progress_')),
    lessons: lessons.map((l: any) => ({ id: l._id || l.id, title: l.title }))
  });

  const lastLesson = lastLessonId ? lessons.find((l: any) => (l as any)._id === lastLessonId || l.id === lastLessonId) : null;

  // Check if course has assessments
  const hasAssessments = course.assessments && course.assessments.length > 0;
  const totalLessons = lessons.length;

  // Get a list of valid lesson IDs to compare against
  const validLessonIds = lessons.map((l: any) => l._id || l.id);

  // Only count completed lessons that actually exist in the course
  const completedLessons = Object.keys(lessonProgress)
    .filter(id => validLessonIds.includes(id))
    .length;

  // Determine if all videos are completed based on exact lesson count
  const allVideosCompleted = completedLessons >= totalLessons;

  // Use both progress calculation and lesson count to determine if assessment should be shown
  // This makes the check more robust
  const shouldShowAssessment = progress >= 100 || allVideosCompleted;

  // Check if user has attempted but not passed the assessment
  const [hasAttemptedAssessment, setHasAttemptedAssessment] = useState(false);

  // Enrollment status refresh handler (payments deprecated)
  const handlePaymentSuccess = async () => {
    const courseId = (course as any)._id || course.id;
    const token = localStorage.getItem('authToken');
    try {
      const resp = await fetch(`http://localhost:5001/api/courses/${courseId}/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (resp.ok) {
        const status = await resp.json();
        setPaymentStatus(status);
        setHasAccess(status.canAccess || status.isEnrolled || status.isFree);
      }
    } catch (err) {
      console.error('Error refreshing course status:', err);
    }
  };

  useEffect(() => {
    const checkAssessmentAttempts = async () => {
      if (!course || !user) return;

      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const courseId = (course as any)._id || course.id;
          const response = await fetch(`http://localhost:5001/api/assessments/results/course/${courseId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const results = await response.json();
            const userId = (user as any)._id || (user as any).id;
            const userResults = results.filter((r: any) => {
              if (!r.userId) return false;
              // Handle both string and object ID comparison
              const resultUserId = typeof r.userId === 'object' ? r.userId._id : r.userId;
              return resultUserId === userId;
            });
            console.log('Assessment results for current user:', userResults);
            setHasAttemptedAssessment(userResults.length > 0);
          }
        }
      } catch (error) {
        console.error('Error checking assessment attempts:', error);
      }
    };

    checkAssessmentAttempts();
  }, [course, user]);

  // Initialize learning plan when user accesses the course
  useEffect(() => {
    if (!hasAccess || !course || !user || learningPlanInitialized) return;

    const initializeLearningPlan = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const courseId = (course as any)._id || course.id;

        if (token) {
          const response = await fetch('http://localhost:5001/api/copilot/generate-plan-with-copilot', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              courseId,
              weeklyHoursAvailable: 10,
              preferredPace: 'moderate'
            })
          });

          if (response.ok) {
            console.log('Learning plan initialized successfully');
            setLearningPlanInitialized(true);
          }
        }
      } catch (error) {
        console.error('Error initializing learning plan:', error);
        // Don't prevent the course from loading if plan initialization fails
        setLearningPlanInitialized(true);
      }
    };

    initializeLearningPlan();
  }, [hasAccess, course, user, learningPlanInitialized]);

  // Comprehensive debug information
  console.log('CourseDetail Debug:', {
    courseId: (course as any)._id || course.id,
    progress,
    isCompleted,
    hasAssessments,
    totalLessons,
    completedLessons,
    allVideosCompleted: completedLessons >= totalLessons,
    shouldShowAssessment,
    hasAttemptedAssessment,
    hasAccess,
    assessmentButtonVisible: hasAccess && (completedLessons >= totalLessons || progress >= 100),
    validLessonIds: lessons.map((l: any) => l._id || l.id),
    lessons: lessons.map((l: any) => ({
      id: l._id || l.id,
      title: l.title,
      completed: !!lessonProgress[l._id || l.id],
      inProgressMap: !!lessonProgress[l._id || l.id]
    })),
    lessonProgress,
    lessonProgressKeys: Object.keys(lessonProgress)
  });

  // This effect will run when the component re-renders
  // We'll use it to handle any updates needed when returning from assessment
  useEffect(() => {
    // If we're marked as completed, force-refresh the review section
    if (isCompleted) {
      setReviewRefreshKey(prev => prev + 1);
      // Check if this is a recent completion (user just returned from assessment)
      const wasJustCompleted = sessionStorage.getItem('assessmentJustCompleted');
      if (wasJustCompleted) {
        setJustCompletedAssessment(true);
        sessionStorage.removeItem('assessmentJustCompleted');
        // Show completion message briefly
        setShowMessage('🎉 Congratulations! You have successfully completed the course!');
        setTimeout(() => {
          setShowMessage(null);
          setJustCompletedAssessment(false);
        }, 5000);
      }
    }
  }, [isCompleted]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-isabelline min-h-screen">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-dark-gunmetal hover:text-cyber-grape mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      {/* Success Messages */}
      {showMessage && (
        <div className="mb-6">
          {showMessage === 'payment-success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
                  <p className="text-green-700">You now have full access to this course. Happy learning!</p>
                </div>
              </div>
            </div>
          )}

          {showMessage === 'already-enrolled' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Already Enrolled</h3>
                  <p className="text-blue-700">You already have access to this course. Continue your learning!</p>
                </div>
              </div>
            </div>
          )}

          {showMessage === 'free-course' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Award className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Free Course Access</h3>
                  <p className="text-blue-700">This is a free course. Enjoy unlimited access!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Content */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl shadow-xl border border-cyan-100 overflow-hidden">
            <img
              src={course.thumbnail || 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200'}
              alt={course.title || 'Course'}
              className="w-full h-80 object-cover"
            />

            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm border-2 ${course.level === 'Beginner' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  course.level === 'Intermediate' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    'bg-rose-100 text-rose-700 border-rose-200'
                  }`}>
                  {course.level || 'Beginner'}
                </span>
                <div className="flex items-center space-x-4">
                  {(course.price || 0) > 0 && (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-800">
                        {course.price}
                      </div>
                      {paymentStatus?.hasPaid && (
                        <div className="text-sm text-emerald-600 font-semibold">Purchased</div>
                      )}
                    </div>
                  )}
                  {(course.price || 0) === 0 && (
                    <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-sm font-bold shadow-lg">
                      FREE
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex items-center space-x-2 text-emerald-600">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-semibold">Completed</span>
                    </div>
                  )}
                </div>
              </div>

              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">
                {course.title || 'Course Title'}
              </h1>

              <p className="text-gray-700 mb-8 leading-relaxed text-lg">
                {course.description || 'Course description not available'}
              </p>



              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-cyan-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-100 rounded-xl">
                      <Clock className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Duration</div>
                      <div className="font-bold text-gray-800">{course.duration || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Students</div>
                      <div className="font-bold text-gray-800">{course.students?.toLocaleString() || '5'} students</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-xl">
                      <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Rating</div>
                      <div className="font-bold text-gray-800">
                        {typeof course.rating === 'object' && course.rating?.count > 0
                          ? `${course.rating.average.toFixed(1)}/5 (${course.rating.count} reviews)`
                          : typeof course.rating === 'number' && course.rating > 0
                            ? `${course.rating.toFixed(1)}/5`
                            : '4.2/5 (5 reviews)'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Certificate</div>
                      <div className="font-bold text-gray-800">Included</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-100 to-blue-100 rounded-2xl p-6 mb-8 border border-cyan-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-800 text-lg">Course Progress</span>
                  <span className={`text-lg font-bold px-3 py-1 rounded-full ${isCompleted ? 'text-emerald-700 bg-emerald-100' : 'text-cyan-700 bg-cyan-100'}`}>
                    {isCompleted ? 'Completed ✅' : `${progress}%`}
                  </span>
                </div>
                <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-4 mb-2">
                  <div
                    className={`h-4 rounded-full transition-all duration-700 ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {isCompleted ? 'All lessons completed and assessment passed!' : `${progress}% complete - Keep going!`}
                </div>
                {lastLesson && !isCompleted && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-dark-gunmetal/70">Last lesson: <span className="font-medium">{lastLesson.title}</span></span>
                    <button
                      onClick={() => onLessonSelect(lastLesson)}
                      className="px-3 py-1.5 bg-cyber-grape hover:bg-cyber-grape-dark text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                )}
                {isCompleted && (
                  <div className="mt-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg transition-all duration-500 ${justCompletedAssessment
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 shadow-lg'
                      : 'bg-green-50 border border-green-200'
                      }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${justCompletedAssessment ? 'bg-green-500 animate-pulse' : 'bg-green-500'
                          }`}>
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="text-lg font-bold text-green-700">Course Completed!</span>
                          <p className="text-sm text-green-600">You've successfully finished all lessons and passed the assessment</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </div>
                    {justCompletedAssessment && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">Next Steps:</span>
                        </div>
                        <ul className="mt-2 text-sm text-blue-600 space-y-1">
                          <li>• Download your certificate from the dashboard</li>
                          <li>• Leave a review to help other students</li>
                          <li>• Explore more courses to continue learning</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Skills You'll Learn</h3>
                <div className="flex flex-wrap gap-3">
                  {(course.skills || ['java', 'oop', 'programming', 'backend', 'development']).map((skill: string, index: number) => (
                    <span
                      key={skill}
                      className={`px-4 py-2 text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 ${index % 5 === 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' :
                        index % 5 === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                          index % 5 === 2 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
                            index % 5 === 3 ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' :
                              'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructor section removed */}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Access Control / Enrollment (payments removed) */}
          {!paymentLoading && !hasAccess && (
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="text-2xl font-semibold text-gray-800 mb-3">Start learning instantly</div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('authToken');
                      await fetch(`/api/courses/${course._id || course.id}/enroll`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      window.location.reload();
                    } catch (err) {
                      console.error('Enroll error:', err);
                      alert('Failed to enroll. Please try again.');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 mb-6 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <CreditCard className="w-6 h-6" />
                  <span>Start Learning</span>
                </button>

                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Lifetime access</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Already Enrolled Message */}
          {!paymentLoading && hasAccess && course.price > 0 && paymentStatus?.hasPaid && (
            <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6">
              <div className="text-center">
                <div className="mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-green-800 mb-2">Already Enrolled!</h3>
                  <p className="text-green-700">You have full access to this course</p>
                </div>

                <div className="text-sm text-green-600 space-y-1">
                  <p>✓ Payment completed</p>
                  <p>✓ Lifetime access activated</p>
                  <p>✓ All features unlocked</p>
                </div>
              </div>
            </div>
          )}

          {/* Free Course Message */}
          {!paymentLoading && hasAccess && course.price === 0 && (
            <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="text-center">
                <div className="mb-4">
                  <Award className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-blue-800 mb-2">Free Course</h3>
                  <p className="text-blue-700">Enjoy this course at no cost!</p>
                </div>

                <div className="text-sm text-blue-600 space-y-1">
                  <p>✓ Full access included</p>
                  <p>✓ Certificate available</p>
                  <p>✓ All materials included</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Features Card */}
          {hasAccess && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 rounded-3xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200 dark:bg-indigo-800 pointer-events-none blur-3xl opacity-20 -mr-16 -mt-16"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2.5 bg-indigo-600 rounded-xl">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Learning Agent</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Powered by Gemini</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => {
                      const topic = course.topics?.[0] || 'Fundamentals';
                      setActiveQuizTopic(topic);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-500">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Adaptive AI Quiz</p>
                        <p className="text-[10px] text-gray-500">Test your mastery with AI</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Adaptive Quiz Modal Overlay */}
          {activeQuizTopic && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-2xl relative">
                <button
                  onClick={() => setActiveQuizTopic(null)}
                  className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-all flex items-center gap-2"
                >
                  <span className="font-bold">Close</span>
                  <X className="w-8 h-8" />
                </button>
                <AdaptiveQuizRenderer
                  courseId={(course as any)._id || course.id}
                  topicName={activeQuizTopic}
                />
              </div>
            </div>
          )}

          {/* Access Denied Message */}
          {!paymentLoading && !hasAccess && course.price > 0 && (
            <div className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-200 rounded-3xl p-8 text-center border-2 border-cyan-300 shadow-xl">
              <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-cyan-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Course Locked</h3>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Purchase this course to unlock all lessons and start learning!
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">All lessons and resources</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Certificate of completion</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Lifetime access</span>
                </div>
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6 flex items-center">
              Course Content ({lessons.length} lessons)
            </h3>

            <div className="space-y-4">
              {lessons.map((lesson: any, index: number) => {
                const lessonId = (lesson as any)._id || lesson.id;
                const prevLesson = index > 0 ? lessons[index - 1] : null;
                const prevLessonId = prevLesson ? ((prevLesson as any)._id || prevLesson.id) : null;
                const isLessonCompleted = lessonProgress[lessonId];
                const isFirstLesson = index === 0;
                const prevLessonCompleted = prevLessonId ? lessonProgress[prevLessonId] : false;

                // Access logic: user must have course access (paid or free) and meet lesson prerequisites
                const canAccess = hasAccess && (isFirstLesson || prevLessonCompleted);

                return (
                  <div
                    key={lesson.id}
                    onClick={() => canAccess && onLessonSelect(lesson)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${canAccess
                      ? 'cursor-pointer hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 border-gray-200 hover:border-cyan-300 hover:shadow-md'
                      : 'cursor-not-allowed opacity-60 border-gray-100'
                      } ${isLessonCompleted
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                        : 'bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50'
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-xl ${!hasAccess || (!isFirstLesson && !prevLessonCompleted)
                        ? 'bg-gray-100'
                        : isLessonCompleted
                          ? 'bg-emerald-100'
                          : 'bg-cyan-100'
                        }`}>
                        {!hasAccess || (!isFirstLesson && !prevLessonCompleted) ? (
                          <Lock className="w-5 h-5 text-gray-400" />
                        ) : isLessonCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Play className="w-5 h-5 text-cyan-600" />
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${isLessonCompleted ? 'text-emerald-700' : 'text-gray-800'
                          }`}>
                          {lesson.title}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assessment Button - Show if videos are completed OR progress is 100% */}
            {hasAccess && (completedLessons >= totalLessons || progress >= 100) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-cyber-grape/10 border border-cyber-grape/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 text-cyber-grape mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">All lessons completed!</span>
                  </div>
                  <p className="text-sm text-cyber-grape/80">
                    {isCompleted
                      ? `You've successfully completed this course with all videos watched and assessment passed. You can take the assessment again anytime.`
                      : hasAssessments
                        ? `You've watched all ${totalLessons} lessons. Click below to take the final assessment to complete the course and earn your certificate.`
                        : `You've watched all ${totalLessons} lessons. Click below to complete the course and earn your certificate.`
                    }
                  </p>
                  {hasAttemptedAssessment && !isCompleted && (
                    <p className="text-sm text-persimmon mt-2">
                      You need to pass the assessment to complete this course and unlock the review option.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    console.log('Starting assessment...', {
                      courseId: (course as any)._id || course.id,
                      progress,
                      completedLessons,
                      totalLessons
                    });
                    // Always start assessment after completing all videos
                    onAssessmentStart();
                    // Assessment completion will be handled via the callback
                  }}
                  className="w-full bg-cyber-grape hover:bg-cyber-grape-dark text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <Award className="w-5 h-5" />
                  <span>
                    {isCompleted
                      ? 'Retake Assessment'
                      : hasAttemptedAssessment
                        ? 'Retake Assessment'
                        : 'Take Assessment'
                    }
                  </span>
                </button>
              </div>
            )}

            {hasAccess && isCompleted && !shouldShowAssessment && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center text-caribbean-green">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Course Completed!</p>
                  <p className="text-sm text-caribbean-green/80 mt-1">Certificate earned</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Reviews Section */}
      <div className="mt-8">
        <ReviewSection
          key={reviewRefreshKey}
          courseId={(course as any)._id || course.id}
          courseTitle={course.title}
        />
      </div>

      {/* Learning Copilot Section - Only show if user has access */}
      {hasAccess && (
        <>
          {/* Learning Dashboard */}
          <div className="mt-8">
            <LearningDashboard courseId={(course as any)._id || course.id} />
          </div>

          {/* Enhanced Copilot Chat */}
          <div className="mt-8 mb-8">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">
                Your Learning Assistant
              </h3>
              <p className="text-gray-600 mb-6">
                Get personalized help, ask questions about the course content, and receive adaptive learning suggestions.
              </p>
              <CopilotChat
                courseId={(course as any)._id || course.id}
                userName={(user as any)?.firstName || 'Learner'}
              />
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        course={course}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default CourseDetail;
