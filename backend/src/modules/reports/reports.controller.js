const reportsService = require('./reports.service');
const { getPublicImageUrl } = require('../../services/storage/storageService');

async function createReport(req, res, next) {
  try {
    const { type, categoryId, title, description, incidentLocation, incidentDate } = req.body;
    let imageUrl = req.body.imageUrl || null;

    if (req.file) {
      imageUrl = await getPublicImageUrl(req, req.file.filename);
    }

    const result = await reportsService.createReport({
      userId: req.user.id,
      type,
      categoryId,
      title,
      description,
      imageUrl,
      incidentLocation,
      incidentDate,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Report created successfully and queued for potential matching',
      data: result.report,
      matchingJobId: result.matchingJobId,
    });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const result = await reportsService.getReports(req.query);
    return res.status(200).json({
      status: 'success',
      data: result.reports,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function getReportById(req, res, next) {
  try {
    const report = await reportsService.getReportById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyReports(req, res, next) {
  try {
    const reports = await reportsService.getMyReports(req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data: reports,
    });
  } catch (error) {
    next(error);
  }
}

async function updateReport(req, res, next) {
  try {
    let imageUrl = req.body.imageUrl;
    if (req.file) {
      imageUrl = await getPublicImageUrl(req, req.file.filename);
    }

    const updated = await reportsService.updateReport(req.params.id, req.user.id, {
      ...req.body,
      ...(imageUrl && { imageUrl }),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Report updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function updateReportStatus(req, res, next) {
  try {
    const { status } = req.body;
    const updated = await reportsService.updateReportStatus(req.params.id, req.user.id, status);

    return res.status(200).json({
      status: 'success',
      message: `Report status updated to ${updated.status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function getMatches(req, res, next) {
  try {
    const matches = await reportsService.getMatches(req.params.id, req.user.id);
    return res.status(200).json({
      status: 'success',
      data: matches,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  getReports,
  getReportById,
  getMyReports,
  updateReport,
  updateReportStatus,
  getMatches,
};
