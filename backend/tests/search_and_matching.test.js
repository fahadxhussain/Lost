const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const candidateRetrievalService = require('../src/modules/matching/candidateRetrieval.service');

describe('COMSATS Lost & Found - Search & Candidate Retrieval Module', () => {
  let user1, user2;
  let mobileCat, chargerCat;
  let lostPhoneReport, foundPhoneReport, foundChargerReport;

  beforeAll(async () => {
    // Clean up previous test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-201@isbstudent.comsats.edu.pk', 'sp23-bse-202@isbstudent.comsats.edu.pk'],
        },
      },
    });

    mobileCat = await prisma.category.findUnique({ where: { slug: 'mobile-phone' } });
    chargerCat = await prisma.category.findUnique({ where: { slug: 'laptop-charger' } });

    user1 = await prisma.user.create({
      data: {
        email: 'sp23-bse-201@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Student One',
        status: 'ACTIVE',
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'sp23-bse-202@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Student Two',
        status: 'ACTIVE',
      },
    });

    // 1. Found report submitted EARLIER (10:00 AM) by user 2
    foundPhoneReport = await prisma.report.create({
      data: {
        userId: user2.id,
        type: 'FOUND',
        categoryId: mobileCat.id,
        title: 'Found black Samsung phone in library',
        description: 'Found a black Samsung smartphone on table 12 in the Central Library 1st floor.',
        incidentLocation: 'Central Library',
        incidentDate: new Date('2026-11-10T09:00:00Z'),
        status: 'ACTIVE',
      },
    });

    // 2. Found charger report submitted by user 2
    foundChargerReport = await prisma.report.create({
      data: {
        userId: user2.id,
        type: 'FOUND',
        categoryId: chargerCat.id,
        title: 'Found HP Blue Tip 65W Laptop Charger',
        description: 'Found an original HP blue tip charger near the projector in CS Block Room 104.',
        incidentLocation: 'CS Block Room 104',
        incidentDate: new Date('2026-11-10T08:30:00Z'),
        status: 'ACTIVE',
      },
    });

    // 3. Lost report submitted LATER (11:00 AM) by user 1 (incident occurred at 08:45 AM)
    lostPhoneReport = await prisma.report.create({
      data: {
        userId: user1.id,
        type: 'LOST',
        categoryId: mobileCat.id,
        title: 'Lost Samsung Smartphone in Library',
        description: 'Lost my black Samsung phone while studying in the central library near the bookshelves.',
        incidentLocation: 'Central Library',
        incidentDate: new Date('2026-11-10T08:45:00Z'),
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sp23-bse-201@isbstudent.comsats.edu.pk', 'sp23-bse-202@isbstudent.comsats.edu.pk'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/search (PostgreSQL Keyword & Trigram Search)', () => {
    it('should find reports using exact keywords', async () => {
      const res = await request(app).get('/api/v1/search?query=Samsung');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.some((r) => r.id === lostPhoneReport.id)).toBe(true);
    });

    it('should find reports with typos using pg_trgm fuzzy matching ("samsng")', async () => {
      const res = await request(app).get('/api/v1/search?query=samsng');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.some((r) => r.title.includes('Samsung'))).toBe(true);
    });

    it('should filter search results by type (FOUND only)', async () => {
      const res = await request(app).get('/api/v1/search?query=Samsung&type=FOUND');
      expect(res.status).toBe(200);
      expect(res.body.data.every((r) => r.type === 'FOUND')).toBe(true);
      expect(res.body.data.some((r) => r.id === foundPhoneReport.id)).toBe(true);
      expect(res.body.data.some((r) => r.id === lostPhoneReport.id)).toBe(false);
    });

    it('should also work on /api/v1/reports/search', async () => {
      const res = await request(app).get('/api/v1/reports/search?query=Charger');
      expect(res.status).toBe(200);
      expect(res.body.data.some((r) => r.id === foundChargerReport.id)).toBe(true);
    });
  });

  describe('Candidate Retrieval Service (Algorithmic Shortlist)', () => {
    it('should shortlist opposite-type reports (LOST retrieves FOUND phone)', async () => {
      const candidates = await candidateRetrievalService.findCandidatesForReport(lostPhoneReport.id);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);

      const match = candidates.find((c) => c.id === foundPhoneReport.id);
      expect(match).toBeDefined();
      expect(match.type).toBe('FOUND');
      expect(match.textSimilarityScore).toBeGreaterThan(0.2);
    });

    it('should enforce distinct categories (Lost Phone never shortlists Found Charger)', async () => {
      const candidates = await candidateRetrievalService.findCandidatesForReport(lostPhoneReport.id);
      const chargerMatch = candidates.find((c) => c.id === foundChargerReport.id);
      expect(chargerMatch).toBeUndefined();
    });

    it('should respect chronological decoupling: earlier submitted report is shortlisted for later submission', async () => {
      // foundPhoneReport was created BEFORE lostPhoneReport
      // But lostPhoneReport must still find foundPhoneReport as a candidate!
      const candidates = await candidateRetrievalService.findCandidatesForReport(lostPhoneReport.id);
      expect(candidates.some((c) => c.id === foundPhoneReport.id)).toBe(true);
    });

    it('should work symmetrically (FOUND phone shortlists LOST phone)', async () => {
      const candidates = await candidateRetrievalService.findCandidatesForReport(foundPhoneReport.id);
      expect(candidates.some((c) => c.id === lostPhoneReport.id)).toBe(true);
    });
  });
});
