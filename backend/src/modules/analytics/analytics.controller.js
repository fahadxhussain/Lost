const analyticsService = require('./analytics.service');

async function getOverviewStats(req, res, next) {
  try {
    const stats = await analyticsService.getCampusOverviewStats();
    return res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverviewStats,
};
