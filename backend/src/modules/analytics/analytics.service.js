const prisma = require('../../config/prisma');

class AnalyticsService {
  async getCampusOverviewStats() {
    const [
      totalUsers,
      totalReports,
      lostReports,
      foundReports,
      activeReports,
      resolvedReports,
      closedReports,
      potentialMatches,
      pendingJobs,
      categoriesWithCount,
      recentResolved,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count(),
      prisma.report.count({ where: { type: 'LOST' } }),
      prisma.report.count({ where: { type: 'FOUND' } }),
      prisma.report.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'CLOSED' } }),
      prisma.potentialMatch.findMany({
        select: { score: true },
      }),
      prisma.matchingJob.count({ where: { status: 'QUEUED' } }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          _count: {
            select: { reports: true },
          },
        },
        orderBy: {
          reports: { _count: 'desc' },
        },
      }),
      prisma.report.findMany({
        where: { status: 'RESOLVED' },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          incidentLocation: true,
          updatedAt: true,
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);

    // Calculate AI matching metrics
    const matchScores = potentialMatches.map((m) => m.score);
    const avgScore =
      matchScores.length > 0
        ? Math.round((matchScores.reduce((a, b) => a + b, 0) / matchScores.length) * 100) / 100
        : 0;
    const highConfidenceMatches = matchScores.filter((s) => s >= 0.8).length;

    // Calculate resolution rate
    const totalFinished = resolvedReports + closedReports;
    const resolutionRate =
      totalReports > 0 ? Math.round((resolvedReports / totalReports) * 1000) / 10 : 0;

    return {
      campus: 'COMSATS University Islamabad',
      summary: {
        activeStudents: totalUsers,
        totalReportsFiled: totalReports,
        resolvedRecoveries: resolvedReports,
        resolutionRatePercentage: resolutionRate,
      },
      reportsBreakdown: {
        lost: lostReports,
        found: foundReports,
        active: activeReports,
        resolved: resolvedReports,
        closed: closedReports,
      },
      aiMatchingIntelligence: {
        totalPotentialMatchesGenerated: matchScores.length,
        averageConfidenceScore: avgScore,
        highConfidenceMatchesCount: highConfidenceMatches,
        pendingEvaluationsInQueue: pendingJobs,
      },
      categoryDistribution: categoriesWithCount.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        reportsCount: c._count.reports,
      })),
      recentResolvedRecoveries: recentResolved,
    };
  }
}

module.exports = new AnalyticsService();
