import { describe, it } from 'node:test';
import assert from 'node:assert';
import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import type { AuthRequest } from '../../middleware/auth';
import { listInventory } from '../controllers/inventoryController';

function mockAuth(req: Request, _res: Response, next: NextFunction): void {
  (req as AuthRequest).user = {
    userId: 'test-user-id',
    email: 'test@test.com',
    role: 'admin',
    permissions: ['mrpeasy.view', 'mrpeasy.manage'],
  };
  next();
}

describe('MRPeasy inventory routes (integration)', () => {
  it('GET /inventory returns 200 and standardized body with data array', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockAuth);
    app.get('/api/v1/mrpeasy/inventory', listInventory);

    const result = await new Promise<{ statusCode: number; body: unknown }>((resolve, reject) => {
      const server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port;
        const req = http.request(
          { hostname: 'localhost', port, path: '/api/v1/mrpeasy/inventory', method: 'GET' },
          (res) => {
            let data = '';
            res.on('data', (ch: Buffer) => (data += ch.toString()));
            res.on('end', () => {
              server.close();
              try {
                resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(data || '{}') });
              } catch {
                resolve({ statusCode: res.statusCode ?? 0, body: data });
              }
            });
          }
        );
        req.on('error', (err) => {
          server.close();
          reject(err);
        });
        req.end();
      });
    });

    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual((result.body as { success?: boolean })?.success, true);
    assert.ok(Array.isArray((result.body as { data?: unknown[] })?.data));
  });
});
