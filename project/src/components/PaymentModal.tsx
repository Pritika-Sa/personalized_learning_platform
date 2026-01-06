import React, { useState, useEffect } from 'react';
import { X, CreditCard, Shield, Check, AlertCircle, Loader2 } from 'lucide-react';
import PaymentButton from './PaymentButton';
import paymentService from '../services/paymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    _id: string;
    title: string;
    price: number;
    thumbnail?: string;
    category?: string;
    level?: string;
    instructor?: any;
  };
  onPaymentSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  course,
  onPaymentSuccess
}) => {
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && course._id) {
      console.log('PaymentModal: Modal opened for course:', course._id);
      console.log('PaymentModal: Local storage auth token:', localStorage.getItem('authToken'));
      checkPaymentStatus();
    }
  }, [isOpen, course._id]);

  const checkPaymentStatus = async () => {
    try {
      console.log('PaymentModal: Starting payment status check for course:', course._id);
      console.log('PaymentModal: Auth token present:', !!localStorage.getItem('authToken'));
      
      setLoading(true);
      setError(null);
      
      const status = await paymentService.getPaymentStatus(course._id);
      console.log('PaymentModal: Payment status received:', status);
      
      setPaymentStatus(status);
    } catch (err) {
      console.error('PaymentModal: Payment status check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    onPaymentSuccess?.();
    onClose();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Course Purchase</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Checking payment status...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={checkPaymentStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : paymentStatus?.hasPaid ? (
            <div className="text-center py-8">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Already Purchased!
              </h3>
              <p className="text-gray-600 mb-4">
                You have already purchased this course.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Continue Learning
              </button>
            </div>
          ) : (
            <>
              {/* Course Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {course.category && <p>Category: {course.category}</p>}
                      {course.level && <p>Level: {course.level}</p>}
                      {course.instructor && (
                        <p>Instructor: {course.instructor.firstName} {course.instructor.lastName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price and Features */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-blue-600">
                    {course.price}
                  </div>
                  <p className="text-sm text-gray-600">One-time payment</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Lifetime access to course content</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Access to all assessments</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Progress tracking</span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <div className="text-center">
                <PaymentButton
                  course={course}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  className="w-full"
                />
              </div>

              {/* Security Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-semibold text-gray-700">Secure Payment</span>
                </div>
                <div className="text-sm text-gray-600 text-center space-y-1">
                  <p>Your payment information is encrypted and secure</p>
                  <p>Processed by Razorpay - India's most trusted payment gateway</p>
                  <p>Support for UPI, Cards, Net Banking & Wallets</p>
                </div>
              </div>

              {/* Terms */}
              <div className="text-xs text-gray-500 text-center">
                <p>
                  By proceeding with the payment, you agree to our{' '}
                  <a href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
