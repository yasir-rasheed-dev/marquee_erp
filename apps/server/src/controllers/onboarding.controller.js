// controllers/onboarding.controller.js
// Setup-progress counts for the Onboarding page in a single request.
// (The page used to download 10 full lists — every booking, item, etc. — just to count them.)
const prisma = require('../config/database');

// @route GET /api/onboarding/status?branchId=
const getOnboardingStatus = async (req, res) => {
  try {
    const branchId = parseInt(req.query.branchId || req.branchId, 10);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    const active = { branchId, deletedAt: null };

    const [halls, accounts, events, units, rawMaterials, menuItems, recipes, services, packages, bookings] =
      await Promise.all([
        prisma.hall.count({ where: active }),
        prisma.bankAccount.count({ where: { branchId } }),
        prisma.event.count({ where: active }),
        prisma.unit.count({ where: { branchId } }),
        prisma.inventoryItem.count({ where: active }),
        prisma.item.count({ where: active }),
        prisma.recipeIngredient.count({ where: { item: { branchId, deletedAt: null } } }),
        prisma.service.count({ where: active }),
        prisma.package.count({ where: active }),
        prisma.booking.count({ where: active }),
      ]);

    res.json({
      success: true,
      data: { halls, accounts, events, units, rawMaterials, menuItems, recipes, services, packages, bookings },
    });
  } catch (error) {
    console.error('❌ Onboarding status error:', error);
    res.status(500).json({ success: false, message: 'Failed to load onboarding status' });
  }
};

module.exports = { getOnboardingStatus };
