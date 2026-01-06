import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CourseProvider, useCourses } from './contexts/CourseContext';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import CourseDetail from './components/CourseDetail';
import VideoPlayer from './components/VideoPlayer';
import Assessment from './components/Assessment';
import Certificate from './components/Certificate';
import CourseCompletion from './components/CourseCompletion';
import Recommendations from './components/Recommendations';
import AllCourses from './components/AllCourses';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import AdminCourses from './components/AdminCourses';
import Profile from './components/Profile.tsx';
import Settings from './components/Settings.tsx';
import AchievementsPage from './components/AchievementsPage';
import PaymentDebugger from './components/PaymentDebugger';
import CheckoutPage from './components/CheckoutPage';
import PeerLearning from './components/PeerLearning';
import CareerHub from './components/CareerHub';
import InteractiveAssessments from './components/InteractiveAssessments';
import AuthenticationFlow from './components/AuthenticationFlow';
import ChatBot from './components/ChatBot';
import CopilotPage from './components/CopilotPage';

// Course wrapper component to handle slug-to-course resolution
function CourseWrapper({ children }: { children: (course: any) => React.ReactNode }) {
  const { courseSlug } = useParams();
  const { courses } = useCourses();
  const [course, setCourse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const findCourse = async () => {
      setLoading(true);
      
      // First try to find in context courses by various IDs and slug patterns
      let foundCourse = courses.find(c => 
        c.id === courseSlug || 
        (c as any)._id === courseSlug ||
        c.title.toLowerCase().replace(/[^a-z0-9]/g, '-') === courseSlug
      );

      // If not found in context, try API
      if (!foundCourse && courseSlug) {
        try {
          const token = localStorage.getItem('authToken');
          const headers: any = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          // Try by courseSlug (could be MongoDB ObjectId or slug)
          let response = await fetch(`http://localhost:5001/api/courses/${courseSlug}`, {
            headers
          });

          // If that fails, try the slug endpoint
          if (!response.ok) {
            response = await fetch(`http://localhost:5001/api/courses/slug/${courseSlug}`, {
              headers
            });
          }

          if (response.ok) {
            foundCourse = await response.json();
          }
        } catch (error) {
          console.error('Error fetching course:', error);
        }
      }

      setCourse(foundCourse);
      setLoading(false);
    };

    findCourse();
  }, [courseSlug, courses]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-isabelline flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-gunmetal mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-4">The course you're looking for doesn't exist.</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children(course)}</>;
}


function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Helper function to generate course slug
  const getCourseSlug = (course: any) => {
    return (course._id || course.id) || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-isabelline dark:bg-gray-950">
      {user && <Navigation />}
      <main>
        <Routes>
          {/* Home route - accessible for both authenticated and non-authenticated users */}
          <Route path="/" element={
            <HomePage 
              onCourseSelect={(course) => {
                if (!user) {
                  // Store selected course for post-auth redirect
                  sessionStorage.setItem('selectedCourse', JSON.stringify(course));
                  const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  navigate(`/auth?redirect=/courses/${courseSlug}`);
                } else {
                  // For authenticated users, navigate directly to course
                  const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  navigate(`/courses/${courseSlug}`);
                }
              }}
            />
          } />
          <Route path="/auth" element={
            user ? <Navigate to="/dashboard" replace /> : <AuthenticationFlow />
          } />
          
          {/* Protected routes - require authentication */}
          {!user ? (
            <Route path="*" element={<Navigate to="/" replace />} />
          ) : (
            <>
              <Route path="/dashboard" element={
            <Dashboard
              onCourseSelect={(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                navigate(`/courses/${courseSlug}`);
              }}
              onViewCertificate={(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                navigate(`/courses/${courseSlug}/certificate`);
              }}
            />
          } />
          <Route path="/recommendations" element={
            <Recommendations
              onCourseSelect={(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                navigate(`/courses/${courseSlug}`);
              }}
            />
          } />
          <Route path="/all-courses" element={
            <AllCourses
              onCourseSelect={(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                navigate(`/courses/${courseSlug}`);
              }}
            />
          } />
          <Route path="/admin-courses" element={<AdminCourses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/checkout/:courseId" element={<CheckoutPage />} />
          <Route path="/peer-learning" element={<PeerLearning />} />
          <Route path="/career-hub" element={<CareerHub />} />
          <Route path="/assessments" element={<InteractiveAssessments courseId="all" />} />
          <Route path="/courses/:courseSlug" element={
            <CourseWrapper>
              {(course) => (
                <CourseDetail
                  course={course}
                  onLessonSelect={(lesson) => {
                    const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    navigate(`/courses/${courseSlug}/lessons/${lesson._id || lesson.id}`);
                  }}
                  onAssessmentStart={() => {
                    const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    console.log(`Navigating to assessment page for course: ${courseSlug}`);
                    // Use a small timeout to ensure all state updates have completed
                    setTimeout(() => {
                      navigate(`/courses/${courseSlug}/assessment`);
                    }, 100);
                  }}
                  onAssessmentComplete={(passed: boolean) => {
                    // Trigger course status refresh when assessment is completed
                    console.log('Assessment completed:', passed);
                    if (passed) {
                      // Set completion flag and trigger navigation back to course
                      sessionStorage.setItem('assessmentJustCompleted', 'true');
                      sessionStorage.setItem('forceRefreshCourse', 'true');
                      // Navigate back to course page to show completion
                      const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                      navigate(`/courses/${courseSlug}`);
                    }
                  }}
                  onBack={() => navigate('/dashboard')}
                />
              )}
            </CourseWrapper>
          } />
          <Route path="/courses/:courseSlug/lessons/:lessonId" element={
            <CourseWrapper>
              {(course) => {
                const { lessonId } = useParams();
                const lesson = course.lessons?.find((l: any) => l._id === lessonId || l.id === lessonId);
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                return (
                  <VideoPlayer
                    lesson={lesson}
                    course={course}
                    onComplete={() => navigate(`/courses/${courseSlug}`)}
                    onBack={() => navigate(`/courses/${courseSlug}`)}
                  />
                );
              }}
            </CourseWrapper>
          } />
          <Route path="/courses/:courseSlug/assessment" element={
            <CourseWrapper>
              {(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                return (
                  <Assessment
                    course={course}
                    onComplete={async (passed) => {
                      if (passed) {
                        navigate(`/courses/${courseSlug}/certificate`);
                      } else {
                        navigate(`/courses/${courseSlug}`);
                      }
                    }}
                    onBack={() => navigate(`/courses/${courseSlug}`)}
                  />
                );
              }}
            </CourseWrapper>
          } />
          <Route path="/courses/:courseSlug/complete" element={
            <CourseWrapper>
              {(course) => {
                const courseSlug = course.id || course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                return (
                  <CourseCompletion
                    course={course}
                    onBack={() => navigate(`/courses/${courseSlug}`)}
                  />
                );
              }}
            </CourseWrapper>
          } />
          <Route path="/courses/:courseSlug/certificate" element={
            <CourseWrapper>
              {(course) => (
                <Certificate
                  course={course}
                  onBack={() => navigate('/dashboard')}
                />
              )}
            </CourseWrapper>
          } />
            </>
          )}
        </Routes>
      </main>
      {/* ChatBot - available on all pages */}
      <ChatBot />
    </div>
  );
}


function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <Router>
          <AppContent />
        </Router>
      </CourseProvider>
    </AuthProvider>
  );
}

export default App;
