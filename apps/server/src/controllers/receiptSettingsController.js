const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helper: STRICT branch filter ──
const getBranchId = (req) => {
  if (req.body?.branchId) {
    return parseInt(req.body.branchId);
  }
  if (req.query?.branchId) {
    return parseInt(req.query.branchId);
  }
  if (req.branchId) {
    return parseInt(req.branchId);
  }
  if (req.user?.branchId) {
    return parseInt(req.user.branchId);
  }
  return null;
};

// @desc    Get receipt settings for current branch (falls back to company default)
// @route   GET /api/receipt-settings
const getReceiptSettings = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const branchId = getBranchId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    const where = { 
      companyId: Number(companyId),
      deletedAt: null 
    };

    // Agar branch selected hai → us branch ki settings
    // Warna company default (branchId: null)
    if (branchId) {
      where.branchId = Number(branchId);
    } else {
      where.branchId = null;
    }

    const setting = await prisma.receiptSetting.findFirst({
      where,
      include: {
        branch: {
          select: { id: true, name: true }
        },
        company: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: setting ? [setting] : [],
      count: setting ? 1 : 0,
      branch: branchId
    });
  } catch (err) {
    console.error('getReceiptSettings error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Get single receipt setting by ID
// @route   GET /api/receipt-settings/:id
const getReceiptSetting = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt setting ID' });
    }

    const setting = await prisma.receiptSetting.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } }
      }
    });

    if (!setting || setting.deletedAt) {
      return res.status(404).json({ success: false, message: 'Receipt settings not found' });
    }

    const branchId = getBranchId(req);
    const userRole = req.userRole || req.user?.role;

    // Strict branch check
    if (setting.branchId && setting.branchId !== branchId && !['admin','super_admin'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. These settings belong to another branch.' 
      });
    }

    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    console.error('getReceiptSetting error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Get receipt settings by specific branch (Admin/Super Admin only)
// @route   GET /api/receipt-settings/branch/:branchId
const getReceiptSettingsByBranch = async (req, res) => {
  try {
    const userRole = req.userRole || req.user?.role;
    if (!['admin', 'super_admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID' });
    }

    const companyId = req.companyId || req.user?.companyId;
    
    const setting = await prisma.receiptSetting.findFirst({
      where: { 
        companyId: Number(companyId), 
        branchId: Number(branchId),
        deletedAt: null 
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ 
      success: true, 
      count: setting ? 1 : 0, 
      data: setting ? [setting] : [],
      branch: branchId
    });
  } catch (err) {
    console.error('getReceiptSettingsByBranch error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Create receipt settings for a branch (with duplicate check)
// @route   POST /api/receipt-settings
const createReceiptSetting = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const branchId = getBranchId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Duplicate check: ek company/branch ke liye sirf 1 record
    const existing = await prisma.receiptSetting.findFirst({
      where: {
        companyId: Number(companyId),
        branchId: branchId ? Number(branchId) : null,
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Settings already exist for this branch.',
        existingId: existing.id,
        data: existing
      });
    }

    const {
      companyName, companySlogan, address, phone, email, website, logoUrl,
      headerText, footerText, marqueeText,
      showLogo, showCompanyName, showSlogan, showAddress, showPhone,
      showEmail, showWebsite, showHeaderText, showFooterText, showMarquee,
      showQrCode, showBarcode, showGst, showNTN,
      showEventDetails, showCustomerDetails, showPaymentHistory,
      gstNumber, ntnNumber,
      themeColor, accentColor,
      thermalWidth, thermalFontSize
    } = req.body;

    const setting = await prisma.receiptSetting.create({
      data: {
        companyName: companyName?.trim() || 'UniSoft Enterprise',
        companySlogan: companySlogan?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        headerText: headerText?.trim() || null,
        footerText: footerText?.trim() || null,
        marqueeText: marqueeText?.trim() || null,
        showLogo: showLogo !== undefined ? Boolean(showLogo) : true,
        showCompanyName: showCompanyName !== undefined ? Boolean(showCompanyName) : true,
        showSlogan: showSlogan !== undefined ? Boolean(showSlogan) : true,
        showAddress: showAddress !== undefined ? Boolean(showAddress) : true,
        showPhone: showPhone !== undefined ? Boolean(showPhone) : true,
        showEmail: showEmail !== undefined ? Boolean(showEmail) : true,
        showWebsite: showWebsite !== undefined ? Boolean(showWebsite) : true,
        showHeaderText: showHeaderText !== undefined ? Boolean(showHeaderText) : true,
        showFooterText: showFooterText !== undefined ? Boolean(showFooterText) : true,
        showMarquee: showMarquee !== undefined ? Boolean(showMarquee) : true,
        showQrCode: showQrCode !== undefined ? Boolean(showQrCode) : false,
        showBarcode: showBarcode !== undefined ? Boolean(showBarcode) : false,
        showGst: showGst !== undefined ? Boolean(showGst) : false,
        showNTN: showNTN !== undefined ? Boolean(showNTN) : false,
        showEventDetails: showEventDetails !== undefined ? Boolean(showEventDetails) : true,
        showCustomerDetails: showCustomerDetails !== undefined ? Boolean(showCustomerDetails) : true,
        showPaymentHistory: showPaymentHistory !== undefined ? Boolean(showPaymentHistory) : true,
        gstNumber: gstNumber?.trim() || null,
        ntnNumber: ntnNumber?.trim() || null,
        themeColor: themeColor?.trim() || '#1a1a2e',
        accentColor: accentColor?.trim() || '#A97A1F',
        thermalWidth: thermalWidth?.trim() || '80mm',
        thermalFontSize: thermalFontSize?.trim() || '12px',
        companyId: Number(companyId),
        branchId: branchId ? Number(branchId) : null
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Receipt settings created successfully!',
      data: setting
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        success: false, 
        message: 'Receipt settings already exist for this company/branch combination.' 
      });
    }
    console.error('createReceiptSetting error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Update receipt settings
// @route   PUT /api/receipt-settings/:id
const updateReceiptSetting = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt setting ID' });
    }

    const existing = await prisma.receiptSetting.findUnique({
      where: { id },
      select: { id: true, branchId: true, companyId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Receipt settings not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId && existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. These settings belong to another branch.'
      });
    }

    const {
      companyName, companySlogan, address, phone, email, website, logoUrl,
      headerText, footerText, marqueeText,
      showLogo, showCompanyName, showSlogan, showAddress, showPhone,
      showEmail, showWebsite, showHeaderText, showFooterText, showMarquee,
      showQrCode, showBarcode, showGst, showNTN,
      showEventDetails, showCustomerDetails, showPaymentHistory,
      gstNumber, ntnNumber,
      themeColor, accentColor,
      thermalWidth, thermalFontSize
    } = req.body;

    const updateData = {};
    
    if (companyName !== undefined) updateData.companyName = companyName.trim();
    if (companySlogan !== undefined) updateData.companySlogan = companySlogan?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null;
    if (headerText !== undefined) updateData.headerText = headerText?.trim() || null;
    if (footerText !== undefined) updateData.footerText = footerText?.trim() || null;
    if (marqueeText !== undefined) updateData.marqueeText = marqueeText?.trim() || null;
    
    if (showLogo !== undefined) updateData.showLogo = Boolean(showLogo);
    if (showCompanyName !== undefined) updateData.showCompanyName = Boolean(showCompanyName);
    if (showSlogan !== undefined) updateData.showSlogan = Boolean(showSlogan);
    if (showAddress !== undefined) updateData.showAddress = Boolean(showAddress);
    if (showPhone !== undefined) updateData.showPhone = Boolean(showPhone);
    if (showEmail !== undefined) updateData.showEmail = Boolean(showEmail);
    if (showWebsite !== undefined) updateData.showWebsite = Boolean(showWebsite);
    if (showHeaderText !== undefined) updateData.showHeaderText = Boolean(showHeaderText);
    if (showFooterText !== undefined) updateData.showFooterText = Boolean(showFooterText);
    if (showMarquee !== undefined) updateData.showMarquee = Boolean(showMarquee);
    if (showQrCode !== undefined) updateData.showQrCode = Boolean(showQrCode);
    if (showBarcode !== undefined) updateData.showBarcode = Boolean(showBarcode);
    if (showGst !== undefined) updateData.showGst = Boolean(showGst);
    if (showNTN !== undefined) updateData.showNTN = Boolean(showNTN);
    if (showEventDetails !== undefined) updateData.showEventDetails = Boolean(showEventDetails);
    if (showCustomerDetails !== undefined) updateData.showCustomerDetails = Boolean(showCustomerDetails);
    if (showPaymentHistory !== undefined) updateData.showPaymentHistory = Boolean(showPaymentHistory);
    
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null;
    if (ntnNumber !== undefined) updateData.ntnNumber = ntnNumber?.trim() || null;
    if (themeColor !== undefined) updateData.themeColor = themeColor?.trim();
    if (accentColor !== undefined) updateData.accentColor = accentColor?.trim();
    if (thermalWidth !== undefined) updateData.thermalWidth = thermalWidth?.trim();
    if (thermalFontSize !== undefined) updateData.thermalFontSize = thermalFontSize?.trim();

    const updated = await prisma.receiptSetting.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Receipt settings updated successfully!',
      data: updated
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Receipt settings not found' });
    }
    console.error('updateReceiptSetting error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Soft delete receipt settings
// @route   DELETE /api/receipt-settings/:id
const deleteReceiptSetting = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt setting ID' });
    }

    const existing = await prisma.receiptSetting.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Receipt settings not found' });
    }

    const branchId = getBranchId(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required.' });
    }

    if (existing.branchId && existing.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. These settings belong to another branch.'
      });
    }

    await prisma.receiptSetting.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({ success: true, message: 'Receipt settings deleted successfully!' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Receipt settings not found' });
    }
    console.error('deleteReceiptSetting error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

module.exports = {
  getReceiptSettings,
  getReceiptSetting,
  getReceiptSettingsByBranch,
  createReceiptSetting,
  updateReceiptSetting,
  deleteReceiptSetting
};