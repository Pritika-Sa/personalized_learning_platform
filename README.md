# Learning Platform

Backend server for a learning platform using Node.js, Express, and MongoDB.

## Features
- User authentication (JWT)
- Role-based access control
- Activity tracking
- MongoDB integration
- Secure APIs

## Prerequisites
- Node.js (v14+)
- MongoDB
- npm

## Setup & Run
Backend:
cd backend
add .env file
npm install
npm run dev

Frontend:
cd project
npm install
npm run dev

Environment Variables:
Create .env file:

MONGODB_URI=mongodb://localhost:27017/your-project
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
