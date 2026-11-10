const searchService = require('./search.service');

async function searchReports(req, res, next) {
  try {
    const result = await searchService.searchReports(req.query);
    return res.status(200).json({
      status: 'success',
      data: result.reports,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchReports,
};
