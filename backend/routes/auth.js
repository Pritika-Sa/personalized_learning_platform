const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { auth, logActivity } = require('../middleware/auth');

const router = express.Router();

// Check username/email availability
router.post('/check-availability', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      const conflicts = [];
      if (existingUser.email === email) conflicts.push('email');
      if (existingUser.username === username) conflicts.push('username');
      
      return res.status(200).json({ 
        available: false,
        conflicts,
        message: `${conflicts.join(' and ')} already taken`
      });
    }
    
    res.status(200).json({ 
      available: true,
      message: 'Username and email are available'
    });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ message: 'Server error checking availability' });
  }
});

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, skills, interests, careerObjective } = req.body;
    console.log('Register called');

    // Server-side validation
    const validationErrors = [];

    // Username validation
    if (!username || !username.trim()) {
      validationErrors.push('Username is required');
    } else if (username.length < 3) {
      validationErrors.push('Username must be at least 3 characters');
    } else if (username.length > 20) {
      validationErrors.push('Username must be less than 20 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      validationErrors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email || !email.trim()) {
      validationErrors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        validationErrors.push('Please enter a valid email address');
      }
    }

    // Password validation
    if (!password) {
      validationErrors.push('Password is required');
    } else if (password.length < 8) {
      validationErrors.push('Password must be at least 8 characters');
    } else {
      if (!/(?=.*[a-z])/.test(password)) {
        validationErrors.push('Password must contain at least one lowercase letter');
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        validationErrors.push('Password must contain at least one uppercase letter');
      }
      if (!/(?=.*\d)/.test(password)) {
        validationErrors.push('Password must contain at least one number');
      }
      if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
        validationErrors.push('Password must contain at least one special character');
      }
    }

    // First name validation
    if (!firstName || !firstName.trim()) {
      validationErrors.push('First name is required');
    } else if (firstName.trim().length < 2) {
      validationErrors.push('First name must be at least 2 characters');
    } else if (firstName.trim().length > 50) {
      validationErrors.push('First name must be less than 50 characters');
    } else if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      validationErrors.push('First name can only contain letters');
    }

    // Last name validation
    if (!lastName || !lastName.trim()) {
      validationErrors.push('Last name is required');
    } else if (lastName.trim().length < 1) {
      validationErrors.push('Last name must be at least 1 characters');
    } else if (lastName.trim().length > 50) {
      validationErrors.push('Last name must be less than 50 characters');
    } else if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      validationErrors.push('Last name can only contain letters');
    }

    // Normalize skills input (optional)
    const normalizedSkills = Array.isArray(skills) ? skills : [];

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const conflicts = [];
      if (existingUser.email === email) conflicts.push('email');
      if (existingUser.username === username) conflicts.push('username');
      
      return res.status(400).json({ 
        message: `Registration failed: ${conflicts.join(' and ')} already exists.`,
        conflicts
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'student',
      skills: normalizedSkills,
      interests: interests || '',
      careerObjective: careerObjective || ''
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Log registration activity
    await Activity.logActivity({
      userId: user._id,
      type: 'profile_update',
      description: 'User registered successfully',
      metadata: { registrationMethod: 'email' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        skills: user.skills,
        interests: user.interests,
        careerObjective: user.careerObjective
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Server-side validation for login
    const validationErrors = [];

    if (!email || !email.trim()) {
      validationErrors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        validationErrors.push('Please enter a valid email address');
      }
    }

    if (!password) {
      validationErrors.push('Password is required');
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Log login activity
    await Activity.logActivity({
      userId: user._id,
      type: 'login',
      description: 'User logged in successfully',
      metadata: { loginMethod: 'email' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// User Logout
router.post('/logout', auth, logActivity, (req, res) => {
  try {
    // Set activity data for logging
    req.activityData = {
      type: 'logout',
      description: 'User logged out successfully',
      metadata: { logoutMethod: 'api' }
    };

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // req.user is already the full user object from auth middleware
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// Update user profile
router.put('/profile', auth, logActivity, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email,
      phone,
      location,
      bio,
      skills,
      interests,
      careerObjective,
      website,
      linkedin,
      github,
      profilePicture 
    } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Validate email if provided and different from current
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use by another account.' });
      }
      user.email = email;
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) user.skills = skills;
    if (interests !== undefined) user.interests = interests;
    if (careerObjective !== undefined) user.careerObjective = careerObjective;
    if (website !== undefined) user.website = website;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (github !== undefined) user.github = github;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Set activity data for logging
    req.activityData = {
      type: 'profile_update',
      description: 'User profile updated successfully',
      metadata: { updatedFields: Object.keys(req.body) }
    };

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        skills: user.skills,
        interests: user.interests,
        careerObjective: user.careerObjective,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        profilePicture: user.profilePicture,
        xp: user.xp,
        level: user.level,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// Change password
router.put('/change-password', auth, logActivity, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Set activity data for logging
    req.activityData = {
      type: 'password_change',
      description: 'Password changed successfully',
      metadata: { changeMethod: 'api' }
    };

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error changing password.' });
  }
});

module.exports = router;
