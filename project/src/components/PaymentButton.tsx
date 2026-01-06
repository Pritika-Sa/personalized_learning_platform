import React, { useState } from 'react';
import { CreditCard, Lock, Loader2, CheckCircle } from 'lucide-react';
import paymentService from '../services/paymentService';

interface PaymentButtonProps {
  course: {
    _id: string;
    title: string;
    price: number;
    thumbnail?: string;
  };
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  course,
  onPaymentSuccess,
  onPaymentError,
  className = '',
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handlePayment = async () => {
    if (disabled || isProcessing) return;

    console.log('Payment button clicked for course:', course._id);
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      console.log('Processing payment...');
      const result = await paymentService.processPayment(course._id);
      console.log('Payment result:', result);
      
      if (result.success) {
        console.log('Payment successful!');
        setPaymentStatus('success');
        onPaymentSuccess?.();
        
        // Show success message
        alert('Payment successful! You have been enrolled in the course.');
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setPaymentStatus('idle');
        }, 3000);
      } else {
        console.log('Payment failed:', result.message);
        setPaymentStatus('error');
        onPaymentError?.(result.message);
        
        // Show error message
        alert(`Payment failed: ${result.message}`);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setPaymentStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onPaymentError?.(errorMessage);
      
      // Show error message
      alert(`Payment error: ${errorMessage}`);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setPaymentStatus('idle');
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonContent = () => {
    switch (paymentStatus) {
      case 'processing':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Payment Successful!</span>
          </>
        );
      case 'error':
        return (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Retry Payment</span>
          </>
        );
      default:
        return (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Start Learning</span>
          </>
        );
    }
  };

  const getButtonClass = () => {
    const baseClass = `
      flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
      transition-all duration-200 transform hover:scale-105 disabled:transform-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    switch (paymentStatus) {
      case 'success':
        return `${baseClass} bg-green-600 text-white hover:bg-green-700`;
      case 'error':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700`;
      case 'processing':
        return `${baseClass} bg-blue-500 text-white cursor-not-allowed`;
      default:
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl`;
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        className={`${getButtonClass()} ${className}`}
      >
        {getButtonContent()}
      </button>
      
      {/* Security badge */}
      <div className="flex items-center justify-center text-xs text-gray-500">
        <Lock className="w-3 h-3 mr-1" />
        <span>Secured by Razorpay</span>
      </div>
      
      {/* Course info */}
      <div className="text-center text-xs text-gray-600">
        <p>One-time payment for "{course.title}"</p>
        <p>Lifetime access included</p>
      </div>
    </div>
  );
};

export default PaymentButton;
