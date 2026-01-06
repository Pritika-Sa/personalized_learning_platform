const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Update user skills and interests
router.post('/skills-interests', auth, async (req, res) => {
  try {
    const { skills, interests, experienceLevel, completedCourses } = req.body;
    const userId = req.user._id;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ message: 'Skills array is required' });
    }

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ message: 'Interests array is required' });
    }

    if (!experienceLevel) {
      return res.status(400).json({ message: 'Experience level is required' });
    }

    // Update user profile
    const updateData = {
      skills: skills,
      interests: interests.join(', '), // Convert array to comma-separated string
      experienceLevel: experienceLevel,
      skillsSelected: true,
      updatedAt: new Date()
    };

    // Add completedCourses if provided
    if (completedCourses && Array.isArray(completedCourses)) {
      updateData.completedCourses = completedCourses;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Skills and interests updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        skills: user.skills,
        interests: user.interests,
        experienceLevel: user.experienceLevel,
        completedCourses: user.completedCourses,
        skillsSelected: user.skillsSelected
      }
    });
  } catch (error) {
    console.error('Skills and interests update error:', error);
    res.status(500).json({ message: 'Failed to update skills and interests' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password -otpCode -otpExpiresAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        skills: user.skills,
        interests: user.interests,
        experienceLevel: user.experienceLevel,
        skillsSelected: user.skillsSelected,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        xp: user.xp,
        level: user.level,
        profilePicture: user.profilePicture,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.otpCode;
    delete updates.otpExpiresAt;
    delete updates.role;

    updates.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpiresAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        skills: user.skills,
        interests: user.interests,
        experienceLevel: user.experienceLevel,
        skillsSelected: user.skillsSelected,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        xp: user.xp,
        level: user.level,
        profilePicture: user.profilePicture,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
