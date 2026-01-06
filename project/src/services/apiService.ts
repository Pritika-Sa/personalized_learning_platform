// API service for communicating with the backend

const API_BASE_URL = 'http://localhost:5001/api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLogin?: string;
  loginCount?: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  url: string;
  quality: string;
}

class ApiService {
  private token: string | null = null;

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Get authentication token
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
    }
    return this.token;
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Get headers for authenticated requests
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Make authenticated API request
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: this.getHeaders(),
    };

    try {
      // Offline support: check cache for GET requests
      if (options.method === 'GET' || !options.method) {
        const cached = localStorage.getItem(`cache_${endpoint}`);
        if (cached && !navigator.onLine) {
          console.log('Serving from cache (Offline mode):', endpoint);
          return JSON.parse(cached);
        }
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET responses
      if (options.method === 'GET' || !options.method) {
        localStorage.setItem(`cache_${endpoint}`, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      // Fallback to cache if network fails
      if (options.method === 'GET' || !options.method) {
        const cached = localStorage.getItem(`cache_${endpoint}`);
        if (cached) {
          console.warn('Network failed, serving from cache:', endpoint);
          return JSON.parse(cached);
        }
      }
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async getProfile(): Promise<User> {
    return await this.makeRequest('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<AuthResponse> {
    return await this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Video methods
  async getVideoMetadata(lessonId: string): Promise<VideoMetadata> {
    return await this.makeRequest(`/videos/metadata/${lessonId}`);
  }

  async getVideoStream(lessonId: string): Promise<{ url: string; quality: string; duration: number }> {
    return await this.makeRequest(`/videos/stream/${lessonId}`);
  }

  async getVideoList(): Promise<VideoMetadata[]> {
    return await this.makeRequest('/videos/list');
  }

  async updateVideoProgress(lessonId: string, progress: number, duration: number): Promise<void> {
    return await this.makeRequest('/videos/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId, progress, duration }),
    });
  }

  async completeVideo(lessonId: string, courseId: string): Promise<void> {
    return await this.makeRequest('/videos/complete', {
      method: 'POST',
      body: JSON.stringify({ lessonId, courseId }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string; services: any }> {
    return await fetch(`${API_BASE_URL}/health`).then(res => res.json());
  }
}

export default new ApiService();

// Lightweight courses API helpers for new endpoints
export const coursesApi = {
  list: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/courses${query ? `?${query}` : ''}`).then(r => r.json());
  },
  get: (courseId: string) => fetch(`${API_BASE_URL}/courses/${courseId}`).then(r => r.json()),
  create: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
  update: (courseId: string, data: any, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  publish: (courseId: string, isPublished: boolean, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ isPublished }) }).then(r => r.json()),
  delete: (courseId: string, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => {
    if (!r.ok) throw new Error('Failed to delete course');
    return r.json();
  }),
  enroll: (courseId: string, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  getProgress: (courseId: string, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}/progress`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  markVideoComplete: (courseId: string, videoId: string, token: string) => fetch(`${API_BASE_URL}/courses/${courseId}/progress/video`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ videoId }) }).then(r => r.json()),
  completeCourse: async (courseId: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
  getCourseStatus: async (courseId: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

export const uploadsApi = {
  uploadVideo: (file: File, token: string) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_BASE_URL}/uploads/video`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form }).then(r => r.json());
  }
};

// Helper function for authenticated API requests
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('authToken');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
};

export const reviewsApi = {
  getCourseReviews: (courseId: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/reviews/course/${courseId}${query ? `?${query}` : ''}`).then(r => r.json());
  },
  getCourseRating: (courseId: string) => fetch(`${API_BASE_URL}/reviews/course/${courseId}/rating`).then(r => r.json()),
  canUserReview: (courseId: string, token: string) => fetch(`${API_BASE_URL}/reviews/course/${courseId}/can-review`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  createReview: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
  updateReview: (reviewId: string, data: any, token: string) => fetch(`${API_BASE_URL}/reviews/${reviewId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteReview: (reviewId: string, token: string) => fetch(`${API_BASE_URL}/reviews/${reviewId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  markHelpful: (reviewId: string, token: string) => fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  reportReview: (reviewId: string, reason: string, token: string) => fetch(`${API_BASE_URL}/reviews/${reviewId}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ reason }) }).then(r => r.json()),
  getRecentReviews: (limit = 10) => fetch(`${API_BASE_URL}/reviews/recent?limit=${limit}`).then(r => r.json())
};
