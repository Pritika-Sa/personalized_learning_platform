const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');
require('dotenv').config();

const seedCourses = [
    {
        title: "Data Structures and Algorithms (DSA)",
        description: "Comprehensive guide to DSA from basics to advanced. Covers Arrays, Linked Lists, Trees, Graphs, and Dynamic Programming.",
        category: "Computer Science",
        level: "intermediate",
        duration: 600,
        price: 0,
        tags: ["DSA", "Programming", "Interview Prep"],
        isPublished: true,
        topics: ["Arrays & Objects", "Linked Lists", "Stacks & Queues", "Trees & Graphs", "Sorting & Searching", "Dynamic Programming"]
    },
    {
        title: "Signals and Systems",
        description: "Deep dive into Signals and Systems. Covers Fourier Series, Fourier Transform, Z-Transform, and LTI systems.",
        category: "Electrical Engineering",
        level: "advanced",
        duration: 800,
        price: 0,
        tags: ["Signals", "Systems", "DSP", "Engineering"],
        isPublished: true,
        topics: ["Introduction to Signals", "LTI Systems", "Fourier Series", "Fourier Transform", "Z-Transform", "Laplace Transform"]
    },
    {
        title: "Thermodynamics",
        description: "Complete course on Thermodynamics. Laws of thermodynamics, entropy, and heat engines.",
        category: "Mechanical Engineering",
        level: "intermediate",
        duration: 500,
        price: 0,
        tags: ["Physics", "Heat", "Thermodynamics"],
        isPublished: true,
        topics: ["Zeroth Law", "First Law", "Second Law", "Entropy", "Pure Substances"]
    }
];

async function seed() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/arivom_learning_platform';
        console.log(`Connecting to: ${mongoUri}`);
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found, creating default admin...');
            admin = new User({
                username: 'admin',
                email: 'admin@arivom.com',
                password: 'password123',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin'
            });
            await admin.save();
        }

        for (const courseData of seedCourses) {
            const existing = await Course.findOne({ title: courseData.title });
            if (existing) {
                console.log(`Course "${courseData.title}" already exists. Updating...`);
                Object.assign(existing, courseData);
                await existing.save();
            } else {
                const course = new Course({
                    ...courseData,
                    instructor: admin._id
                });
                await course.save();
                console.log(`Created course: ${courseData.title}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
