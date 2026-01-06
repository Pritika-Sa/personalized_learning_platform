import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCourses, Course } from '../contexts/CourseContext';
import { BookOpen, Clock, Award, TrendingUp, Search, Filter, Play, CheckCircle, Star, ArrowRight, CreditCard, Brain, Target, Zap, Users, Trophy, Sparkles, Activity, BarChart3, PieChart, Calendar, Medal, Gift, ChevronRight, BookmarkCheck } from 'lucide-react';
import UniqueFeatureNav from './UniqueFeatureNav';
import paymentService from '../services/paymentService';

interface DashboardProps {
  onCourseSelect?: (course: Course) => void;
  onViewCertificate?: (course: Course) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCourseSelect, onViewCertificate }) => {
  const { user } = useAuth();
  const { courses, getCourseProgress, isCourseCompleted } = useCourses();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<{ [courseId: string]: any }>({});

  // Helper function to display rating properly
  const formatRating = (rating: any) => {
    if (!rating || (typeof rating === 'object' && rating.count === 0)) {
      return 'No ratings yet';
    }
    if (typeof rating === 'object' && rating.average) {
      return `${rating.average}/5 (${rating.count})`;
    }
    return typeof rating === 'number' ? `${rating}/5` : 'No ratings yet';
  };

  // Filter courses based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter((course: Course) =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.skills.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  // Load payment statuses for all courses
  useEffect(() => {
    const loadPaymentStatuses = async () => {
      if (!user || courses.length === 0) return;

      const statuses: { [courseId: string]: any } = {};
      
      for (const course of courses) {
        const courseId = (course as any)._id || course.id;
        try {
          const status = await paymentService.getPaymentStatus(courseId);
          statuses[courseId] = status;
        } catch (error) {
          console.error(`Error loading payment status for course ${courseId}:`, error);
          // Default to free course status on error
          statuses[courseId] = { isFree: true, hasPaid: false, canAccess: true };
        }
      }
      
      setPaymentStatuses(statuses);
    };

    loadPaymentStatuses();
  }, [user, courses]);

  // Get courses with actual progress data and payment status
  const getCoursesWithProgress = () => {
    if (!user) return { inProgress: [], completed: [], recommended: [], purchased: [], free: [] };

    const userId = (user as any).id || (user as any)._id;
    
    const coursesWithProgress = courses.map(course => {
      const courseId = (course as any)._id || course.id;
      const progress = getCourseProgress(courseId, userId);
      const completed = isCourseCompleted(courseId, userId);
      const paymentStatus = paymentStatuses[courseId];
      
      return {
        ...course,
        progress,
        completed,
        courseId,
        paymentStatus
      };
    });

    const inProgress = coursesWithProgress.filter(course => 
      course.progress > 0 && course.progress < 100 && !course.completed
    );

    const completed = coursesWithProgress.filter(course => 
      course.completed || course.progress === 100
    );

    const recommended = coursesWithProgress.filter(course => 
      course.progress === 0 && !course.completed
    ).slice(0, 6);

    // Separate paid courses from free courses
    const purchased = coursesWithProgress.filter(course => 
      course.paymentStatus?.hasPaid && !course.paymentStatus?.isFree
    );

    const free = coursesWithProgress.filter(course => 
      course.paymentStatus?.isFree || (course.price === 0)
    );

    return { inProgress, completed, recommended, purchased, free };
  };

  // Check MongoDB completion status for all courses
  useEffect(() => {
    const checkMongoDBStatus = async () => {
      if (!user) return;
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        // Check completion status for each course
        for (const course of courses) {
          const courseId = (course as any)._id || course.id;
          try {
            const response = await fetch(`http://localhost:5001/api/courses/${courseId}/status`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const status = await response.json();
              console.log(`Course ${courseId} MongoDB status:`, status);
            }
          } catch (error) {
            console.error(`Error checking status for course ${courseId}:`, error);
          }
        }
      } catch (error) {
        console.error('Error checking MongoDB status:', error);
      }
    };

    checkMongoDBStatus();
  }, [courses, user]);

  const { inProgress, completed, recommended, purchased } = getCoursesWithProgress();

  if (!user) {
    return (
      <div className="min-h-screen bg-isabelline flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-gunmetal mb-4">Please log in to view your dashboard</h2>
          <p className="text-dark-gunmetal/70">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  const handleCourseClick = (course: Course) => {
    if (onCourseSelect) {
      onCourseSelect(course);
    }
  };

  const handleViewCertificate = (course: Course) => {
    if (onViewCertificate) {
      onViewCertificate(course);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'in-progress', label: 'In Progress', icon: Clock, count: inProgress.length },
    { id: 'completed', label: 'Completed', icon: CheckCircle, count: completed.length },
    { id: 'purchased', label: 'Purchased', icon: CreditCard, count: purchased.length },
    { id: 'recommended', label: 'Recommended', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-900 dark:via-purple-900 dark:to-cyan-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-overlay animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300/10 rounded-full mix-blend-overlay animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-300/5 rounded-full mix-blend-overlay animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8">
            <div className="flex items-center space-x-6 mb-6 lg:mb-0">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
                  <span className="text-white font-bold text-2xl">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-2xl blur opacity-30 animate-pulse"></div>
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white">
                    Welcome back, {user.firstName}!
                  </h1>
                  <div className="animate-bounce">
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                  </div>
                </div>
                <p className="text-indigo-100 text-lg">
                  {new Date().getHours() < 12 ? 'Ready to start your morning learning journey?' : 
                   new Date().getHours() < 18 ? 'Perfect time to expand your skills!' : 
                   'Evening learning session awaits!'}
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    <span className="text-sm text-indigo-100">Learning Streak: 7 days</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-300" />
                    <span className="text-sm text-indigo-100">{completed.length} Completed</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-indigo-200 text-sm capitalize flex items-center justify-end space-x-2">
                    <Medal className="w-4 h-4" />
                    <span>{user.role || 'Student'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Powered Learning Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Skills Portfolio */}
            <div className="group relative bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:border-white/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">Skills Mastery</h3>
                  <div className="w-10 h-10 bg-cyan-400/20 rounded-xl flex items-center justify-center group-hover:bg-cyan-400/30 transition-colors">
                    <Brain className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.slice(0, 2).map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-cyan-400/20 text-cyan-100 text-xs rounded-full font-medium border border-cyan-400/30">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-cyan-200 text-sm">Build your skill portfolio</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-cyan-200 text-sm">Progress</span>
                  <span className="text-white font-semibold">{user.skills?.length || 0}/10</span>
                </div>
                <div className="w-full bg-cyan-900/30 rounded-full h-2 mt-2">
                  <div className="bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min((user.skills?.length || 0) * 10, 100)}%`}}></div>
                </div>
              </div>
            </div>
            
            {/* Learning Focus */}
            <div className="group relative bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:border-white/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-green-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">Learning Focus</h3>
                  <div className="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-400/30 transition-colors">
                    <Target className="w-5 h-5 text-emerald-300" />
                  </div>
                </div>
                <p className="text-emerald-100 text-sm mb-4 line-clamp-2">
                  {user.interests || 'AI will analyze your learning patterns'}
                </p>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-200 text-xs">Active Learning Mode</span>
                </div>
              </div>
            </div>
            
            {/* Career Vision */}
            <div className="group relative bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:border-white/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">Career Vision</h3>
                  <div className="w-10 h-10 bg-violet-400/20 rounded-xl flex items-center justify-center group-hover:bg-violet-400/30 transition-colors">
                    <Zap className="w-5 h-5 text-violet-300" />
                  </div>
                </div>
                <p className="text-violet-100 text-sm mb-4 line-clamp-2">
                  {user.careerObjective || 'Define your future aspirations'}
                </p>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-violet-300" />
                  <span className="text-violet-200 text-xs">Growth Trajectory</span>
                </div>
              </div>
            </div>

            {/* Learning Statistics */}
            <div className="group relative bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:border-white/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">Statistics</h3>
                  <div className="w-10 h-10 bg-orange-400/20 rounded-xl flex items-center justify-center group-hover:bg-orange-400/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-orange-300" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-200 text-sm">Completed</span>
                    <span className="text-white font-bold">{completed.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-200 text-sm">In Progress</span>
                    <span className="text-white font-bold">{inProgress.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-200 text-sm">Certificates</span>
                    <span className="text-white font-bold">{completed.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with AI-Enhanced Interface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Intelligent Search & Quick Actions */}
        <div className="mb-12">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400 w-6 h-6" />
                  <input
                    type="text"
                    placeholder="Search with AI intelligence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-700/50 text-gray-900 dark:text-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium transition-all duration-300"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button className="group relative px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <Filter className="w-5 h-5" />
                    <span className="font-semibold">Smart Filter</span>
                  </div>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <button className="group relative px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">AI Recommend</span>
                  </div>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="mb-12">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-2 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`py-1 px-3 rounded-full text-xs font-bold ${
                        activeTab === tab.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Advanced Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-12">
              {/* AI-Enhanced Unique Features */}
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-sm rounded-3xl p-8 border border-indigo-200/50 dark:border-indigo-700/50">
                <UniqueFeatureNav />
              </div>
              
              {/* Interactive Progress Dashboard */}
              <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Learning Analytics Dashboard
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-6 h-6 text-indigo-500 animate-pulse" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Real-time insights</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {inProgress.length}
                        </div>
                        <div className="text-xs text-blue-500 dark:text-blue-400 uppercase tracking-wide font-semibold">Active</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">In Progress</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min((inProgress.length / (inProgress.length + completed.length)) * 100, 100)}%`}}></div>
                      </div>
                      <PieChart className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="group relative bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-6 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {completed.length}
                        </div>
                        <div className="text-xs text-emerald-500 dark:text-emerald-400 uppercase tracking-wide font-semibold">Done</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Completed</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min((completed.length / Math.max(inProgress.length + completed.length, 1)) * 100, 100)}%`}}></div>
                      </div>
                      <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="group relative bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {recommended.length}
                        </div>
                        <div className="text-xs text-purple-500 dark:text-purple-400 uppercase tracking-wide font-semibold">AI Picks</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">AI Recommended</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full transition-all duration-500 animate-pulse" style={{width: '85%'}}></div>
                      </div>
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    </div>
                  </div>
                  
                  <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200/50 dark:border-orange-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                          {completed.length}
                        </div>
                        <div className="text-xs text-orange-500 dark:text-orange-400 uppercase tracking-wide font-semibold">Earned</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Certificates</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min(completed.length * 25, 100)}%`}}></div>
                      </div>
                      <Gift className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Learning - Enhanced 3D Course Cards */}
              {inProgress.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Continue Your Journey
                    </h3>
                    <div className="flex items-center space-x-2 text-indigo-500">
                      <Zap className="w-5 h-5" />
                      <span className="text-sm font-medium">Keep momentum</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {inProgress.slice(0, 2).map((course: any) => (
                      <div key={course.courseId} className="group relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer transform-gpu" onClick={() => handleCourseClick(course)}>
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Course Header */}
                        <div className="relative flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-bold rounded-full border border-indigo-200/50 dark:border-indigo-700/50">
                                  {course.level}
                                </span>
                                {course.paymentStatus?.hasPaid && !course.paymentStatus?.isFree && (
                                  <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-700 dark:text-green-300 text-xs font-bold rounded-full border border-green-200/50 dark:border-green-700/50 flex items-center space-x-1">
                                    <CreditCard className="w-3 h-3" />
                                    <span>Premium</span>
                                  </span>
                                )}
                                {course.paymentStatus?.isFree && (
                                  <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200/50 dark:border-blue-700/50 flex items-center space-x-1">
                                    <Gift className="w-3 h-3" />
                                    <span>Free</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">{course.duration}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex flex-col items-center justify-center border border-cyan-200/50 dark:border-cyan-700/50">
                              <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{course.progress}%</span>
                              <span className="text-xs text-cyan-500 dark:text-cyan-400 font-medium">Done</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Course Content */}
                        <div className="relative mb-6">
                          <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">{course.description}</p>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        <div className="relative mb-6">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Learning Progress</span>
                            <div className="flex items-center space-x-2">
                              <Activity className="w-4 h-4 text-indigo-500" />
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{course.progress}% Complete</span>
                            </div>
                          </div>
                          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"></div>
                            <div
                              className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 h-3 rounded-full transition-all duration-1000 shadow-lg"
                              style={{ width: `${course.progress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Course Actions */}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Star className="w-5 h-5 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatRating(course.rating)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">1.2k students</span>
                            </div>
                          </div>
                          <button className="group/btn relative px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu">
                            <div className="flex items-center space-x-3">
                              <Play className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              <span className="font-semibold">Continue Learning</span>
                              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI-Powered Recommended Courses */}
              {recommended.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        AI Recommendations
                      </h3>
                      <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full border border-emerald-200/50 dark:border-emerald-700/50">
                        <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Personalized for You</span>
                      </div>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold">Refresh AI</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {recommended.slice(0, 3).map((course: Course, index) => (
                      <div key={course.id} className="group relative bg-gradient-to-br from-white to-cyan-50/50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-cyan-900/20 backdrop-blur-xl rounded-3xl p-8 border border-cyan-100/50 dark:border-cyan-800/30 hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer transform-gpu hover:border-cyan-300" onClick={() => handleCourseClick(course)}>
                        {/* AI Match Badge */}
                        <div className="absolute -top-4 -right-4 z-10">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center space-x-2">
                            <Brain className="w-4 h-4" />
                            <span>{95 - index * 5}% Match</span>
                          </div>
                        </div>

                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Course Thumbnail */}
                        <div className="relative mb-6 rounded-2xl overflow-hidden">
                          <img
                            src={course.thumbnail || 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200'}
                            alt={course.title}
                            className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          <div className="absolute top-4 left-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold backdrop-blur-lg border-2 shadow-lg ${
                              course.level === 'Beginner' 
                                ? 'bg-emerald-100/95 text-emerald-700 border-emerald-300' :
                              course.level === 'Intermediate' 
                                ? 'bg-amber-100/95 text-amber-700 border-amber-300' :
                                'bg-rose-100/95 text-rose-700 border-rose-300'
                            }`}>
                              {course.level}
                            </span>
                          </div>
                          <div className="absolute top-4 right-4 flex items-center space-x-2 text-white/80">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium backdrop-blur-sm bg-black/20 px-2 py-1 rounded-lg">{course.duration}</span>
                          </div>
                        </div>
                        
                        {/* Course Content */}
                        <div className="relative mb-6">
                          <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:bg-clip-text transition-all duration-300 line-clamp-2">{course.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4">{course.description}</p>
                          
                          {/* Skills Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {course.skills.slice(0, 3).map((skill, skillIndex) => (
                              <span 
                                key={skillIndex} 
                                className={`px-3 py-1 text-xs font-semibold rounded-2xl transition-all duration-300 group-hover:scale-105 ${
                                  skillIndex === 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' :
                                  skillIndex === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                                  'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                }`}
                              >
                                {skill}
                              </span>
                            ))}
                            {course.skills.length > 3 && (
                              <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-2xl">
                                +{course.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Course Footer */}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < Math.floor(course.rating?.average || 4.2) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                              ))}
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 ml-2">
                                {course.rating?.average ? `(${course.rating.count})` : '(5)'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-cyan-500" />
                              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Hot</span>
                            </div>
                          </div>
                          <button className="group/btn relative px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu">
                            <div className="flex items-center space-x-2">
                              <Zap className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              <span className="font-bold">Start Now</span>
                            </div>
                            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced In Progress Tab */}
          {activeTab === 'in-progress' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Active Learning Sessions
                  </h3>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full border border-blue-200/50 dark:border-blue-700/50">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{inProgress.length} Active</span>
                  </div>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">Schedule Study</span>
                </button>
              </div>
              
              {inProgress.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {inProgress.map((course: any) => (
                    <div key={course.courseId} className="group relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer transform-gpu" onClick={() => handleCourseClick(course)}>
                      {/* Progress Ring Badge */}
                      <div className="absolute -top-4 -right-4 z-10">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                            <circle 
                              cx="32" 
                              cy="32" 
                              r="28" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="4" 
                              strokeLinecap="round"
                              className="text-blue-500 transition-all duration-1000"
                              strokeDasharray={`${course.progress * 1.76} 176`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{course.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Course Header */}
                      <div className="relative flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-full border border-blue-200/50 dark:border-blue-700/50">
                                {course.level}
                              </span>
                              <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">{course.duration}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">Active Session</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Course Content */}
                      <div className="relative mb-6">
                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{course.title}</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">{course.description}</p>
                        
                        {/* Enhanced Progress Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Learning Progress</span>
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{course.progress}% Complete</span>
                            </div>
                          </div>
                          <div className="relative w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000 shadow-lg"
                              style={{ width: `${course.progress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-2">
                            <span>Started</span>
                            <span>Next milestone at {Math.ceil(course.progress / 25) * 25}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Course Actions */}
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Star className="w-5 h-5 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatRating(course.rating)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Active learners</span>
                          </div>
                        </div>
                        <button className="group/btn relative px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu">
                          <div className="flex items-center space-x-3">
                            <Play className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            <span className="font-semibold">Continue Learning</span>
                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </div>
                          <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-12 border border-blue-200/50 dark:border-blue-700/50 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">No Active Learning Sessions</h4>
                  <p className="text-blue-600 dark:text-blue-300 mb-6 max-w-md mx-auto">Start your learning journey today! Browse our AI-curated courses and begin building your skills.</p>
                  <button 
                    onClick={() => setActiveTab('recommended')}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105 font-semibold"
                  >
                    Explore Courses
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            <div>
              <h3 className="text-xl font-semibold text-dark-gunmetal dark:text-white mb-4">Completed Courses</h3>
              {completed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completed.map((course: any) => (
                    <div key={course.courseId} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-caribbean-green">{course.level}</span>
                        <div className="flex items-center space-x-2 text-caribbean-green">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-dark-gunmetal dark:text-white mb-2">{course.title}</h4>
                      <p className="text-sm text-dark-gunmetal/70 dark:text-gray-300 mb-4">{course.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-persimmon fill-current" />
                          <span className="text-sm text-dark-gunmetal/70 dark:text-gray-300">{formatRating(course.rating)}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCertificate(course);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-caribbean-green hover:bg-caribbean-green-dark text-white rounded-lg transition-colors"
                        >
                          <Award className="w-4 h-4" />
                          <span>View Certificate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-dark-gunmetal/70 dark:text-gray-300 mb-4">No completed courses yet. Keep learning to earn certificates!</p>
                  <button 
                    onClick={() => setActiveTab('in-progress')}
                    className="px-4 py-2 bg-cyber-grape hover:bg-cyber-grape-dark text-white rounded-lg transition-colors"
                  >
                    Continue Learning
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Purchased Tab */}
          {activeTab === 'purchased' && (
            <div>
              {purchased.length > 0 ? (
                <>
                  <h3 className="text-xl font-semibold text-dark-gunmetal dark:text-white mb-4">
                    Your Purchased Courses ({purchased.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchased.map((course: any) => (
                      <div key={course.courseId} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCourseClick(course)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-cyber-grape">{course.level}</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Purchased
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-dark-gunmetal dark:text-white">
                              {course.price}
                            </div>
                            <div className="text-xs text-green-600">Paid</div>
                          </div>
                        </div>
                        <h4 className="font-semibold text-dark-gunmetal dark:text-white mb-2">{course.title}</h4>
                        <p className="text-sm text-dark-gunmetal/70 dark:text-gray-300 mb-4">{course.description}</p>
                        
                        {/* Progress Bar for purchased courses */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-dark-gunmetal/70 dark:text-gray-300 mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                            <div
                              className="bg-caribbean-green h-2 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-persimmon fill-current" />
                            <span className="text-sm text-dark-gunmetal/70 dark:text-gray-300">{formatRating(course.rating)}</span>
                          </div>
                          <button className="flex items-center space-x-2 px-4 py-2 bg-cyber-grape hover:bg-cyber-grape-dark text-white rounded-lg transition-colors">
                            {course.progress > 0 ? (
                              <>
                                <Play className="w-4 h-4" />
                                <span>Continue</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                <span>Start</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-dark-gunmetal dark:text-white mb-2">No Purchased Courses</h3>
                  <p className="text-dark-gunmetal/70 dark:text-gray-300 mb-4">
                    You haven't purchased any courses yet. Browse our catalog to find courses that interest you.
                  </p>
                  <button
                    onClick={() => setActiveTab('recommended')}
                    className="px-6 py-2 bg-cyber-grape hover:bg-cyber-grape-dark text-white rounded-lg transition-colors"
                  >
                    Browse Courses
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recommended Tab */}
          {activeTab === 'recommended' && (
            <div>
              <h3 className="text-xl font-semibold text-dark-gunmetal dark:text-white mb-4">Recommended Courses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredCourses.slice(0, 6).map((course: Course) => (
                  <div key={course.id} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCourseClick(course)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-cyber-grape">{course.level}</span>
                      <span className="text-sm text-dark-gunmetal/70 dark:text-gray-300">{course.duration}</span>
                    </div>
                    <h4 className="font-semibold text-dark-gunmetal dark:text-white mb-2">{course.title}</h4>
                    <p className="text-sm text-dark-gunmetal/70 dark:text-gray-300 mb-4">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-persimmon fill-current" />
                        <span className="text-sm text-dark-gunmetal/70 dark:text-gray-300">{formatRating(course.rating)}</span>
                      </div>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-caribbean-green hover:bg-caribbean-green-dark text-white rounded-lg transition-colors">
                        <ArrowRight className="w-4 h-4" />
                        <span>Start Learning</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
