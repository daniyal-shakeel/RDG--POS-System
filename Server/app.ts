// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from Server directory
// dotenv.config() will not throw if .env doesn't exist (handles missing .env gracefully)
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

import express, { Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import customerRoutes from './routes/Customer';
import productRoutes from './routes/Product';
import invoiceRoutes from './routes/Invoice';
import receiptRoutes from './routes/Receipt';
import estimateRoutes from './routes/Estimate';

const app = express();

// Validate and set PORT with proper error handling
const PORT = process.env.PORT || 5000;

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

// API routes

// Error handling middleware (should be after routes)
app.use((err: Error, _req: Request, res: Response, _next: Function): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/invoice', invoiceRoutes);
app.use('/api/v1/receipt', receiptRoutes);
app.use('/api/v1/estimate', estimateRoutes);

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