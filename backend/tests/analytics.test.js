const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('COMSATS Lost & Found - Campus Analytics & Overview', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/stats', () => {
    it('should return real-time campus statistics and AI matching intelligence overview', async () => {
      const res = await request(app).get('/api/v1/stats');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();

      const data = res.body.data;
      expect(data.campus).toBe('COMSATS University Islamabad');

      // Summary checks
      expect(data.summary).toBeDefined();
      expect(typeof data.summary.activeStudents).toBe('number');
      expect(typeof data.summary.totalReportsFiled).toBe('number');
      expect(typeof data.summary.resolvedRecoveries).toBe('number');
      expect(typeof data.summary.resolutionRatePercentage).toBe('number');

      // Breakdown checks
      expect(data.reportsBreakdown).toBeDefined();
      expect(typeof data.reportsBreakdown.lost).toBe('number');
      expect(typeof data.reportsBreakdown.found).toBe('number');
      expect(typeof data.reportsBreakdown.active).toBe('number');
      expect(typeof data.reportsBreakdown.resolved).toBe('number');

      // AI Matching metrics
      expect(data.aiMatchingIntelligence).toBeDefined();
      expect(typeof data.aiMatchingIntelligence.totalPotentialMatchesGenerated).toBe('number');
      expect(typeof data.aiMatchingIntelligence.averageConfidenceScore).toBe('number');
      expect(typeof data.aiMatchingIntelligence.highConfidenceMatchesCount).toBe('number');
      expect(typeof data.aiMatchingIntelligence.pendingEvaluationsInQueue).toBe('number');

      // Category distribution checks
      expect(Array.isArray(data.categoryDistribution)).toBe(true);
      expect(data.categoryDistribution.length).toBeGreaterThan(0);
      expect(data.categoryDistribution[0]).toHaveProperty('name');
      expect(data.categoryDistribution[0]).toHaveProperty('reportsCount');

      // Recent resolved recoveries
      expect(Array.isArray(data.recentResolvedRecoveries)).toBe(true);
    });
  });
});
