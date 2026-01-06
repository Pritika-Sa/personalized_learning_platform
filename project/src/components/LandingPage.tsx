import { useState } from 'react';
import { Shield, Mail, Lock, User, Eye, EyeOff, Star, Users, BookOpen, Award, Zap, Target, Globe, Heart, TrendingUp, CheckCircle, ArrowRight, Play, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG, getApiUrl } from '../config/api';

interface LandingPageProps {
  onLoginSuccess: () => void;
  onNavigateToOtp: (email: string, isSignup: boolean) => void;
}

export default function LandingPage({ onLoginSuccess, onNavigateToOtp }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });

  const handleStartExplore = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setActiveTab('login');
      setError('Please login first to start exploring');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Use AuthContext's login method to ensure proper state management
      const success = await login(loginData.email, loginData.password);
      
      if (success) {
        // Get the updated user data from the context after successful login
        // The AuthContext's login method already handles token and user storage
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          // Fetch user data to pass to onLoginSuccess
          const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE), {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            // Store user data in localStorage for the auth context to pick up
            localStorage.setItem('user', JSON.stringify(userData.user || userData));
            onLoginSuccess();
          } else {
            onLoginSuccess(); // Fallback - let the context handle user state
          }
        }
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    // Basic client-side validation
    const nameOk1 = /^[A-Za-z][A-Za-z\s'.-]{1,48}$/.test(signupData.firstName.trim());
    const lastNameOk = /^[A-Za-z][A-Za-z\s'.-]{0,48}$/.test(signupData.lastName.trim());
    const emailOk = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(signupData.email.trim());
    const pass = signupData.password;
    const passOk = pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass);
    if (!nameOk1) return setError('Enter a valid first name (letters/spaces, min 2 characters).');
    if (!emailOk) return setError('Enter a valid email address (e.g., name@example.com).');
    if (!lastNameOk) return setError('Enter a valid last name (letters/spaces).');
    if (!/^\d{10}$/.test(signupData.phone.trim())) return setError('Phone must be exactly 10 digits.');
    if (!passOk) return setError('Password must be 8+ chars with uppercase, lowercase, and a number.');
    if (signupData.confirmPassword !== signupData.password) return setError("Passwords don't match.");

    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    try {
      // Call backend register endpoint directly (OTP removed)
      const payload = {
        username: signupData.email.trim().split('@')[0],
        firstName: signupData.firstName.trim(),
        lastName: signupData.lastName.trim(),
        email: signupData.email.trim(),
        password: signupData.password,
        // provide minimal defaults for optional fields
        // backend requires at least one skill, send a default if none selected
        skills: ['general'],
        interests: '',
        careerObjective: ''
      };

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data: any = await response.json().catch(() => ({}));

      if (response.ok) {
        // Store token and user, then proceed
        if (data.token) localStorage.setItem('authToken', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess();
      } else {
        setError(data?.message || `Signup failed (${response.status})`);
      }
    } catch (err: any) {
      setError(err?.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/4 -left-4 w-96 h-96 bg-gradient-to-br from-pink-400 to-red-500 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 animate-ping"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Shield className="h-10 w-10 text-white drop-shadow-lg" />
              <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Arivom Learning
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg font-semibold flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Login</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setShowAuthModal(true);
              }}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-2 rounded-full hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-6 leading-tight">
              Transform Your Future
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Unlock your potential with AI-powered personalized learning experiences designed for the modern world
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <button
              onClick={handleStartExplore}
              className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-full text-xl font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-2xl flex items-center space-x-3"
            >
              <Play className="h-6 w-6 group-hover:animate-pulse" />
              <span>Start Learning Journey</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                setActiveTab('login');
                setShowAuthModal(true);
              }}
              className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/30 flex items-center space-x-2"
            >
              <User className="h-5 w-5" />
              <span>Login Now</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">50K+</div>
              <div className="text-blue-200">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">1000+</div>
              <div className="text-blue-200">Expert Courses</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-blue-200">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose Arivom?
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Experience the future of education with our cutting-edge features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "AI-Powered Personalization",
                description: "Advanced algorithms create personalized learning paths tailored to your unique goals and learning style."
              },
              {
                icon: Users,
                title: "Global Community",
                description: "Connect with learners worldwide, participate in discussions, and grow together in a supportive environment."
              },
              {
                icon: BookOpen,
                title: "Expert-Led Content",
                description: "Learn from industry experts with real-world experience across diverse fields and technologies."
              },
              {
                icon: Award,
                title: "Verified Certificates",
                description: "Earn recognized certificates that boost your career prospects and showcase your achievements."
              },
              {
                icon: Zap,
                title: "Interactive Learning",
                description: "Engage with hands-on projects, simulations, and interactive assessments for deeper understanding."
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                description: "Monitor your growth with detailed analytics and celebrate milestones along your learning journey."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 border border-white/20 group">
                <feature.icon className="h-12 w-12 text-blue-300 mb-6 group-hover:text-white transition-colors" />
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-blue-200 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Company Section */}
      <section className="relative z-10 py-20 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                Our Mission
              </h2>
              <p className="text-xl text-blue-200 mb-6 leading-relaxed">
                At Arivom Learning, we believe that education should be accessible, engaging, and transformative. 
                Our platform combines cutting-edge technology with proven pedagogical methods to create learning 
                experiences that adapt to you.
              </p>
              <p className="text-lg text-blue-300 mb-8 leading-relaxed">
                Founded by educators and technologists, we're committed to democratizing quality education 
                and empowering learners worldwide to achieve their dreams.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Innovative Technology</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Expert Instructors</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Global Community</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-8 backdrop-blur-sm border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                    <div className="text-2xl font-bold text-white">Global Reach</div>
                    <div className="text-blue-200">150+ Countries</div>
                  </div>
                  <div className="text-center">
                    <Heart className="h-12 w-12 text-pink-300 mx-auto mb-4" />
                    <div className="text-2xl font-bold text-white">Satisfaction</div>
                    <div className="text-blue-200">4.9/5 Rating</div>
                  </div>
                  <div className="text-center">
                    <Star className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                    <div className="text-2xl font-bold text-white">Excellence</div>
                    <div className="text-blue-200">Award Winning</div>
                  </div>
                  <div className="text-center">
                    <Users className="h-12 w-12 text-green-300 mx-auto mb-4" />
                    <div className="text-2xl font-bold text-white">Community</div>
                    <div className="text-blue-200">Active Forum</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Ready to Transform Your Life?
          </h2>
          <p className="text-xl text-blue-200 mb-12 max-w-2xl mx-auto">
            Join thousands of learners who have already started their journey to success with Arivom Learning
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-16 py-6 rounded-full text-2xl font-bold hover:from-pink-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-2xl"
          >
            Join Arivom Today
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left: Auth content */}
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-8 w-8 text-red-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex mb-8 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'login'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setActiveTab('signup')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'signup'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Signup
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Login Form */}
                {activeTab === 'login' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleLogin}
                      disabled={loading || !loginData.email || !loginData.password}
                      className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </button>
                  </div>
                )}

                {/* Signup Form */}
                {activeTab === 'signup' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={signupData.firstName}
                            onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter your first name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={signupData.lastName}
                            onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter your last name"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={signupData.phone}
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="10-digit phone number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Confirm your password"
                        />
                      </div>
                    </div>
                   
                    <button
                      onClick={handleSignup}
                      disabled={
                        loading ||
                        !signupData.firstName ||
                        !signupData.phone ||
                        !signupData.email ||
                        !signupData.password ||
                        !signupData.confirmPassword
                      }
                      className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {loading ? 'Creating Account...' : 'Create account'}
                    </button>
                  </div>
                )}

              </div>

              {/* Right: Visual */}
              <div className="hidden lg:block bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
                <div className="text-center p-8 relative z-10">
                  <div className="text-6xl mb-6">🎓</div>
                  <h3 className="text-3xl font-bold text-white mb-4">Join Arivom</h3>
                  <p className="text-blue-100 text-lg leading-relaxed">
                    Start your personalized learning journey with thousands of students worldwide
                  </p>
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center space-x-3 text-white">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>AI-Powered Learning</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>Expert Instructors</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>Verified Certificates</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Login Button */}
      <div className="fixed bottom-8 right-8 z-30">
        <button
          onClick={() => {
            setActiveTab('login');
            setShowAuthModal(true);
          }}
          className="group bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-full shadow-2xl hover:from-red-600 hover:to-red-700 transform hover:scale-110 transition-all duration-300 flex items-center space-x-2"
          title="Quick Login"
        >
          <User className="h-6 w-6" />
          <span className="hidden group-hover:inline-block pr-2 font-semibold">Login</span>
        </button>
      </div>
    </div>
  );
}
