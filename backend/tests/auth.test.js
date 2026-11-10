const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('COMSATS Lost & Found - Auth & Category Module', () => {
  const testStudent = {
    email: 'sp23-bse-999@isbstudent.comsats.edu.pk',
    password: 'SecurePassword123!',
    name: 'Fahad Test Student',
  };

  let userId;
  let devOtp;
  let authToken;

  beforeAll(async () => {
    // Clean up test student from DB if existed
    await prisma.user.deleteMany({
      where: { email: testStudent.email },
    });
  });

  afterAll(async () => {
    // Clean up test student after tests
    await prisma.user.deleteMany({
      where: { email: testStudent.email },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/categories', () => {
    it('should return categories seeded from PostgreSQL with distinct Mobile Phone & Laptop Charger', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);

      const slugs = res.body.data.map((c) => c.slug);
      expect(slugs).toContain('mobile-phone');
      expect(slugs).toContain('laptop-charger');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject non-COMSATS email addresses', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'attacker@gmail.com',
        password: 'Password123!',
        name: 'Non Student',
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/COMSATS university email/i);
    });

    it('should register a valid COMSATS student email and send OTP', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testStudent);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.userId).toBeDefined();

      userId = res.body.data.userId;
      devOtp = res.body.data.devOtp;

      // Verify in DB that user was created with PENDING_VERIFICATION and auto-extracted roll number
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).toBeDefined();
      expect(user.status).toBe('PENDING_VERIFICATION');
      expect(user.rollNumber).toBe('SP23-BSE-999');
    });
  });

  describe('POST /api/v1/auth/login (Unverified)', () => {
    it('should block login when account is still pending verification', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudent.email,
        password: testStudent.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not yet verified/i);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should reject invalid OTP', async () => {
      const res = await request(app).post('/api/v1/auth/verify-otp').send({
        userId,
        otp: '000000',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid verification code/i);
    });

    it('should activate user account with valid OTP', async () => {
      const res = await request(app).post('/api/v1/auth/verify-otp').send({
        userId,
        otp: devOtp,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.status).toBe('ACTIVE');

      // Verify in DB
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user.status).toBe('ACTIVE');
      expect(user.emailVerifiedAt).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/login (Verified)', () => {
    it('should successfully log in after account verification', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudent.email,
        password: testStudent.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testStudent.email);

      authToken = res.body.data.token;
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return authenticated user profile with Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.id).toBe(userId);
      expect(res.body.data.user.status).toBe('ACTIVE');
    });

    it('should reject request without Bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
