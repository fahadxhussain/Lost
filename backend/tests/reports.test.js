const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authService = require('../src/modules/auth/auth.service');

describe('COMSATS Lost & Found - Reports Module', () => {
  let student1Token;
  let student1User;
  let student2Token;
  let student2User;
  let mobilePhoneCategory;
  let laptopChargerCategory;
  let createdReportId;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-101@isbstudent.comsats.edu.pk', 'sp23-bse-102@isbstudent.comsats.edu.pk'],
        },
      },
    });

    // Fetch seeded categories
    mobilePhoneCategory = await prisma.category.findUnique({
      where: { slug: 'mobile-phone' },
    });
    laptopChargerCategory = await prisma.category.findUnique({
      where: { slug: 'laptop-charger' },
    });

    // Register and activate Student 1
    const s1 = await authService.register({
      email: 'sp23-bse-101@isbstudent.comsats.edu.pk',
      password: 'Password123!',
      name: 'Fahad Report Tester 1',
    });
    const otp1 = await prisma.emailVerificationOtp.findFirst({
      where: { userId: s1.userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    // Manually activate
    student1User = await prisma.user.update({
      where: { id: s1.userId },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    student1Token = authService.generateToken(student1User);

    // Register and activate Student 2
    const s2 = await authService.register({
      email: 'sp23-bse-102@isbstudent.comsats.edu.pk',
      password: 'Password123!',
      name: 'Fahad Report Tester 2',
    });
    student2User = await prisma.user.update({
      where: { id: s2.userId },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    student2Token = authService.generateToken(student2User);
  });

  afterAll(async () => {
    // Clean up test users and their cascade reports
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-101@isbstudent.comsats.edu.pk', 'sp23-bse-102@isbstudent.comsats.edu.pk'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/reports (Validation & Constraints)', () => {
    it('should reject report creation without category', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          type: 'LOST',
          title: 'Lost phone in lab',
          description: 'Left my black Samsung Galaxy S23 on desk 4 in Lab 2',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Category is mandatory/i);
    });

    it('should reject report creation without description (photo-only forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          type: 'LOST',
          categoryId: mobilePhoneCategory.id,
          title: 'Lost phone',
          description: '', // empty description
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Description is mandatory/i);
    });

    it('should reject report creation if description is too short (< 10 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          type: 'LOST',
          categoryId: mobilePhoneCategory.id,
          title: 'Lost phone',
          description: 'lost it',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 10 characters/i);
    });

    it('should successfully create a LOST report and automatically queue a matching job', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          type: 'LOST',
          categoryId: mobilePhoneCategory.id,
          title: 'Black Samsung Galaxy S23',
          description: 'Lost my black Samsung Galaxy S23 with a cracked screen protector in CS Block Lab 2.',
          incidentLocation: 'CS Block Lab 2',
          incidentDate: new Date('2026-11-10T09:30:00Z').toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.matchingJobId).toBeDefined();

      createdReportId = res.body.data.id;

      // Verify MatchingJob was created in DB
      const job = await prisma.matchingJob.findFirst({
        where: { sourceReportId: createdReportId },
      });
      expect(job).toBeDefined();
      expect(job.status).toBe('QUEUED');
    });

    it('should successfully create a FOUND report for Laptop Charger', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          type: 'FOUND',
          categoryId: laptopChargerCategory.id,
          title: 'Dell 65W Type-C Charger',
          description: 'Found a black Dell laptop charger left plugged in near the power socket in Library 2nd floor.',
          incidentLocation: 'Central Library 2nd Floor',
          incidentDate: new Date('2026-11-10T10:00:00Z').toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.type).toBe('FOUND');
    });
  });

  describe('GET /api/v1/reports (Feed & Filtering)', () => {
    it('should list active reports', async () => {
      const res = await request(app).get('/api/v1/reports');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by report type (LOST vs FOUND)', async () => {
      const res = await request(app).get('/api/v1/reports?type=LOST');
      expect(res.status).toBe(200);
      expect(res.body.data.every((r) => r.type === 'LOST')).toBe(true);
    });

    it('should filter by categoryId', async () => {
      const res = await request(app).get(`/api/v1/reports?categoryId=${mobilePhoneCategory.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((r) => r.categoryId === mobilePhoneCategory.id)).toBe(true);
    });
  });

  describe('GET /api/v1/reports/me', () => {
    it('should return reports created by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/reports/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((r) => r.id === createdReportId)).toBe(true);
    });
  });

  describe('PATCH /api/v1/reports/:id (Ownership & Updates)', () => {
    it('should prevent student 2 from editing student 1 report', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only edit your own reports/i);
    });

    it('should allow student 1 to update their own report description', async () => {
      const updatedDesc = 'Updated: Black Samsung Galaxy S23 with a blue case and cracked protector';
      const res = await request(app)
        .patch(`/api/v1/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          description: updatedDesc,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe(updatedDesc);
    });
  });

  describe('PATCH /api/v1/reports/:id/status (Resolution & Exclusion)', () => {
    it('should allow owner to mark report as RESOLVED', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/${createdReportId}/status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          status: 'RESOLVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RESOLVED');
    });

    it('should exclude RESOLVED report from active reports feed', async () => {
      const res = await request(app).get('/api/v1/reports');
      expect(res.status).toBe(200);
      expect(res.body.data.some((r) => r.id === createdReportId)).toBe(false);
    });
  });
});
