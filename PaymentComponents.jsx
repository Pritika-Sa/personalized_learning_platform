import React, { useState } from 'react';
import axios from 'axios';

// Simplified enrollment button — payments removed
const EnrollButton = ({ courseId, user, onEnrolled }) => {
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/courses/${courseId}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      if (onEnrolled) onEnrolled(courseId);
      window.location.reload();
    } catch (err) {
      console.error('Enroll error:', err);
      alert('Failed to enroll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className={`px-6 py-2 rounded font-medium transition-colors ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
      {loading ? 'Enrolling...' : 'Start Learning'}
    </button>
  );
};

const DeprecatedPaymentHistory = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Payment History (Deprecated)</h3>
    <p className="text-gray-600">Payments and purchase history are no longer supported.</p>
  </div>
);

export { EnrollButton as PaymentButton, DeprecatedPaymentHistory as PaymentHistory };