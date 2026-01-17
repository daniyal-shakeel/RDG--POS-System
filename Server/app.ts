// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from Server directory
// dotenv.config() will not throw if .env doesn't exist (handles missing .env gracefully)
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import connectDB from './config/db';
import customerRouter from './routes/Customer';
import authRouter from './routes/Auth';
import userRouter from './routes/User';


const app = express();

// Validate and set PORT with proper error handling
// const PORT = process.env.PORT || 5000;
const PORT = 5500;

export const SUPER_ADMIN_EMAIL: string = process.env.SUPER_ADMIN_EMAIL || '';
export const SUPER_ADMIN_PASSWORD: string = process.env.SUPER_ADMIN_PASSWORD || '';
export const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

if(!JWT_SECRET || !JWT_EXPIRES_IN) {
  console.error('JWT_SECRET must be set');
  process.exit(1);
}

if(!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  process.exit(1);
}
// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size to prevent DoS

// Health check endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Check authentication endpoint
app.get('/check-auth', (req: Request, res: Response) => {
  try {    
    // Edge case: No authorization header provided
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Edge case: Authorization header doesn't start with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format. Token must start with "Bearer "',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Edge case: Token is empty or just whitespace
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is required',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Edge case: Token is too short to be valid (JWT has 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format. Token must be a valid JWT',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Verify and decode token
    let decoded: any;
    console.log(token, "token");
    console.log(JWT_SECRET, "JWT_SECRET");
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      // Edge case: Token has expired
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired',
          authenticated: false,
          timestamp: new Date().toISOString()
        });
      }

      // Edge case: Invalid token signature or malformed token
      if (error.name === 'JsonWebTokenError') {
        // Don't log invalid signature errors to console (expected for invalid tokens)
           
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          authenticated: false,
          timestamp: new Date().toISOString()
        });
      }

      // Edge case: Other JWT errors
      return res.status(401).json({
        status: 'error',
        message: 'Token verification failed',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Edge case: Decoded token doesn't have required fields
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token payload',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Edge case: Missing email in token
    if (!decoded.email || typeof decoded.email !== 'string') {
      return res.status(401).json({
        status: 'error',
        message: 'Token does not contain email information',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Edge case: Missing role in token
    if (!decoded.role || typeof decoded.role !== 'string') {
      return res.status(401).json({
        status: 'error',
        message: 'Token does not contain role information',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Success: Token is valid
    return res.status(200).json({
      status: 'ok',
      message: 'Authentication successful',
      authenticated: true,
      user: {
        email: decoded.email,
        role: decoded.role,
        userId: decoded.userId || decoded.email,
        permissions: decoded.permissions || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Edge case: Unexpected errors (only log if not already handled)
    if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
      console.error('Check-auth unexpected error:', error);
    }
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking authentication',
      authenticated: false,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes

// Error handling middleware (should be after routes)
app.use((err: Error, _req: Request, res: Response, _next: Function): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('/api/v1/user', userRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/customer', customerRouter);

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize server with proper error handling
const startServer = async (): Promise<void> => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server only after successful database connection
    app.listen(PORT, (): void => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); 
  }
};

startServer();