import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LandingPage from './LandingPage';
import SkillsInterestsSelection from './SkillsInterestsSelection';

type AuthStep = 'landing' | 'skills-interests';

interface AuthFlowState {
  step: AuthStep;
  email: string;
  isSignup: boolean;
}

export default function AuthenticationFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<AuthFlowState>({
    step: 'landing',
    email: '',
    isSignup: false
  });

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect');
  
  useEffect(() => {
    // If there's a selected course in session storage, we came from course selection
    const selectedCourse = sessionStorage.getItem('selectedCourse');
    if (selectedCourse) {
      console.log('User came from course selection:', JSON.parse(selectedCourse));
    }
  }, []);

  // OTP removed; registration and login handled directly on LandingPage
  const handleNavigateToOtp = (_email: string, _isSignup: boolean) => {
    // noop kept for compatibility
  };

  const handleSignupSuccess = () => {
    setAuthState({ step: 'landing', email: '', isSignup: false });
  };

  const handleLoginSuccess = async () => {
    // Always redirect to home page immediately after successful OTP verification
    if (redirectUrl) {
      // Clear the selected course from session storage
      sessionStorage.removeItem('selectedCourse');
      navigate(redirectUrl);
    } else {
      // Redirect to home page after successful login
      navigate('/');
    }
    // No need for page reload, the context should update automatically
  };

  const handleSkillsInterestsComplete = async (data: { skills: string[], interests: string[], experienceLevel: string, completedCourses: string[] }) => {
    try {
      // Save skills and interests to user profile
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5001/api/users/profile/skills-interests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // Update user data and complete login
        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Generate course recommendations based on user inputs and redirect appropriately
        if (redirectUrl) {
          // Clear the selected course from session storage
          sessionStorage.removeItem('selectedCourse');
          navigate(redirectUrl);
        } else {
          navigate('/'); // Show home page instead of dashboard for new users
        }
        // No need for page reload, the context should update automatically
      } else {
        console.error('Failed to save skills and interests');
        // Still proceed even if skills/interests save fails
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error saving skills and interests:', error);
      // Still proceed even if there's an error
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleBackToLanding = () => {
    setAuthState({
      step: 'landing',
      email: '',
      isSignup: false
    });
  };

  switch (authState.step) {
    case 'landing':
      return (
        <LandingPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateToOtp={handleNavigateToOtp}
        />
      );

    case 'skills-interests':
      return (
        <SkillsInterestsSelection
          onComplete={handleSkillsInterestsComplete}
        />
      );

    default:
      return (
        <LandingPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateToOtp={handleNavigateToOtp}
        />
      );
  }
}
