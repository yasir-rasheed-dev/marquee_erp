const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load .env from server root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Starting seed...');

    // Check if company exists
    const companyCount = await prisma.company.count();
    if (companyCount > 0) {
      console.log('⚠️ Data already exists. Skipping seed.');
      return;
    }

    // ── Create Company ──
    const company = await prisma.company.create({
      data: {
        name: 'Marquee Events',
        address: '123 Main Street, Lahore',
        phone: '0300-1234567',
        email: 'info@marquee.com',
        taxNumber: 'TAX-001'
      }
    });
    console.log('✅ Company created');

    // ── Create Branches ──
    const branches = await Promise.all([
      prisma.branch.create({
        data: {
          name: 'Main Branch',
          address: '456 Park Avenue, Lahore',
          phone: '0300-1234568',
          email: 'main@marquee.com',
          companyId: company.id,
          isActive: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'North Branch',
          address: '789 Garden Road, Lahore',
          phone: '0300-1234569',
          email: 'north@marquee.com',
          companyId: company.id,
          isActive: true
        }
      }),
      prisma.branch.create({
        data: {
          name: 'South Branch',
          address: '321 Lake View, Lahore',
          phone: '0300-1234570',
          email: 'south@marquee.com',
          companyId: company.id,
          isActive: true
        }
      })
    ]);
    console.log('✅ Branches created');

    // ── Hash Passwords ──
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', salt);
    const managerPassword = await bcrypt.hash('manager123', salt);
    const staffPassword = await bcrypt.hash('staff123', salt);

    // ── Create Users ──
    await prisma.user.createMany({
      data: [
        {
          name: 'Admin User',
          email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@marquee.com',
          password: adminPassword,
          role: 'admin',
          phone: '0300-1111111',
          branchId: branches[0].id,
          isActive: true
        },
        {
          name: 'Main Manager',
          email: 'manager@marquee.com',
          password: managerPassword,
          role: 'manager',
          phone: '0300-2222222',
          branchId: branches[0].id,
          isActive: true
        },
        {
          name: 'Main Cashier',
          email: 'cashier@marquee.com',
          password: staffPassword,
          role: 'cashier',
          phone: '0300-3333333',
          branchId: branches[0].id,
          isActive: true
        },
        {
          name: 'Main Staff',
          email: 'staff@marquee.com',
          password: staffPassword,
          role: 'staff',
          phone: '0300-4444444',
          branchId: branches[0].id,
          isActive: true
        },
        {
          name: 'North Manager',
          email: 'north@marquee.com',
          password: managerPassword,
          role: 'manager',
          phone: '0300-5555555',
          branchId: branches[1].id,
          isActive: true
        },
        {
          name: 'South Manager',
          email: 'south@marquee.com',
          password: managerPassword,
          role: 'manager',
          phone: '0300-6666666',
          branchId: branches[2].id,
          isActive: true
        }
      ]
    });
    console.log('✅ Users created');

    console.log('🎉 Seed completed successfully!');
    console.log('📝 Test Credentials:');
    console.log(`   Admin:    ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@marquee.com'} / ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
    console.log('   Manager:  manager@marquee.com / manager123');
    console.log('   Cashier:  cashier@marquee.com / staff123');
    console.log('   Staff:    staff@marquee.com / staff123');
    console.log('   North:    north@marquee.com / manager123');
    console.log('   South:    south@marquee.com / manager123');

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();