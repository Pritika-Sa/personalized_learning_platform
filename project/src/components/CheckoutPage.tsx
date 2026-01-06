import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CreditCard, Shield, Lock, Check, Loader2, AlertCircle } from 'lucide-react';

interface Course {
  _id: string;
  title: string;
  price: number;
  thumbnail?: string;
  category?: string;
  level?: string;
  instructor?: {
    name: string;
  };
  description?: string;
}

const CheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId, user]);

  // Payment system removed. Enrollment is immediate.

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/courses/${courseId}`);
      
      if (!response.ok) {
        throw new Error('Course not found');
      }
      
      const courseData = await response.json();
      setCourse(courseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course || !user) return;
    try {
      setPaymentLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Please log in to continue');

      const response = await fetch(`http://localhost:5001/api/courses/${course._id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to enroll');
      }

      navigate(`/courses/${courseId}?enrolled=true`);
    } catch (err) {
      console.error('Enroll error:', err);
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setPaymentLoading(false);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-4">Please log in to proceed with the payment</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Course
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Course Summary</h2>
              
              <div className="flex space-x-4">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{course.title}</h3>
                  {course.instructor && (
                    <p className="text-sm text-gray-600">by {course.instructor.name}</p>
                  )}
                  {course.category && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {course.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{course.price}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">One-time payment • Lifetime access</p>
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                Secure Payment
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  256-bit SSL encryption
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Secure payment processing by Razorpay
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Your payment information is safe
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Course Price</span>
                    <span>₹{course.price}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Taxes & Fees</span>
                    <span>₹0</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex items-center justify-between font-semibold text-lg">
                    <span>Total Amount</span>
                    <span className="text-blue-600">₹{course.price}</span>
                  </div>
                </div>

                <button
                  onClick={handleEnroll}
                  disabled={paymentLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Start Learning</span>
                    </>
                  )}
                </button>

                <div className="text-center text-xs text-gray-500">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Direct enrollment
                </div>
              </div>
            </div>

            {/* Course Benefits */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4">What you'll get:</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Lifetime access to course content
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Certificate of completion
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Access to all course materials
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Progress tracking and assessments
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
