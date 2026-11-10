const prisma = require('../../config/prisma');
const { Prisma } = require('@prisma/client');

class CandidateRetrievalService {
  /**
   * Shortlists active opposite-type candidates for a given source report using
   * PostgreSQL filtering and pg_trgm similarity. NEVER calls Gemini.
   */
  async findCandidatesForReport(sourceReportId, maxCandidates = 5) {
    const source = await prisma.report.findUnique({
      where: { id: sourceReportId },
      include: { category: true },
    });

    if (!source || source.status !== 'ACTIVE') {
      return [];
    }

    const oppositeType = source.type === 'LOST' ? 'FOUND' : 'LOST';
    const isSourceLost = source.type === 'LOST';

    // Find candidate IDs already dismissed in PotentialMatch
    const dismissedMatches = await prisma.potentialMatch.findMany({
      where: {
        ...(isSourceLost
          ? { lostReportId: source.id, status: 'DISMISSED' }
          : { foundReportId: source.id, status: 'DISMISSED' }),
      },
      select: {
        lostReportId: true,
        foundReportId: true,
      },
    });

    const excludedIds = dismissedMatches.map((m) =>
      isSourceLost ? m.foundReportId : m.lostReportId
    );
    excludedIds.push(source.id);

    // Retrieve active opposite candidates in same category using pg_trgm
    const rawCandidates = await prisma.$queryRaw`
      SELECT 
        r.id,
        r.type,
        r.category_id,
        r.title,
        r.description,
        r.image_url,
        r.incident_location,
        r.incident_date,
        r.status,
        r.created_at,
        r.user_id,
        c.name AS "category_name",
        c.slug AS "category_slug",
        (
          similarity(r.title, ${source.title}) * 0.4 +
          similarity(r.description, ${source.description}) * 0.6
        ) AS text_similarity_score
      FROM reports r
      JOIN categories c ON r.category_id = c.id
      WHERE r.type = ${oppositeType}::"ReportType"
        AND r.status = 'ACTIVE'::"ReportStatus"
        AND r.category_id = ${source.categoryId}
        AND r.user_id != ${source.userId}
        AND r.id NOT IN (${Prisma.join(excludedIds)})
      ORDER BY text_similarity_score DESC, r.created_at DESC
      LIMIT ${maxCandidates};
    `;

    return rawCandidates.map((row) => ({
      id: row.id,
      type: row.type,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categorySlug: row.category_slug,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      incidentLocation: row.incident_location,
      incidentDate: row.incident_date,
      status: row.status,
      createdAt: row.created_at,
      userId: row.user_id,
      textSimilarityScore: parseFloat(row.text_similarity_score || '0'),
    }));
  }
}

module.exports = new CandidateRetrievalService();
