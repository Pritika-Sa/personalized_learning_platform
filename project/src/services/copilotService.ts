// Copilot service for interacting with the learning copilot backend
import { getToken } from '../contexts/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api';

export interface LearningPlan {
  _id?: string;
  userId?: string;
  courseId: string;
  title: string;
  description?: string;
  weeks: Week[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Week {
  weekNumber: number;
  topics: string[];
  hoursPerWeek?: number;
  tasks?: string[];
  status?: 'not-started' | 'in-progress' | 'completed';
}

export interface ProgressState {
  _id?: string;
  userId?: string;
  courseId: string;
  currentWeek: number;
  currentTopic?: string;
  progressPercent: number;
  lastUpdated?: string;
}

export interface MasteryRecord {
  _id?: string;
  userId?: string;
  courseId: string;
  topic: string;
  score: number;
  attempts: number;
  lastAttemptAt?: string;
  history?: MasteryEntry[];
}

export interface MasteryEntry {
  at: string;
  score: number;
}

export interface CopilotReply {
  success: boolean;
  reply: string;
  suggestions?: string[];
}

const headers = () => {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Generate a new learning plan
export const generateLearningPlan = async (
  courseId: string,
  weeks: number = 8,
  hoursPerWeek: number = 5,
  goals: string = ''
): Promise<{ success: boolean; plan?: LearningPlan; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning/copilot/plan`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ courseId, weeks, hoursPerWeek, goals }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to generate plan' };
    }

    const data = await response.json();
    return { success: true, plan: data.plan };
  } catch (error) {
    console.error('Error generating learning plan:', error);
    return { success: false, error: 'Network error' };
  }
};

// Fetch user's learning plan for a course
export const getLearningPlan = async (
  courseId: string
): Promise<{ success: boolean; plan?: LearningPlan; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning/copilot/plan/${courseId}`, {
      method: 'GET',
      headers: headers(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'No learning plan found' };
      }
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to fetch plan' };
    }

    const data = await response.json();
    return { success: true, plan: data.plan };
  } catch (error) {
    console.error('Error fetching learning plan:', error);
    return { success: false, error: 'Network error' };
  }
};

// Update progress state
export const updateProgress = async (
  courseId: string,
  currentWeek: number,
  currentTopic?: string,
  progressPercent?: number
): Promise<{ success: boolean; state?: ProgressState; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning/copilot/progress`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ courseId, currentWeek, currentTopic, progressPercent }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to update progress' };
    }

    const data = await response.json();
    return { success: true, state: data.state };
  } catch (error) {
    console.error('Error updating progress:', error);
    return { success: false, error: 'Network error' };
  }
};

// Submit quiz result and update mastery
export const submitQuizResult = async (
  courseId: string,
  topic: string,
  score: number
): Promise<{ success: boolean; mastery?: MasteryRecord; suggestion?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning/copilot/quiz/submit`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ courseId, topic, score }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to submit quiz' };
    }

    const data = await response.json();
    return { success: true, mastery: data.mastery, suggestion: data.suggestion };
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return { success: false, error: 'Network error' };
  }
};

// Get copilot chat response
export const getCopilotReply = async (
  courseId: string,
  message: string
): Promise<{ success: boolean; reply?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning/copilot/chat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ courseId, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to get copilot reply' };
    }

    const data = await response.json();
    return { success: true, reply: data.reply };
  } catch (error) {
    console.error('Error getting copilot reply:', error);
    return { success: false, error: 'Network error' };
  }
};

export default {
  generateLearningPlan,
  getLearningPlan,
  updateProgress,
  submitQuizResult,
  getCopilotReply,
};
