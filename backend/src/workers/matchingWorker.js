const prisma = require('../config/prisma');
const candidateRetrievalService = require('../modules/matching/candidateRetrieval.service');
const geminiService = require('../services/ai/geminiService');
const logger = require('../shared/logger');

class MatchingWorker {
  constructor() {
    this.isRunning = false;
    this.pollIntervalMs = 3000;
  }

  /**
   * Process a single queued job. Exported for standalone execution and integration tests.
   */
  async processNextJob() {
    // Atomically find and lock the oldest queued job
    const job = await prisma.matchingJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    });

    if (!job) {
      return null;
    }

    // Mark as PROCESSING
    await prisma.matchingJob.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      const sourceReport = await prisma.report.findUnique({
        where: { id: job.sourceReportId },
        include: { category: true, user: true },
      });

      // If report was resolved or deleted while job was in queue, safely complete
      if (!sourceReport || sourceReport.status !== 'ACTIVE') {
        logger.info(`[Worker] Source report ${job.sourceReportId} is no longer active. Completing job.`);
        return await prisma.matchingJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      // Step 1: Inexpensive algorithmic candidate retrieval (pure SQL, no Gemini)
      const candidates = await candidateRetrievalService.findCandidatesForReport(sourceReport.id);

      if (candidates.length === 0) {
        logger.info(`[Worker] No eligible candidate reports found for report ${sourceReport.id}.`);
        return await prisma.matchingJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      logger.info(
        `[Worker] Found ${candidates.length} candidate(s) for report ${sourceReport.id}. Evaluating with Gemini...`
      );

      // Step 2: Asynchronous Gemini AI evaluation for each shortlisted pair
      for (const candidate of candidates) {
        const evaluation = await geminiService.evaluateMatch(sourceReport, candidate);

        if (evaluation.score >= 0.5) {
          const isSourceLost = sourceReport.type === 'LOST';
          const lostReportId = isSourceLost ? sourceReport.id : candidate.id;
          const foundReportId = isSourceLost ? candidate.id : sourceReport.id;
          const lostOwnerId = isSourceLost ? sourceReport.userId : candidate.userId;
          const foundOwnerId = isSourceLost ? candidate.userId : sourceReport.userId;

          // Upsert PotentialMatch record (prevents duplicates)
          const match = await prisma.potentialMatch.upsert({
            where: {
              lostReportId_foundReportId: {
                lostReportId,
                foundReportId,
              },
            },
            update: {
              score: evaluation.score,
              aiReasoning: evaluation.reasoning,
            },
            create: {
              lostReportId,
              foundReportId,
              score: evaluation.score,
              aiReasoning: evaluation.reasoning,
              status: 'PENDING',
            },
          });

          // Step 3: Create notifications for both report owners
          await prisma.notification.createMany({
            data: [
              {
                userId: lostOwnerId,
                type: 'POTENTIAL_MATCH',
                title: 'Potential Match Found!',
                body: `We found a possible match for your lost ${sourceReport.category.name}: "${candidate.title}". AI confidence: ${Math.round(evaluation.score * 100)}%`,
                metadata: { matchId: match.id, oppositeReportId: foundReportId },
              },
              {
                userId: foundOwnerId,
                type: 'POTENTIAL_MATCH',
                title: 'Potential Owner Identified!',
                body: `Someone reported losing an item matching what you found: "${sourceReport.title}". AI confidence: ${Math.round(evaluation.score * 100)}%`,
                metadata: { matchId: match.id, oppositeReportId: lostReportId },
              },
            ],
          });

          logger.info(
            `[Worker] Potential match created (Score: ${evaluation.score}) between ${lostReportId} and ${foundReportId}`
          );
        }
      }

      // Mark job COMPLETED
      const completedJob = await prisma.matchingJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return completedJob;
    } catch (error) {
      logger.error(`[Worker] Failed to process job ${job.id}: ${error.message}`, error);

      const maxRetries = 3;
      const willRetry = job.attempts + 1 < maxRetries;

      return await prisma.matchingJob.update({
        where: { id: job.id },
        data: {
          status: willRetry ? 'QUEUED' : 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  async startWorker() {
    this.isRunning = true;
    logger.info('Matching Queue Worker started. Listening for background jobs...');

    while (this.isRunning) {
      try {
        const processed = await this.processNextJob();
        if (!processed) {
          // No jobs in queue, wait before next poll
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (err) {
        logger.error(`[Worker] Error in polling loop: ${err.message}`, err);
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  stop() {
    this.isRunning = false;
    logger.info('Matching Queue Worker stopping gracefully...');
  }
}

const workerInstance = new MatchingWorker();

// If run directly via node matchingWorker.js
if (require.main === module) {
  workerInstance.startWorker();

  process.on('SIGINT', () => {
    workerInstance.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    workerInstance.stop();
    process.exit(0);
  });
}

module.exports = workerInstance;
