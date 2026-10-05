// ═══════════════════════════════════════════════════════════
// controllers/service.controller.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_PRICING_TYPES = ['FIXED', 'HOURLY'];

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// ── Helper: Get Company ID from Branch ──
const getCompanyIdByBranch = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true }
  });
  return branch?.companyId || null;
};

// ── Helper: Validate pricing payload ──
const validatePricing = (pricingType, minimumHours, salePrice) => {
  const type = (pricingType || 'FIXED').toUpperCase();
  if (!VALID_PRICING_TYPES.includes(type)) {
    return { error: 'Invalid pricingType. Allowed: FIXED, HOURLY' };
  }
  const parsedSale = parseFloat(salePrice) || 0;
  if (parsedSale < 0) return { error: 'Price cannot be negative.' };

  let minHrs = null;
  if (type === 'HOURLY') {
    minHrs = parseInt(minimumHours);
    if (isNaN(minHrs) || minHrs < 1) minHrs = 1;
  }
  return { type, minHrs, parsedSale };
};

// ── GET ALL SERVICES (STRICT Branch-Wise + Search & Filters) ──
const getServices = async (req, res) => {
  try {
    const { search, isActive, category } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId, deletedAt: null };

    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search && search.trim() !== '') {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: search.trim()} },
          { description: { contains: search.trim()} },
          { code: { contains: search.trim()} },
        ]
      });
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
      branch: branchId
    });
  } catch (error) {
    console.error('getServices error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET SINGLE SERVICE ──
const getService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      }
    });

    if (!service || service.deletedAt) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (service.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This service belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error('getService error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── CREATE SERVICE ──
const createService = async (req, res) => {
  try {
    const {
      name, code, description, category,
      costPrice, salePrice, branchId, companyId,
      pricingType, minimumHours
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Service name is required.' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }
    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Validate pricing
    const pricing = validatePricing(pricingType, minimumHours, salePrice);
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    // Check duplicate name or code within the same company
    const existing = await prisma.service.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim()} },
          code ? { code: { equals: code.trim()} } : {}
        ],
        companyId: parseInt(targetCompanyId),
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Service with this name or code already exists in this company.'
      });
    }

    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        code: code?.trim() || `SRV-${Date.now().toString().slice(-4)}`,
        description: description || null,
        category: category || 'General',
        pricingType: pricing.type,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: pricing.parsedSale,
        minimumHours: pricing.minHrs,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        createdById: req.user?.id || 1,
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: `Service "${service.name}" created successfully`,
      data: service
    });
  } catch (error) {
    console.error('createService error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── UPDATE SERVICE ──
const updateService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, deletedAt: true } // BUGFIX: added deletedAt
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This service belongs to another branch.' });
    }

    const {
      name, code, description, category,
      costPrice, salePrice, isActive,
      pricingType, minimumHours
    } = req.body;

    const data = {
      updatedById: req.user?.id || 1
    };

    // Pricing update
    if (pricingType !== undefined || salePrice !== undefined || minimumHours !== undefined) {
      const pricing = validatePricing(
        pricingType || existing.pricingType,
        minimumHours,
        salePrice !== undefined ? salePrice : existing.salePrice
      );
      if (pricing.error) {
        return res.status(400).json({ success: false, message: pricing.error });
      }
      data.pricingType = pricing.type;
      data.salePrice = pricing.parsedSale;
      data.minimumHours = pricing.minHrs;
    }

    if (name) {
      data.name = name.trim();
    }
    if (code !== undefined) {
      data.code = code?.trim() || null;
    }
    if (description !== undefined) {
      data.description = description;
    }
    if (category !== undefined) {
      data.category = category;
    }
    if (costPrice !== undefined) {
      const cp = parseFloat(costPrice);
      if (cp < 0) return res.status(400).json({ success: false, message: 'Cost price cannot be negative.' });
      data.costPrice = cp;
    }
    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    // Duplicate check (name/code changed)
    if (name || code) {
      const duplicate = await prisma.service.findFirst({
        where: {
          OR: [
            name ? { name: { equals: name.trim()} } : {},
            code ? { code: { equals: code.trim()} } : {}
          ],
          companyId: existing.companyId || (await getCompanyIdByBranch(branchId)),
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another service with this name or code already exists.'
        });
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      }
    });

    res.status(200).json({ success: true, message: 'Service updated successfully', data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    console.error('updateService error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── DELETE SERVICE (Soft Delete + Linked Booking Check) ──
const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        name: true,
        deletedAt: true, // BUGFIX: added deletedAt
        _count: { select: { bookings: true } }
      }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This service belongs to another branch.' });
    }

    if (existing._count.bookings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${existing._count.bookings} booking(s) are linked to this service.`
      });
    }

    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.status(200).json({
      success: true,
      message: `Service "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    console.error('deleteService error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ── GET SERVICES BY BRANCH (Admin/Super Admin only) ──
const getServicesByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin or Super Admin required.' });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const services = await prisma.service.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('getServicesByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServicesByBranch
};