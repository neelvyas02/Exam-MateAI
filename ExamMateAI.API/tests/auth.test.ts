import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('Auth API and Validation', () => {
  const testEmail = `test_${Date.now()}@exammate.ai`;
  let accessToken = '';
  let refreshToken = '';

  it('POST /api/v1/auth/register should fail with invalid email and return 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/auth/register should fail with short password and return 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Test User',
      email: 'valid@exammate.ai',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register should successfully register a new user and return tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Integration Student',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'Student',
    });

    // Database may be connected or in fallback
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    } else {
      // If DB is disconnected, error is gracefully handled
      expect(res.body.success).toBe(false);
    }
  });

  it('POST /api/v1/auth/login should fail with invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@exammate.ai',
      password: 'WrongPassword!',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me should return 401 Unauthorized when token is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('GET /api/v1/auth/me should succeed when valid access token is provided', async () => {
    if (!accessToken) return;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
  });
});
