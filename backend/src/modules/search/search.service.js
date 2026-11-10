const prisma = require('../../config/prisma');
const { Prisma } = require('@prisma/client');

class SearchService {
  async searchReports({
    query,
    type,
    categoryId,
    status = 'ACTIVE',
    startDate,
    endDate,
    page = 1,
    limit = 20,
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * take;

    const trimmedQuery = query ? query.trim() : '';

    // If query is empty, do a standard filtered findMany
    if (!trimmedQuery) {
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
      if (startDate || endDate) {
        where.incidentDate = {};
        if (startDate) where.incidentDate.gte = new Date(startDate);
        if (endDate) where.incidentDate.lte = new Date(endDate);
      }

      const [reports, totalCount] = await Promise.all([
        prisma.report.findMany({
          where,
          skip: offset,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true, slug: true, icon: true } },
            user: { select: { id: true, name: true, rollNumber: true } },
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

    // Pure PostgreSQL Full-Text & pg_trgm Search Query (NEVER calls Gemini)
    const statusVal = status ? status.toUpperCase() : 'ACTIVE';
    const typeCondition = type ? Prisma.sql`AND r.type = ${type.toUpperCase()}::"ReportType"` : Prisma.empty;
    const categoryCondition = categoryId ? Prisma.sql`AND r.category_id = ${categoryId}` : Prisma.empty;

    // Use pg_trgm similarity and word similarity for typo tolerance
    const rawReports = await prisma.$queryRaw`
      SELECT 
        r.id,
        r.type,
        r.title,
        r.description,
        r.image_url,
        r.incident_location,
        r.incident_date,
        r.status,
        r.created_at,
        r.updated_at,
        c.id AS "category_id",
        c.name AS "category_name",
        c.slug AS "category_slug",
        c.icon AS "category_icon",
        u.id AS "user_id",
        u.name AS "user_name",
        u.roll_number AS "user_roll_number",
        GREATEST(
          similarity(r.title, ${trimmedQuery}),
          similarity(r.description, ${trimmedQuery}),
          word_similarity(${trimmedQuery}, r.title),
          word_similarity(${trimmedQuery}, r.description)
        ) AS relevance_score
      FROM reports r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.user_id = u.id
      WHERE r.status = ${statusVal}::"ReportStatus"
        ${typeCondition}
        ${categoryCondition}
        AND (
          r.title ILIKE ${`%${trimmedQuery}%`}
          OR r.description ILIKE ${`%${trimmedQuery}%`}
          OR similarity(r.title, ${trimmedQuery}) > 0.15
          OR similarity(r.description, ${trimmedQuery}) > 0.15
          OR word_similarity(${trimmedQuery}, r.title) > 0.25
          OR word_similarity(${trimmedQuery}, r.description) > 0.25
        )
      ORDER BY relevance_score DESC, r.created_at DESC
      LIMIT ${take} OFFSET ${offset};
    `;

    // Map raw sql results into clean objects
    const reports = rawReports.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      incidentLocation: row.incident_location,
      incidentDate: row.incident_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      relevanceScore: parseFloat(row.relevance_score || '0'),
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
        icon: row.category_icon,
      },
      user: {
        id: row.user_id,
        name: row.user_name,
        rollNumber: row.user_roll_number,
      },
    }));

    return {
      reports,
      pagination: {
        page: pageNum,
        limit: take,
        count: reports.length,
      },
    };
  }
}

module.exports = new SearchService();
