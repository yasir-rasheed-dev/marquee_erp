const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getBranchId = (req) => {
  if (req.query.branchId) return parseInt(req.query.branchId);
  if (req.branchId) return parseInt(req.branchId);
  return null;
};

// @desc    Get all events (STRICT Branch-Wise)
// @route   GET /api/events
const getEvents = async (req, res) => {
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
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status !== undefined) {
      where.isActive = status === 'true';
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ 
      success: true, 
      count: events.length, 
      data: events,
      branch: branchId
    });
  } catch (error) {
    console.error('getEvents error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create Event
// @route   POST /api/events
const createEvent = async (req, res) => {
  try {
    const { name, code, description, isActive, branchId, companyId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
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

    // Check duplicate code within company
    if (code?.trim()) {
      const existing = await prisma.event.findFirst({
        where: {
          code: code.trim(),
          companyId: parseInt(targetCompanyId),
          deletedAt: null
        }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Event code already exists in this company.' });
      }
    }

    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
        branchId: targetBranchId,
        companyId: parseInt(targetCompanyId),
        createdById: req.user?.id || null
      },
      include: { branch: { select: { id: true, name: true } } }
    });

    res.status(201).json({ success: true, message: 'Event created successfully', data: event });
  } catch (error) {
    console.error('createEvent error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update Event
// @route   PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, branchId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This event belongs to another branch.' });
    }

    const { name, code, description, isActive } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        code: code !== undefined ? code.trim() || null : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedById: req.user?.id || null
      },
      include: { branch: { select: { id: true, name: true } } }
    });

    res.status(200).json({ success: true, message: 'Event updated successfully', data: event });
  } catch (error) {
    console.error('updateEvent error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Soft Delete Event
// @route   DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, branchId: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This event belongs to another branch.' });
    }

    // Check linked bookings
    const bookingsCount = await prisma.booking.count({ where: { eventId: id } });
    if (bookingsCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${bookingsCount} booking(s) linked to this event type.` });
    }

    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('deleteEvent error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };