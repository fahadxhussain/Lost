const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authService = require('../src/modules/auth/auth.service');
const matchingWorker = require('../src/workers/matchingWorker');

describe('COMSATS Lost & Found - Async Matching Worker & Notifications', () => {
  let studentLost, studentFound;
  let tokenLost, tokenFound;
  let chargerCategory;
  let lostReport, foundReport;
  let queuedJob;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-301@isbstudent.comsats.edu.pk', 'sp23-bse-302@isbstudent.comsats.edu.pk'],
        },
      },
    });

    chargerCategory = await prisma.category.findUnique({
      where: { slug: 'laptop-charger' },
    });

    // Create student who lost an item
    studentLost = await prisma.user.create({
      data: {
        email: 'sp23-bse-301@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Lost Item Owner',
        status: 'ACTIVE',
      },
    });
    tokenLost = authService.generateToken(studentLost);

    // Create student who found an item
    studentFound = await prisma.user.create({
      data: {
        email: 'sp23-bse-302@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Found Item Finder',
        status: 'ACTIVE',
      },
    });
    tokenFound = authService.generateToken(studentFound);

    // 1. Finder reports found charger first
    foundReport = await prisma.report.create({
      data: {
        userId: studentFound.id,
        type: 'FOUND',
        categoryId: chargerCategory.id,
        title: 'Dell 65W Laptop Charger Type-C',
        description: 'Found a genuine Dell 65W black Type-C charger in CS Lab 3 near PC 14.',
        incidentLocation: 'CS Department Lab 3',
        status: 'ACTIVE',
      },
    });

    // 2. Owner reports lost charger later (via API so MatchingJob is enqueued)
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${tokenLost}`)
      .send({
        type: 'LOST',
        categoryId: chargerCategory.id,
        title: 'Lost Dell 65W Type C Charger',
        description: 'Forgot my black Dell 65W USB-C laptop charger in CS Lab 3 yesterday evening.',
        incidentLocation: 'CS Block Lab 3',
      });

    expect(res.status).toBe(201);
    lostReport = res.body.data;
    queuedJob = await prisma.matchingJob.findFirst({
      where: { sourceReportId: lostReport.id },
    });
    expect(queuedJob).toBeDefined();
    expect(queuedJob.status).toBe('QUEUED');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-301@isbstudent.comsats.edu.pk', 'sp23-bse-302@isbstudent.comsats.edu.pk'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Asynchronous Worker Processing', () => {
    it('should pick up QUEUED job, execute candidate retrieval, run Gemini evaluation, and complete job', async () => {
      const processedJob = await matchingWorker.processNextJob();

      expect(processedJob).toBeDefined();
      expect(processedJob.id).toBe(queuedJob.id);
      expect(processedJob.status).toBe('COMPLETED');
      expect(processedJob.completedAt).not.toBeNull();
    });

    it('should have created a PotentialMatch in the database with score and AI rationale', async () => {
      const match = await prisma.potentialMatch.findUnique({
        where: {
          lostReportId_foundReportId: {
            lostReportId: lostReport.id,
            foundReportId: foundReport.id,
          },
        },
      });

      expect(match).toBeDefined();
      expect(match.score).toBeGreaterThanOrEqual(0.5);
      expect(match.aiReasoning).toBeDefined();
      expect(match.status).toBe('PENDING');
    });

    it('should have generated notifications for both the finder and owner', async () => {
      const lostNotifications = await prisma.notification.findMany({
        where: { userId: studentLost.id },
      });
      const foundNotifications = await prisma.notification.findMany({
        where: { userId: studentFound.id },
      });

      expect(lostNotifications.length).toBeGreaterThanOrEqual(1);
      expect(lostNotifications[0].type).toBe('POTENTIAL_MATCH');
      expect(lostNotifications[0].title).toMatch(/Potential Match Found/i);

      expect(foundNotifications.length).toBeGreaterThanOrEqual(1);
      expect(foundNotifications[0].type).toBe('POTENTIAL_MATCH');
      expect(foundNotifications[0].title).toMatch(/Potential Owner Identified/i);
    });

    it('should return safely when queue has no pending jobs', async () => {
      const nextJob = await matchingWorker.processNextJob();
      expect(nextJob).toBeNull();
    });
  });

  describe('GET /api/v1/reports/:id/matches (Potential Matches API)', () => {
    it('should return the potential match with candidate details and AI score', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/${lostReport.id}/matches`)
        .set('Authorization', `Bearer ${tokenLost}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstMatch = res.body.data[0];
      expect(firstMatch.score).toBeGreaterThanOrEqual(0.5);
      expect(firstMatch.candidateReport.id).toBe(foundReport.id);
      expect(firstMatch.candidateReport.title).toMatch(/Dell/i);
    });
  });

  describe('GET & PATCH /api/v1/notifications', () => {
    it('should retrieve student notifications and unread count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${tokenLost}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('should mark a notification as read', async () => {
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${tokenLost}`);

      const notifId = listRes.body.data[0].id;

      const patchRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${tokenLost}`);

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.isRead).toBe(true);
    });
  });
});
