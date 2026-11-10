const prisma = require('../../config/prisma');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require('../../shared/errors/AppError');

class ReportsService {
  async createReport({
    userId,
    type,
    categoryId,
    title,
    description,
    imageUrl,
    incidentLocation,
    incidentDate,
  }) {
    if (!type || !['LOST', 'FOUND'].includes(type.toUpperCase())) {
      throw new BadRequestError('Report type must be either LOST or FOUND');
    }

    if (!categoryId) {
      throw new BadRequestError('Category is mandatory');
    }

    if (!description || description.trim().length === 0) {
      throw new BadRequestError('Description is mandatory. Photo-only reports are not permitted.');
    }

    if (description.trim().length < 10) {
      throw new BadRequestError('Description must be at least 10 characters long to aid identification');
    }

    // Verify category exists in DB
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestError('Invalid category ID provided');
    }

    // Parse incident date if provided
    let parsedIncidentDate = null;
    if (incidentDate) {
      parsedIncidentDate = new Date(incidentDate);
      if (isNaN(parsedIncidentDate.getTime())) {
        throw new BadRequestError('Invalid incidentDate format. Expected ISO-8601 date string.');
      }
    }

    const reportTitle = title && title.trim().length > 0 ? title.trim() : `${category.name} (${type.toUpperCase()})`;

    // Create report and automatically queue a matching job in a transaction
    const [report, matchingJob] = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.report.create({
        data: {
          userId,
          type: type.toUpperCase(),
          categoryId,
          title: reportTitle,
          description: description.trim(),
          imageUrl: imageUrl || null,
          incidentLocation: incidentLocation ? incidentLocation.trim() : null,
          incidentDate: parsedIncidentDate,
          status: 'ACTIVE',
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          user: {
            select: { id: true, name: true, rollNumber: true },
          },
        },
      });

      // Enqueue background matching job for this report
      const job = await tx.matchingJob.create({
        data: {
          sourceReportId: createdReport.id,
          status: 'QUEUED',
        },
      });

      return [createdReport, job];
    });

    return {
      report,
      matchingJobId: matchingJob.id,
    };
  }

  async getReports({ type, categoryId, status = 'ACTIVE', page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where = {};

    if (status && ['ACTIVE', 'RESOLVED', 'CLOSED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (type && ['LOST', 'FOUND'].includes(type.toUpperCase())) {
      where.type = type.toUpperCase();
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          user: {
            select: { id: true, name: true, rollNumber: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page: pageNum,
        limit: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getReportById(id) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        user: {
          select: { id: true, name: true, rollNumber: true },
        },
        _count: {
          select: {
            lostMatches: true,
            foundMatches: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return report;
  }

  async getMyReports(userId, { status } = {}) {
    const where = { userId };
    if (status && ['ACTIVE', 'RESOLVED', 'CLOSED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        _count: {
          select: {
            lostMatches: true,
            foundMatches: true,
          },
        },
      },
    });

    return reports;
  }

  async updateReport(id, userId, { title, description, incidentLocation, incidentDate, imageUrl }) {
    const existing = await prisma.report.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Report not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError('You can only edit your own reports');
    }

    if (existing.status !== 'ACTIVE') {
      throw new BadRequestError('Cannot edit reports that are already marked as resolved or closed');
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) {
      if (description.trim().length < 10) {
        throw new BadRequestError('Description must be at least 10 characters long');
      }
      data.description = description.trim();
    }
    if (incidentLocation !== undefined) data.incidentLocation = incidentLocation ? incidentLocation.trim() : null;
    if (incidentDate !== undefined) {
      data.incidentDate = incidentDate ? new Date(incidentDate) : null;
    }
    if (imageUrl !== undefined) data.imageUrl = imageUrl;

    const updated = await prisma.report.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    return updated;
  }

  async updateReportStatus(id, userId, status) {
    if (!status || !['ACTIVE', 'RESOLVED', 'CLOSED'].includes(status.toUpperCase())) {
      throw new BadRequestError('Status must be ACTIVE, RESOLVED, or CLOSED');
    }

    const existing = await prisma.report.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Report not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError('You can only update the status of your own reports');
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status: status.toUpperCase() },
      include: {
        category: true,
      },
    });

    return updated;
  }

  async getMatches(reportId, userId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Query potential matches where this report is either lostReportId or foundReportId
    const isLost = report.type === 'LOST';

    const matches = await prisma.potentialMatch.findMany({
      where: isLost ? { lostReportId: reportId } : { foundReportId: reportId },
      orderBy: { score: 'desc' },
      include: {
        lostReport: {
          include: {
            category: true,
            user: { select: { id: true, name: true, rollNumber: true } },
          },
        },
        foundReport: {
          include: {
            category: true,
            user: { select: { id: true, name: true, rollNumber: true } },
          },
        },
      },
    });

    // Format so candidate report is always the opposite item
    return matches.map((m) => {
      const candidateReport = isLost ? m.foundReport : m.lostReport;
      return {
        matchId: m.id,
        score: m.score,
        aiReasoning: m.aiReasoning,
        status: m.status,
        createdAt: m.createdAt,
        candidateReport: {
          id: candidateReport.id,
          type: candidateReport.type,
          title: candidateReport.title,
          description: candidateReport.description,
          imageUrl: candidateReport.imageUrl,
          incidentLocation: candidateReport.incidentLocation,
          incidentDate: candidateReport.incidentDate,
          status: candidateReport.status,
          category: candidateReport.category,
          owner: candidateReport.user,
        },
      };
    });
  }
}

module.exports = new ReportsService();
