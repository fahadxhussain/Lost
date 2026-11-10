const { BadRequestError } = require('../../shared/errors/AppError');

async function createReport(req, res, next) {
  try {
    const { type, categoryId, title, description, incidentLocation, incidentDate } = req.body;

    if (!type || !categoryId || !description) {
      throw new BadRequestError('Type (LOST/FOUND), categoryId, and description are mandatory');
    }

    if (!['LOST', 'FOUND'].includes(type.toUpperCase())) {
      throw new BadRequestError('Report type must be LOST or FOUND');
    }

    return res.status(201).json({
      status: 'success',
      data: {
        id: 'mock-report-uuid',
        type: type.toUpperCase(),
        categoryId,
        title: title || 'Untitled Report',
        description,
        incidentLocation: incidentLocation || null,
        incidentDate: incidentDate || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    return res.status(200).json({
      status: 'success',
      data: [],
    });
  } catch (error) {
    next(error);
  }
}

async function getMatches(req, res, next) {
  try {
    const { id } = req.params;
    return res.status(200).json({
      status: 'success',
      data: [],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  getReports,
  getMatches,
};
