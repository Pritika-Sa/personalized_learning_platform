import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserStats } from '../hooks/useUserStats';
import { Menu, X, User, LogOut, Settings, Bell, Search } from 'lucide-react';
import ArivomLogo from './ArivomLogo';

const Navigation: React.FC = () => {

  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const { stats: userStats, loading: statsLoading } = useUserStats();
  const [notifications, setNotifications] = useState<{ id: string; title: string; description?: string; date?: string; read?: boolean }[]>([]);
  const [navSearch, setNavSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!notifications.length) {
      // Seed with a couple of helpful starters so the bell feels functional
      setNotifications([
        { id: 'n1', title: 'Welcome to Arivom!', description: 'Explore courses and start learning today.', date: new Date().toISOString(), read: false },
        { id: 'n2', title: 'Tip', description: 'Visit your Dashboard to track progress.', date: new Date().toISOString(), read: false }
      ]);
    }
  };

  const handleNavSearchSubmit = () => {
    const query = navSearch.trim();
    if (query.length === 0) return;
    navigate(`/all-courses?q=${encodeURIComponent(query)}`);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <ArivomLogo size="md" variant="full" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Home
              </Link>
              <Link
                to="/all-courses"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/all-courses' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Courses
              </Link>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Dashboard
              </Link>
              <Link
                to="/recommendations"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/recommendations' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Recommendations
              </Link>
              <Link
                to="/copilot"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/copilot' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Copilot
              </Link>
              <Link
                to="/achievements"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/achievements' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Achievements
              </Link>
              {(user?.role === 'admin' || user?.role === 'instructor') && (
                <Link
                  to="/admin-courses"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/admin-courses' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right side - Search, Notifications, Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search courses..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNavSearchSubmit(); }}
                className="pl-10 pr-20 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleNavSearchSubmit}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={toggleNotifications} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative">
                <Bell className="h-5 w-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-md shadow-lg py-2 z-50 border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notifications</span>
                    {!!notifications.length && (
                      <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">Mark all as read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-300">No notifications yet</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-t border-gray-100 dark:border-gray-800 ${n.read ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</div>
                          {n.description && <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{n.description}</div>}
                          {n.date && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(n.date).toLocaleString()}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  onMouseEnter={() => setIsProfileHovered(true)}
                  onMouseLeave={() => setIsProfileHovered(false)}
                  className="flex items-center space-x-2 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">
                    {user.firstName}
                  </span>
                </button>

                {/* Enhanced Hover Tooltip */}
                {isProfileHovered && !isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-4 px-5 z-50 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    {/* Header with Avatar and Basic Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-blue-200 dark:ring-blue-800">
                          <span className="text-white font-bold text-lg">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            user.role === 'instructor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          }`}>
                            {user.role === 'admin' ? '👑 Admin' : user.role === 'instructor' ? '🎓 Instructor' : '📚 Student'}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            Online
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-2">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {statsLoading ? '...' : userStats.totalCourses}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Courses</div>
                      </div>
                      <div className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-2">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {statsLoading ? '...' : userStats.completedCourses}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                      </div>
                      <div className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2 px-2">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {statsLoading ? '...' : `${Math.round(userStats.overallProgress)}%`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Progress</div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Recent Activity</h4>
                      <div className="space-y-2">
                        {statsLoading ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Loading activities...</div>
                        ) : userStats.recentActivities.length > 0 ? (
                          userStats.recentActivities.slice(0, 2).map((activity, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs">
                              <div className={`w-6 h-6 ${
                                activity.type === 'course_completed' ? 'bg-green-100 dark:bg-green-900' :
                                activity.type === 'badge_earned' ? 'bg-yellow-100 dark:bg-yellow-900' :
                                activity.type === 'assessment_passed' ? 'bg-blue-100 dark:bg-blue-900' :
                                'bg-gray-100 dark:bg-gray-900'
                              } rounded-full flex items-center justify-center`}>
                                <span className={
                                  activity.type === 'course_completed' ? 'text-green-600 dark:text-green-400' :
                                  activity.type === 'badge_earned' ? 'text-yellow-600 dark:text-yellow-400' :
                                  activity.type === 'assessment_passed' ? 'text-blue-600 dark:text-blue-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }>
                                  {activity.type === 'course_completed' ? '📖' :
                                   activity.type === 'badge_earned' ? '🏆' :
                                   activity.type === 'assessment_passed' ? '✅' : '📚'}
                                </span>
                              </div>
                              <span className="text-gray-600 dark:text-gray-400">{activity.title}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">No recent activity</div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate('/dashboard'); setIsProfileHovered(false); }}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs text-blue-700 dark:text-blue-300 transition-colors"
                        >
                          <span>📊</span>
                          <span>Dashboard</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate('/profile'); setIsProfileHovered(false); }}
                          className="flex items-center space-x-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg text-xs text-purple-700 dark:text-purple-300 transition-colors"
                        >
                          <span>⚙️</span>
                          <span>Settings</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Member since {userStats.memberSince || new Date().getFullYear() - 1}
                        </p>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {userStats.lastLoginDate ? `Last seen ${userStats.lastLoginDate}` : 'Active now'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Click anywhere to access full profile menu
                      </p>
                    </div>
                  </div>
                )}

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      to="/profile"
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Home
            </Link>
            <Link
              to="/all-courses"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/all-courses' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Courses
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Dashboard
            </Link>
            <Link
              to="/recommendations"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/recommendations' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Recommendations
            </Link>
            <Link
              to="/copilot"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/copilot' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              🤖 Copilot
            </Link>
            <Link
              to="/achievements"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/achievements' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Achievements
            </Link>

            {(user?.role === 'admin' || user?.role === 'instructor') && (
              <Link
                to="/admin-courses"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/admin-courses' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-700 dark:text-gray-200 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Admin
              </Link>
            )}
            
            {user && (
              <>
                <hr className="my-2" />
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </>
            )}

            {!user && (
              <div className="mt-4 space-y-2">
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
