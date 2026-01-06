export const API_CONFIG = {
  BASE_URL: 'http://localhost:5001/api',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      PROFILE: '/auth/profile',
      CHECK_AVAILABILITY: '/auth/check-availability'
    },
    COURSES: {
      LIST: '/courses',
      DETAIL: '/courses',
      STATUS: '/courses',
      COMPLETE: '/courses'
    },
    ASSESSMENTS: {
      PROGRESS: '/assessments/progress',
      RESULTS: '/assessments/results',
      RESULT: '/assessments/result'
    },
    REVIEWS: {
      BASE: '/reviews',
      COURSE: '/reviews/course',
      HELPFUL: '/reviews',
      REPORT: '/reviews'
    },
    CERTIFICATES: '/certificates',
    PAYMENTS: '/payments'
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
