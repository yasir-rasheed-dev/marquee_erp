// controllers/hall.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// @desc    Get all halls with sessions (STRICT Branch-Wise)
// @route   GET /api/halls
const getHalls = async (req, res) => {
  try {
    const { search, status } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch ID is required. Please select a branch.',
        data: [] 
      });
    }

    const where = { branchId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search} },
        { code: { contains: search} }
      ];
    }
    if (status !== undefined) {
      where.isActive = status === 'true';
    }

    const halls = await prisma.hall.findMany({
      where,
      include: {
        sessions: { where: { deletedAt: null } },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ 
      success: true, 
      count: halls.length, 
      data: halls,
      branch: branchId
    });
  } catch (error) {
    console.error('getHalls error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single hall
// @route   GET /api/halls/:id
const getHall = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid hall ID' });
    }

    const hall = await prisma.hall.findUnique({
      where: { id },
      include: {
        sessions: { where: { deletedAt: null } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!hall || hall.deletedAt) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (hall.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This hall belongs to another branch.' });
    }

    res.status(200).json({ success: true, data: hall });
  } catch (error) {
    console.error('getHall error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create Hall with optional sessions
// @route   POST /api/halls
const createHall = async (req, res) => {
  try {
    const { name, code, description, capacity, price, perSeatPrice, pricingType, isActive, sessions, branchId, companyId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Hall name is required' });
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      const branchRecord = await prisma.branch.findUnique({
        where: { id: targetBranchId },
        select: { companyId: true }
      });
      if (branchRecord) {
        targetCompanyId = branchRecord.companyId;
      }
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // ✅ Check duplicate code within company
    if (code?.trim()) {
      const existing = await prisma.hall.findFirst({
        where: {
          code: code.trim(),
          companyId: parseInt(targetCompanyId),
          deletedAt: null
        }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Hall with this code already exists in the company.' });
      }
    }

    const hall = await prisma.hall.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        capacity: parseInt(capacity) || 0,
        price: parseFloat(price) || 0,
        perSeatPrice: perSeatPrice !== undefined ? parseFloat(perSeatPrice) || null : null,
        pricingType: pricingType || 'fixed',
        isActive: isActive !== undefined ? isActive : true,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        createdById: req.user?.id || null,
        sessions: sessions && sessions.length > 0 ? {
          create: sessions.map(s => ({
            name: s.name.trim(),
            startTime: s.startTime,
            endTime: s.endTime,
            duration: parseInt(s.duration) || 0,
            isActive: s.isActive ?? true
          }))
        } : undefined
      },
      include: { sessions: true, branch: { select: { id: true, name: true } } }
    });

    res.status(201).json({ success: true, message: 'Hall created successfully', data: hall });
  } catch (error) {
    console.error('createHall error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update Hall
// @route   PUT /api/halls/:id
const updateHall = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid hall ID' });
    }

    const existing = await prisma.hall.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This hall belongs to another branch.' });
    }

    const { name, code, description, capacity, price, perSeatPrice, pricingType, isActive, sessions } = req.body;

    // Handle sessions update if provided: replace old sessions
    if (sessions) {
      await prisma.hallSession.deleteMany({ where: { hallId: id } });
    }

    const hall = await prisma.hall.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        code: code !== undefined ? code.trim() || null : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        capacity: capacity !== undefined ? parseInt(capacity) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        perSeatPrice: perSeatPrice !== undefined ? parseFloat(perSeatPrice) || null : undefined,
        pricingType: pricingType !== undefined ? pricingType : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedById: req.user?.id || null,
        sessions: sessions && sessions.length > 0 ? {
          create: sessions.map(s => ({
            name: s.name.trim(),
            startTime: s.startTime,
            endTime: s.endTime,
            duration: parseInt(s.duration) || 0,
            isActive: s.isActive ?? true
          }))
        } : undefined
      },
      include: { sessions: true, branch: { select: { id: true, name: true } } }
    });

    res.status(200).json({ success: true, message: 'Hall updated successfully', data: hall });
  } catch (error) {
    console.error('updateHall error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Soft Delete Hall
// @route   DELETE /api/halls/:id
const deleteHall = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid hall ID' });
    }

    const existing = await prisma.hall.findUnique({
      where: { id },
      select: { id: true, branchId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This hall belongs to another branch.' });
    }

    // Optional: Check active bookings count before deleting
    const activeBookingsCount = await prisma.booking.count({
      where: { hallId: id }
    });

    if (activeBookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeBookingsCount} active booking(s) linked to this hall.`
      });
    }

    await prisma.hall.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({ success: true, message: 'Hall deleted successfully' });
  } catch (error) {
    console.error('deleteHall error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { getHalls, getHall, createHall, updateHall, deleteHall };