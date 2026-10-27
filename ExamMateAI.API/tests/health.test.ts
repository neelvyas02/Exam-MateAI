import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('Health API', () => {
  it('GET /api/v1/health should return standard HealthStatusDto matching frontend format', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.database).toBeDefined();
    expect(res.body.data.supabaseStorage).toBeDefined();
    expect(res.body.data.aiProvider).toBeDefined();
  });

  it('GET / should return root online message and docs pointer', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.docs).toBe('/api-docs');
  });
});
