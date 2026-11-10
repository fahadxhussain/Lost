const prisma = require('../../config/prisma');
const { INITIAL_CATEGORIES } = require('../../constants/categories');
const logger = require('../../shared/logger');

async function getAllCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: categories,
    });
  } catch (error) {
    // If DB is offline in development, fallback gracefully to seed categories
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Database offline or unmigrated; returning default static categories for development.');
      return res.status(200).json({
        status: 'success',
        source: 'static_fallback',
        data: INITIAL_CATEGORIES,
      });
    }
    next(error);
  }
}

module.exports = {
  getAllCategories,
};
