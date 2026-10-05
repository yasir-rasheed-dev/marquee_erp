// ═══════════════════════════════════════════════════════════
// controllers/customer.controller.js
// CUSTOMERS & HISTORY LEDGER — B2C + B2B (Individual + Corporate)
// ═══════════════════════════════════════════════════════════

const prisma = require('../config/database');

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

// ───────────────────────────────────────────────────────────
// @desc    Get all Customers (STRICT Branch-Wise + Search & Filters)
// @route   GET /api/customers
// ───────────────────────────────────────────────────────────
const getCustomers = async (req, res) => {
  try {
    const { search, phone, city, isActive, customerType } = req.query;
    const branchId = getBranchId(req);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.',
        data: []
      });
    }

    const where = { branchId, deletedAt: null };

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (phone && phone.trim() !== '') where.phone = { contains: phone.trim() };
    if (city && city.trim() !== '') where.city = { contains: city.trim()};
    if (customerType && customerType.trim() !== '') where.customerType = customerType.trim();
    
    if (search && search.trim() !== '') {
      const s = search.trim();
      where.OR = [
        { name: { contains: s} },
        { phone: { contains: s } },
        { email: { contains: s} },
        { cnic: { contains: s } },
        { address: { contains: s} },
        { businessName: { contains: s} },
        { contactPersonName: { contains: s} },
        { contactPersonPhone: { contains: s } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        emergencyContacts: true,
        bookings: {
          select: {
            id: true,
            bookingNo: true,
            eventDate: true,
            eventType: true,
            guestCount: true,
            status: true,
            createdAt: true
          },
          orderBy: { eventDate: 'desc' }
        },
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
      branch: branchId
    });
  } catch (error) {
    console.error('getCustomers error 500 details:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get single Customer with Complete Booking History Ledger
// @route   GET /api/customers/:id
// ───────────────────────────────────────────────────────────
const getCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        emergencyContacts: true,
        bookings: {
          include: {
            hall: { select: { id: true, name: true } },
            menus: { 
              include: { 
                menu: { select: { id: true, name: true, totalSalePrice: true } } 
              } 
            },
            services: {
              include: {
                service: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { eventDate: 'desc' }
        }
      },
    });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }

    if (customer.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This customer belongs to another branch.'
      });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error('getCustomer error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Create Customer with Emergency Contacts (Branch-Wise)
// @route   POST /api/customers
// ───────────────────────────────────────────────────────────
const createCustomer = async (req, res) => {
  try {
    const {
      name, phone, email, cnic, address, city, notes,
      customerType, businessName, businessType, ntn, strn, website,
      contactPersonName, contactPersonPhone, contactPersonDesignation,
      billingAddress, creditLimit, paymentTerms, referralSource,
      emergencyContacts, branchId, companyId
    } = req.body;

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required' });
    }

    // B2B validation
    if (customerType && customerType !== 'individual') {
      if (!businessName?.trim()) {
        return res.status(400).json({ success: false, message: 'Business name is required for organizations' });
      }
    }

    let targetBranchId = branchId || req.branchId;
    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required. Please select a branch.'
      });
    }
    targetBranchId = parseInt(targetBranchId);

    let targetCompanyId = companyId || req.companyId;
    if (!targetCompanyId) {
      targetCompanyId = await getCompanyIdByBranch(targetBranchId);
    }

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Duplicate check (phone + cnic within company)
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: phone.trim() },
          cnic ? { cnic: cnic.trim() } : {}
        ],
        companyId: parseInt(targetCompanyId),
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone number or CNIC already exists in this company'
      });
    }

    const customer = await prisma.$transaction(async (tx) => {
      const cust = await tx.customer.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          cnic: cnic?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          notes: notes?.trim() || null,
          
          // B2B fields
          customerType: customerType || 'individual',
          businessName: businessName?.trim() || null,
          businessType: businessType?.trim() || null,
          ntn: ntn?.trim() || null,
          strn: strn?.trim() || null,
          website: website?.trim() || null,
          contactPersonName: contactPersonName?.trim() || null,
          contactPersonPhone: contactPersonPhone?.trim() || null,
          contactPersonDesignation: contactPersonDesignation?.trim() || null,
          billingAddress: billingAddress?.trim() || null,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          paymentTerms: paymentTerms || 'immediate',
          referralSource: referralSource?.trim() || null,
          
          branchId: targetBranchId,
          companyId: parseInt(targetCompanyId),
          isActive: true
        }
      });

      if (emergencyContacts && emergencyContacts.length > 0) {
        for (const ec of emergencyContacts) {
          if (!ec.name?.trim() || !ec.phone?.trim()) continue;
          await tx.customerEmergencyContact.create({
            data: {
              customerId: cust.id,
              name: ec.name.trim(),
              relation: ec.relation?.trim() || null,
              phone: ec.phone.trim(),
              isPrimary: Boolean(ec.isPrimary)
            }
          });
        }
      }

      return await tx.customer.findUnique({
        where: { id: cust.id },
        include: {
          branch: { select: { id: true, name: true } },
          emergencyContacts: true
        }
      });
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: `Customer "${customer.name}" created successfully`
    });
  } catch (error) {
    console.error('createCustomer error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Update Customer & Contacts
// @route   PUT /api/customers/:id
// ───────────────────────────────────────────────────────────
const updateCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required. Please select a branch.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied. This customer belongs to another branch.' });
    }

    const {
      name, phone, email, cnic, address, city, notes, isActive,
      customerType, businessName, businessType, ntn, strn, website,
      contactPersonName, contactPersonPhone, contactPersonDesignation,
      billingAddress, creditLimit, paymentTerms, referralSource,
      emergencyContacts
    } = req.body;

    if (phone || cnic) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          OR: [
            phone ? { phone: phone.trim() } : {},
            cnic ? { cnic: cnic.trim() } : {}
          ],
          companyId: existing.companyId,
          NOT: { id: id },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Another customer with this phone number or CNIC already exists'
        });
      }
    }

    const customer = await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(email !== undefined && { email: email?.trim() || null }),
          ...(cnic !== undefined && { cnic: cnic?.trim() || null }),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(city !== undefined && { city: city?.trim() || null }),
          ...(notes !== undefined && { notes: notes?.trim() || null }),
          ...(isActive !== undefined && { isActive }),
          
          // B2B fields update
          ...(customerType !== undefined && { customerType }),
          ...(businessName !== undefined && { businessName: businessName?.trim() || null }),
          ...(businessType !== undefined && { businessType: businessType?.trim() || null }),
          ...(ntn !== undefined && { ntn: ntn?.trim() || null }),
          ...(strn !== undefined && { strn: strn?.trim() || null }),
          ...(website !== undefined && { website: website?.trim() || null }),
          ...(contactPersonName !== undefined && { contactPersonName: contactPersonName?.trim() || null }),
          ...(contactPersonPhone !== undefined && { contactPersonPhone: contactPersonPhone?.trim() || null }),
          ...(contactPersonDesignation !== undefined && { contactPersonDesignation: contactPersonDesignation?.trim() || null }),
          ...(billingAddress !== undefined && { billingAddress: billingAddress?.trim() || null }),
          ...(creditLimit !== undefined && { creditLimit: creditLimit ? parseFloat(creditLimit) : null }),
          ...(paymentTerms !== undefined && { paymentTerms }),
          ...(referralSource !== undefined && { referralSource: referralSource?.trim() || null }),
        }
      });

      if (emergencyContacts !== undefined) {
        await tx.customerEmergencyContact.deleteMany({ where: { customerId: id } });
        if (emergencyContacts.length > 0) {
          for (const ec of emergencyContacts) {
            if (!ec.name?.trim() || !ec.phone?.trim()) continue;
            await tx.customerEmergencyContact.create({
              data: {
                customerId: id,
                name: ec.name.trim(),
                relation: ec.relation?.trim() || null,
                phone: ec.phone.trim(),
                isPrimary: Boolean(ec.isPrimary)
              }
            });
          }
        }
      }

      return await tx.customer.findUnique({
        where: { id },
        include: {
          branch: { select: { id: true, name: true } },
          emergencyContacts: true
        }
      });
    });

    res.status(200).json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    console.error('updateCustomer error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Delete Customer (Soft Delete)
// @route   DELETE /api/customers/:id
// ───────────────────────────────────────────────────────────
const deleteCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, branchId: true, name: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId !== branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.status(200).json({
      success: true,
      message: `Customer "${existing.name}" deleted successfully`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    console.error('deleteCustomer error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// ───────────────────────────────────────────────────────────
// @desc    Get customers by branch
// @route   GET /api/customers/branch/:branchId
// ───────────────────────────────────────────────────────────
const getCustomersByBranch = async (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, Super Admin or Manager required.'
      });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const customers = await prisma.customer.findMany({
      where: { branchId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        emergencyContacts: true,
        _count: { select: { bookings: true } }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('getCustomersByBranch error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersByBranch
};