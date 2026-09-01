// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authMiddleware, authorize } = require('../common/middleware/auth');

// ── Validation Rules ──
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'manager', 'cashier', 'staff']).withMessage('Invalid role'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
  body('companyId').optional().isInt().withMessage('Company ID must be an integer')
];

// ── PUBLIC ROUTES ──
router.post('/register', registerValidation, authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// ── PROTECTED ROUTES ──
router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authMiddleware, authController.logout);

// ── USER MANAGEMENT ROUTES ──
// GET all users (branch/company wise filtered)
router.get('/users', authMiddleware, authController.getUsers);

// GET users by company (Admin/Super Admin only)
router.get('/users/company/:companyId', authMiddleware, authorize('admin', 'super_admin'), authController.getUsersByCompany);

// Update user
router.put('/users/:id', authMiddleware, authController.updateUser);

// Delete user
router.delete('/users/:id', authMiddleware, authController.deleteUser);

module.exports = router;