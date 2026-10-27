import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('Document Upload & Security Verification', () => {
  it('POST /api/v1/documents/upload-pdf should return 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/v1/documents/upload-pdf');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/documents/upload-pdf should reject non-PDF file upload', async () => {
    // Generate valid test JWT
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../src/config/index.js');
    const testToken = jwt.default.sign(
      { userId: '11111111-1111-1111-1111-111111111111', email: 'test@exammate.ai', role: 'Student' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/v1/documents/upload-pdf')
      .set('Authorization', `Bearer ${testToken}`)
      .attach('file', Buffer.from('plain text file content'), 'notes.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('PDF');
  });

  it('POST /api/v1/documents/upload-pdf should reject fake PDF without valid %PDF- magic signature', async () => {
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../src/config/index.js');
    const testToken = jwt.default.sign(
      { userId: '11111111-1111-1111-1111-111111111111', email: 'test@exammate.ai', role: 'Student' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const fakePdfBuffer = Buffer.from('This is not really a pdf binary structure');

    const res = await request(app)
      .post('/api/v1/documents/upload-pdf')
      .set('Authorization', `Bearer ${testToken}`)
      .attach('file', fakePdfBuffer, { filename: 'malicious.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('signature');
  });
});
