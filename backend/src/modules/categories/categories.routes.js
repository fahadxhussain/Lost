const express = require('express');
const router = express.Router();
const categoriesController = require('./categories.controller');

router.get('/', categoriesController.getAllCategories);

module.exports = router;
