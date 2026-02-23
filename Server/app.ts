
import dotenv from 'dotenv';
import { resolve } from 'path';



const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import connectDB from './config/db';
import { getRedisClient } from './config/redis';
import customerRouter from './routes/Customer';
import authRouter from './routes/Auth';
import userRouter from './routes/User';
import estimateRouter from './routes/Estimate';
import invoiceRouter from './routes/Invoice';
import receiptRouter from './routes/Receipt';
import creditNoteRouter from './routes/CreditNote';
import refundRouter from './routes/Refund';
import mrpeasyRouter, { mrpeasyConfig } from './mrpeasy';
import { logRequestAsync } from './utils/requestLogger';
import { idempotencyMiddleware } from './utils/idempotency';

const app = express();



const PORT = 5500;

export const SUPER_ADMIN_EMAIL: string = process.env.SUPER_ADMIN_EMAIL || '';
export const SUPER_ADMIN_PASSWORD: string = process.env.SUPER_ADMIN_PASSWORD || '';
export const JWT_SECRET: string = process.env.JWT_SECRET || "";
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

if(!JWT_SECRET || !JWT_EXPIRES_IN) {
  console.error('JWT_SECRET must be set');
  process.exit(1);
}

if(!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  process.exit(1);
}


const corsOrigins: string[] = ["http://localhost:8080"];
if (process.env.NODE_ENV === 'staging') {
  const ngrokUrl = process.env.FRONTEND_NGROK_URL?.trim();
  if (ngrokUrl) {
    corsOrigins.push(ngrokUrl.startsWith('http') ? ngrokUrl : `https://${ngrokUrl}`);
  }
} else {
  corsOrigins.push("https://199f-137-59-230-250.ngrok-free.app");
}

app.use(cors({
  origin: corsOrigins,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning", "X-Idempotency-Key"],
  credentials: true,
}));

app.options(/.*/, cors());

app.use(express.json({ limit: '10mb' })); 


app.use(idempotencyMiddleware);


if (process.env.NODE_ENV === 'staging') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logRequestAsync(req);
    next();
  });
}


app.get('/', (_req: Request, res: Response): void => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});


app.get('/check-auth', (req: Request, res: Response) => {
  try {    
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format. Token must start with "Bearer "',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    const token = authHeader.substring(7);

    
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is required',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format. Token must be a valid JWT',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired',
          authenticated: false,
          timestamp: new Date().toISOString()
        });
      }

      
      if (error.name === 'JsonWebTokenError') {
        
           
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          authenticated: false,
          timestamp: new Date().toISOString()
        });
      }

      
      return res.status(401).json({
        status: 'error',
        message: 'Token verification failed',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token payload',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    if (!decoded.email || typeof decoded.email !== 'string') {
      return res.status(401).json({
        status: 'error',
        message: 'Token does not contain email information',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
    if (!decoded.role || typeof decoded.role !== 'string') {
      return res.status(401).json({
        status: 'error',
        message: 'Token does not contain role information',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    
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


app.get('/clear-cache', async (_req: Request, res: Response) => {
  try {
    const cacheClient = await getRedisClient();
    if (!cacheClient) {
      return res.status(500).json({ message: 'Redis client unavailable' });
    }
    await cacheClient.flushAll();

    return res.status(200).json({
      message: 'Cache cleared',
    });
  } catch (error: any) {
    console.error('Failed to clear invoice cache:', error);
    return res.status(500).json({
      message: 'Failed to clear cache',
      error: error?.message,
    });
  }
});




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
app.use('/api/v1/estimate', estimateRouter);
app.use('/api/v1/invoice', invoiceRouter);
app.use('/api/v1/receipt', receiptRouter);
app.use('/api/v1/credit-notes', creditNoteRouter);
app.use('/api/v1/refunds', refundRouter);
console.log('Refund routes registered at /api/v1/refunds');

if (mrpeasyConfig.isEnabled()) {
  app.use('/api/v1/mrpeasy', mrpeasyRouter);
} else {
  app.use('/api/v1/mrpeasy', (_req: Request, res: Response) => {
    res.status(503).json({ success: false, error: 'MRPeasy module is disabled' });
  });
}


app.use((req: Request, res: Response): void => {
  console.log(req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});


const startServer = async (): Promise<void> => {
  try {
    
    await connectDB();
    
    
    app.listen(PORT,'0.0.0.0', (): void => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); 
  }
};

startServer();