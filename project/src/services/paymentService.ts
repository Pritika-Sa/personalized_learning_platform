import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

class PaymentService {
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  private getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Enroll immediately (payments removed)
  async enrollNow(courseId: string) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to enroll');
    }

    return await response.json();
  }

  // Check enrollment/status
  async getCourseStatus(courseId: string) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/status`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to get course status');
    }

    return await response.json();
  }
}

export const paymentService = new PaymentService();
export default paymentService;
