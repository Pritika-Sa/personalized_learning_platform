import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, uploadsApi } from '../services/apiService';
import { Plus, Trash2, Save, XCircle, FileText, Award, Users, BookOpen, TrendingUp, DollarSign, BarChart3, Settings, Home, PlusCircle, Edit, Search, ArrowUpRight, Clock, LogOut, User, Crown } from 'lucide-react';
import MaterialUpload from './MaterialUpload';

const levels = ['Beginner', 'Intermediate', 'Advanced'];

const AdminCourses: React.FC = () => {
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterPublished, setFilterPublished] = useState('all');
  const [form, setForm] = useState<any>({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    price: 0,
    thumbnail: '',
    tags: '',
    isPublished: false,
    instructorName: '',
    videos: [] as Array<{ title: string; url: string; duration: number; thumbnail: string; }>,
    assessmentMode: 'handmade' as 'handmade' | 'auto',
    assessments: [] as Array<{
      title: string;
      description: string;
      questions: Array<{
        question: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
      }>;
      passingScore: number;
    }>,

  });

  const token = useMemo(() => localStorage.getItem('authToken') || '', []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await coursesApi.list();
        setCourses(list || []);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded">Access denied. Admin or Instructor required.</div>
      </div>
    );
  }

  // Basic handler for Edit button
  function handleEditCourse(course: any) {
    setEditingCourse(course);
    setEditForm({ ...course });
  }

  function handleEditFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setEditForm((prev: any) => ({ ...prev, [name]: val }));
  }

  async function handleEditFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    try {
      const updated = await coursesApi.update(editingCourse._id, editForm, token);
      setCourses(courses.map((c) => c._id === updated._id ? updated : c));
      setEditingCourse(null);
      alert('Course updated');
    } catch (err) {
      alert('Failed to update course');
    } finally {
      setEditLoading(false);
    }
  }

  function handleEditModalClose() {
    setEditingCourse(null);
  }

  // Basic handler for Delete button
  async function handleDeleteCourse(courseId: string) {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      setLoading(true);
      await coursesApi.delete(courseId, token);
      setCourses(courses.filter(c => c._id !== courseId));
      alert('Course deleted');
    } catch (err) {
      alert('Failed to delete course');
    } finally {
      setLoading(false);
    }
  }

  const addVideo = () => {
    setForm({
      ...form,
      videos: [...form.videos, { title: '', url: '', duration: 0, thumbnail: '' }]
    });
  };

  const removeVideo = (idx: number) => {
    setForm({ ...form, videos: form.videos.filter((_: any, i: number) => i !== idx) });
  };

  const moveVideo = (idx: number, dir: -1 | 1) => {
    const arr = [...form.videos];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
    setForm({ ...form, videos: arr });
  };

  // Assessment management functions
  const addAssessment = () => {
    setForm({
      ...form,
      assessments: [...form.assessments, {
        title: '',
        description: '',
        questions: [],
        passingScore: 70
      }]
    });
  };

  const removeAssessment = (idx: number) => {
    setForm({ ...form, assessments: form.assessments.filter((_: any, i: number) => i !== idx) });
  };

  const addQuestion = (assessmentIdx: number) => {
    const newAssessments = [...form.assessments];
    newAssessments[assessmentIdx].questions.push({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    });
    setForm({ ...form, assessments: newAssessments });
  };

  const removeQuestion = (assessmentIdx: number, questionIdx: number) => {
    const newAssessments = [...form.assessments];
    newAssessments[assessmentIdx].questions.splice(questionIdx, 1);
    setForm({ ...form, assessments: newAssessments });
  };

  const updateQuestion = (assessmentIdx: number, questionIdx: number, field: string, value: any) => {
    const newAssessments = [...form.assessments];
    newAssessments[assessmentIdx].questions[questionIdx][field] = value;
    setForm({ ...form, assessments: newAssessments });
  };

  const updateAssessment = (idx: number, field: string, value: any) => {
    const newAssessments = [...form.assessments];
    newAssessments[idx][field] = value;
    setForm({ ...form, assessments: newAssessments });
  };

  const createCourse = async () => {
    if (!form.title || !form.description || !form.category) {
      alert('Please fill in title, description, and category');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        level: form.level.toLowerCase(),
        price: form.price || 0,
        duration: Math.max(1, form.videos.reduce((s: number, v: any) => s + (Number(v.duration) || 0), 0)),
        thumbnail: form.thumbnail,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        isPublished: !!form.isPublished,
        instructorName: form.instructorName,
        videos: form.videos.map((v: any, i: number) => ({
          title: v.title,
          description: v.title,
          url: v.url,
          duration: Number(v.duration) || 0,
          thumbnail: v.thumbnail,
          order: i + 1
        })),
        assessmentMode: form.assessmentMode,

        assessments: form.assessmentMode === 'handmade' ? form.assessments.map((assessment: any) => ({
          title: assessment.title,
          description: assessment.description,
          questions: assessment.questions.map((q: any) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          })),
          passingScore: assessment.passingScore
        })) : []
      };

      console.log('Creating course with payload:', payload);
      const created = await coursesApi.create(payload, token);
      setCourses([created, ...courses]);
      setForm({
        title: '',
        description: '',
        category: '',
        level: 'Beginner',
        price: 0,
        thumbnail: '',
        tags: '',
        isPublished: false,
        instructorName: '',
        videos: [],
        assessmentMode: 'handmade',
        assessments: [],

      });
      alert('Course created successfully!');
    } catch (e) {
      console.error('Course creation error:', e);
      let errorMessage = 'Failed to create course';

      if (e instanceof Error && e.message) {
        errorMessage = e.message;
      } else if (typeof e === 'object' && e !== null && 'errors' in e && Array.isArray((e as any).errors)) {
        errorMessage = ((e as any).errors as string[]).join(', ');
      }

      alert(`Error: ${errorMessage}`);
    } finally { setLoading(false); }
  };

  const togglePublish = async (courseId: string, isPublished: boolean) => {
    try {
      const updated = await coursesApi.publish(courseId, !isPublished, token);
      setCourses(courses.map(c => c._id === courseId ? updated : c));
    } catch (e) { alert('Failed to update publish state'); }
  };

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || course.level === filterLevel;
    const matchesPublished = filterPublished === 'all' ||
      (filterPublished === 'published' && course.isPublished) ||
      (filterPublished === 'draft' && !course.isPublished);
    return matchesSearch && matchesLevel && matchesPublished;
  });

  // Calculate stats
  const stats = {
    totalCourses: courses.length,
    publishedCourses: courses.filter(c => c.isPublished).length,
    draftCourses: courses.filter(c => !c.isPublished).length,
    totalVideos: courses.reduce((acc, c) => acc + (c.videos?.length || 0), 0),
    totalStudents: courses.reduce((acc, c) => acc + (c.students || 0), 0),
    totalRevenue: courses.reduce((acc, c) => acc + ((c.price || 0) * (c.students || 0)), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your courses and content</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="font-medium">New Course</span>
              </button>

              {/* User Profile Section */}
              {user ? (
                <div className="flex items-center space-x-3">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        {user.role === 'admin' ? (
                          <Crown className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {user.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      window.location.href = '/';
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all duration-200 border border-red-200/50 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>{stats.publishedCourses} published</span>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Growing</span>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Videos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalVideos}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <Clock className="w-4 h-4 mr-1" />
              <span>Content library</span>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Total earnings</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-8">
          <nav className="flex space-x-2">
            {[
              { id: 'overview', label: 'Course Overview', icon: Home },
              { id: 'create', label: 'Create Course', icon: PlusCircle },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Levels</option>
                    {levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <select
                    value={filterPublished}
                    onChange={(e) => setFilterPublished(e.target.value)}
                    className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            {loading ? (
              <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading courses...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <div key={course._id} className="group bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{course.category}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${course.isPublished
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Videos</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{course.videos?.length || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assessments</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{course.assessments?.length || 0}</p>
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${course.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                          course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          }`}>
                          {course.level}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{course.students || 0}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {course.price === 0 ? 'Free' : `₹${course.price}`}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePublish(course._id, course.isPublished)}
                        className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${course.isPublished
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70'
                          }`}
                      >
                        {course.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70 rounded-xl font-medium text-sm transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course._id)}
                        className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 rounded-xl font-medium text-sm transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Course</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Fill in the details to create a comprehensive course</p>
            </div>

            <div className="p-6">
              {/* Basic Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Course Title *</label>
                    <input
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter an engaging course title"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Category *</label>
                    <input
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Programming, Design, Business"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Difficulty Level</label>
                    <select
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={form.level}
                      onChange={e => setForm({ ...form, level: e.target.value })}
                    >
                      {levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Price (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="0 for free course"
                      value={form.price}
                      min="0"
                      onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enter 0 to make the course free</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Thumbnail URL</label>
                    <input
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com/thumbnail.jpg"
                      value={form.thumbnail}
                      onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Instructor Name</label>
                    <input
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter instructor name"
                      value={form.instructorName}
                      onChange={e => setForm({ ...form, instructorName: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Tags</label>
                    <input
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="javascript, react, frontend (comma separated)"
                      value={form.tags}
                      onChange={e => setForm({ ...form, tags: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Course Description *</label>
                    <textarea
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                      placeholder="Provide a detailed description of what students will learn in this course..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Videos Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-500" />
                  Course Videos
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Add video content for your course</p>
                  <button
                    onClick={addVideo}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Video</span>
                  </button>
                </div>
                {form.videos.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No videos added yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Video" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.videos.map((v: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Video {idx + 1}</h4>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => moveVideo(idx, -1)}
                              disabled={idx === 0}
                              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveVideo(idx, 1)}
                              disabled={idx === form.videos.length - 1}
                              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeVideo(idx)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Title</label>
                            <input
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Enter video title"
                              value={v.title}
                              onChange={e => { const arr = [...form.videos]; arr[idx].title = e.target.value; setForm({ ...form, videos: arr }); }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (seconds)</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g., 300"
                              value={v.duration}
                              onChange={e => { const arr = [...form.videos]; arr[idx].duration = Number(e.target.value); setForm({ ...form, videos: arr }); }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video URL</label>
                            <input
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="https://example.com/video.mp4"
                              value={v.url}
                              onChange={e => { const arr = [...form.videos]; arr[idx].url = e.target.value; setForm({ ...form, videos: arr }); }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail URL</label>
                            <input
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="https://example.com/thumb.jpg"
                              value={v.thumbnail}
                              onChange={e => { const arr = [...form.videos]; arr[idx].thumbnail = e.target.value; setForm({ ...form, videos: arr }); }}
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Video File</label>
                          <input
                            type="file"
                            accept="video/*"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const res = await uploadsApi.uploadVideo(file, token);
                                const arr = [...form.videos];
                                arr[idx].url = res.url;
                                setForm({ ...form, videos: arr });
                                alert('Video uploaded successfully!');
                              } catch {
                                alert('Upload failed. Please try again.');
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assessments Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-green-500" />
                  Course Assessments
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create assessments to test student knowledge</p>
                  <button
                    onClick={addAssessment}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Assessment</span>
                  </button>
                </div>
                <div className="mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Assessment Mode</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="assessmentMode"
                          checked={form.assessmentMode === 'handmade'}
                          onChange={() => setForm({ ...form, assessmentMode: 'handmade' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Manual Creation</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Create custom questions manually</p>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="assessmentMode"
                          checked={form.assessmentMode === 'auto'}
                          onChange={() => setForm({ ...form, assessmentMode: 'auto' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Auto-Generate</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300">AI will generate questions from course content</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                {form.assessmentMode === 'handmade' && (
                  form.assessments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <Award className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No assessments created yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Assessment" to create your first assessment</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {form.assessments.map((assessment: any, assessmentIdx: number) => (
                        <div key={assessmentIdx} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Assessment {assessmentIdx + 1}</h4>
                            <button
                              onClick={() => removeAssessment(assessmentIdx)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assessment Title</label>
                              <input
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., Chapter 1 Quiz"
                                value={assessment.title}
                                onChange={(e) => updateAssessment(assessmentIdx, 'title', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Passing Score (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="70"
                                value={assessment.passingScore}
                                onChange={(e) => updateAssessment(assessmentIdx, 'passingScore', Number(e.target.value))}
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assessment Description</label>
                              <textarea
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                rows={3}
                                placeholder="Describe what this assessment covers..."
                                value={assessment.description}
                                onChange={(e) => updateAssessment(assessmentIdx, 'description', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Questions Section */}
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-semibold text-gray-900 dark:text-white">Questions ({assessment.questions.length})</h5>
                              <button
                                onClick={() => addQuestion(assessmentIdx)}
                                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Question</span>
                              </button>
                            </div>

                            {assessment.questions.length === 0 ? (
                              <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No questions added yet</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {assessment.questions.map((question: any, questionIdx: number) => (
                                  <div key={questionIdx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Question {questionIdx + 1}</span>
                                      <button
                                        onClick={() => removeQuestion(assessmentIdx, questionIdx)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      >
                                        Remove
                                      </button>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question</label>
                                        <textarea
                                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                          rows={2}
                                          placeholder="Enter your question here..."
                                          value={question.question}
                                          onChange={(e) => updateQuestion(assessmentIdx, questionIdx, 'question', e.target.value)}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Answer Options</label>
                                        <div className="space-y-2">
                                          {question.options.map((option: string, optionIdx: number) => (
                                            <div key={optionIdx} className="flex items-center space-x-3">
                                              <input
                                                type="radio"
                                                name={`correct-${assessmentIdx}-${questionIdx}`}
                                                checked={question.correctAnswer === optionIdx}
                                                onChange={() => updateQuestion(assessmentIdx, questionIdx, 'correctAnswer', optionIdx)}
                                                className="w-4 h-4 text-green-600 focus:ring-green-500"
                                              />
                                              <input
                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder={`Option ${optionIdx + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                  const newOptions = [...question.options];
                                                  newOptions[optionIdx] = e.target.value;
                                                  updateQuestion(assessmentIdx, questionIdx, 'options', newOptions);
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Explanation (Optional)</label>
                                        <textarea
                                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                          rows={2}
                                          placeholder="Explain why this is the correct answer..."
                                          value={question.explanation}
                                          onChange={(e) => updateQuestion(assessmentIdx, questionIdx, 'explanation', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Form Actions */}
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Publish immediately</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Make course available to students right away</p>
                    </div>
                  </label>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          title: '', description: '', category: '', level: 'Beginner', price: 0,
                          thumbnail: '', tags: '', isPublished: false, instructorName: '',
                          videos: [], assessmentMode: 'handmade', assessments: []
                        });
                      }}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                    >
                      Reset Form
                    </button>
                    <button
                      disabled={loading}
                      onClick={createCourse}
                      className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Create Course</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Analytics Coming Soon</h3>
              <p className="text-gray-600 dark:text-gray-400">Detailed course analytics and performance metrics will be available here.</p>
            </div>
          </div>
        )}



        {/* Edit Course Modal */}
        {editingCourse && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-indigo-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Edit Course</h2>
                  <button
                    onClick={handleEditModalClose}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <form onSubmit={handleEditFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Course Title</label>
                      <input
                        name="title"
                        value={editForm.title || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
                      <input
                        name="category"
                        value={editForm.category || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Level</label>
                      <select
                        name="level"
                        value={editForm.level || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Price (₹)</label>
                      <input
                        type="number"
                        name="price"
                        value={editForm.price || 0}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Thumbnail URL</label>
                      <input
                        name="thumbnail"
                        value={editForm.thumbnail || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Tags</label>
                      <input
                        name="tags"
                        value={editForm.tags || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="comma separated"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                      <textarea
                        name="description"
                        value={editForm.description || ''}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="isPublished"
                      checked={!!editForm.isPublished}
                      onChange={e => setEditForm((prev: any) => ({ ...prev, isPublished: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Published</label>
                  </div>
                </form>

                <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
                  <MaterialUpload courseId={editForm._id} />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleEditModalClose}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditFormSubmit}
                    disabled={editLoading}
                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;


