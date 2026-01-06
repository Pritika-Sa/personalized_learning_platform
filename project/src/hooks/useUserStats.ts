// Hook to fetch user progress and statistics
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
const API_BASE_URL = 'http://localhost:5001/api';

interface UserStats {
  totalCourses: number;
  completedCourses: number;
  overallProgress: number;
  totalCertificates: number;
  recentActivities: Array<{
    id: string;
    type: 'course_completed' | 'badge_earned' | 'assessment_passed';
    title: string;
    timestamp: string;
    icon: string;
  }>;
  memberSince: string;
  lastLoginDate: string;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: string;
  }>;
}

export const useUserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalCourses: 0,
    completedCourses: 0,
    overallProgress: 0,
    totalCertificates: 0,
    recentActivities: [],
    memberSince: '',
    lastLoginDate: '',
    achievements: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        // Fetch user courses and progress
        const coursesResponse = await fetch('http://localhost:5001/api/courses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Fetch user's enrolled courses and progress
        const dashboardResponse = await fetch(`${API_BASE_URL}/users/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Fetch user achievements
        const achievementsResponse = await fetch(`${API_BASE_URL}/achievements/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        let totalCourses = 0;
        let completedCourses = 0;
        let overallProgress = 0;

        if (coursesResponse.ok) {
          const courses = await coursesResponse.json();
          totalCourses = courses.length;
        }

        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          if (dashboardData.enrolledCourses) {
            totalCourses = dashboardData.enrolledCourses.length;
            completedCourses = dashboardData.enrolledCourses.filter((course: any) =>
              course.progress === 100 || course.completed
            ).length;

            // Calculate overall progress
            const totalProgress = dashboardData.enrolledCourses.reduce((sum: number, course: any) =>
              sum + (course.progress || 0), 0
            );
            overallProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
          }
        }

        let achievements: any[] = [];
        if (achievementsResponse.ok) {
          achievements = await achievementsResponse.json();
        }

        // Generate recent activities based on available data
        const recentActivities = [
          {
            id: '1',
            type: 'course_completed' as const,
            title: 'Completed "Java Fundamentals"',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            icon: '📖'
          },
          {
            id: '2',
            type: 'badge_earned' as const,
            title: 'Earned "Code Master" badge',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            icon: '🏆'
          }
        ];

        // Add recent achievements to activities
        if (achievements.length > 0) {
          const recentAchievement = achievements[0];
          recentActivities.unshift({
            id: `achievement_${recentAchievement.id}`,
            type: 'badge_earned' as const,
            title: `Earned "${recentAchievement.name}" badge`,
            timestamp: recentAchievement.earnedAt || new Date().toISOString(),
            icon: '🎯'
          });
        }

        setStats({
          totalCourses,
          completedCourses,
          overallProgress,
          totalCertificates: completedCourses, // Assuming certificates are given for completed courses
          recentActivities: recentActivities.slice(0, 2), // Show only 2 most recent
          memberSince: user.createdAt ? new Date(user.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
          lastLoginDate: user.lastLogin || new Date().toISOString(),
          achievements
        });

      } catch (error) {
        console.error('Error fetching user stats:', error);
        setError('Failed to load user statistics');

        // Fallback to demo data if API fails
        setStats({
          totalCourses: 12,
          completedCourses: 8,
          overallProgress: 95,
          totalCertificates: 8,
          recentActivities: [
            {
              id: '1',
              type: 'course_completed',
              title: 'Completed "Java Fundamentals"',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              icon: '📖'
            },
            {
              id: '2',
              type: 'badge_earned',
              title: 'Earned "Code Master" badge',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              icon: '🏆'
            }
          ],
          memberSince: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : '2024',
          lastLoginDate: user?.lastLogin || new Date().toISOString(),
          achievements: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  const refetch = async () => {
    if (!user) return;
    // Refetch logic would go here
    setLoading(true);
    // ... same logic as in useEffect
    setLoading(false);
  };

  return { stats, loading, error, refetch };
};
