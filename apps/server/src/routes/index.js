const express = require('express');
const router = express.Router();

router.use('/categories', require('./category.routes'));
router.use('/items', require('./item.routes'));
router.use('/menus', require('./menu.routes'));
router.use('/packages', require('./package.routes'));

module.exports = router;