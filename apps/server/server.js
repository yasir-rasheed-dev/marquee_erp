const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load .env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === 'production';

// ── Secrets: refuse to run production with missing or published JWT secrets ──
// The defaults below ship in the public repo/.env.example, so anyone could forge tokens with them.
const PUBLISHED_SECRETS = ['marquee-super-secret-key-2026', 'marquee-refresh-secret-key-2026'];
for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
  const value = process.env[key];
  if (!value || PUBLISHED_SECRETS.includes(value) || value.startsWith('change-me') || value.length < 32) {
    const msg = `${key} is missing, too short (<32 chars) or a published default. Set a long random value in .env.`;
    if (isProd) {
      console.error(`❌ ${msg}`);
      process.exit(1);
    }
    console.warn(`⚠️  ${msg}`);
  }
}

// Behind cPanel/Passenger (or any reverse proxy) the real client IP is in X-Forwarded-For.
// Without this every visitor looks like the same IP and they all share one rate-limit bucket.
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));

// ── Security & Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CLIENT_URL may be a comma-separated list, e.g. "https://app.example.com,http://localhost:5175"
const allowedOrigins = [
  ...(process.env.CLIENT_URL || 'http://localhost:5175').split(',').map((o) => o.trim()).filter(Boolean),
  ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000']),
];

app.use(cors({
  origin: [...new Set(allowedOrigins)],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Test-Mode', 'X-Requested-With', 'X-Branch-Id', 'X-Company-Id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── Don't leak internals (Prisma messages, file paths, stack traces) in production 5xx responses ──
if (isProd) {
  app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 500 && body && typeof body === 'object') {
        console.error(`5xx ${req.method} ${req.originalUrl}:`, body.message || body);
        return json({ success: false, message: 'Something went wrong. Please try again.' });
      }
      return json(body);
    };
    next();
  });
}

// ── Rate Limiting ──
// Limits are per logged-in user (not per IP), so staff sharing one office connection
// don't exhaust each other's quota. Anonymous requests fall back to the client IP.
const rateLimitKey = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      const id = decoded.userId || decoded.id;
      if (id) return `user:${id}`;
    } catch {
      // invalid/expired token → treat as anonymous
    }
  }
  return `ip:${req.ip}`;
};

const tooMany = (message) => ({ success: false, message });

// Whole API: generous enough for a busy ERP screen, still stops scripted abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '1500', 10),
  keyGenerator: rateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many requests, please slow down and try again in a few minutes.'),
});

// Login / register / password reset: brute-force protection. Only failed attempts count,
// so a real user who logs in successfully is never locked out.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many failed attempts. Please wait 15 minutes and try again.'),
});

// Token refresh: one per page load at most, so a modest cap is plenty
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many session refreshes. Please log in again.'),
});

app.use('/api', apiLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'], credentialLimiter);
app.use('/api/auth/refresh-token', refreshLimiter);

// ── Import Routes (Using correct file names) ──
const authRoutes = require('./src/routes/auth.routes');
const branchRoutes = require('./src/routes/branchRoutes');     // ✅ Fixed
const menuRoutes = require('./src/routes/menu.routes');
const categoryRoutes = require('./src/routes/category.routes');
const itemRoutes = require('./src/routes/item.routes');
const companyRoutes = require('./src/routes/company.routes');
const eventRoutes = require('./src/routes/event.routes'); 
const unitRoutes = require('./src/routes/unit.routes');
const hallRoutes = require('./src/routes/hall.routes');
const stockTransactionRoutes = require('./src/routes/stockTransaction.routes');
const stockTransferRoutes = require('./src/routes/stockTransfer.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');
const assetRoutes = require('./src/routes/assetRoutes');
const packageRoutes = require('./src/routes/package.routes');
const customerRoutes = require('./src/routes/customer.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const recipeRoutes = require('./src/routes/reciperoutes');
const productionRoutes = require('./src/routes/production.routes');
const eventExecutionRoutes = require('./src/routes/eventExecution.routes');
const serviceRoutes = require('./src/routes/service.routes');
const supplierRoutes = require('./src/routes/supplier.routes');
const purchaseRoutes = require('./src/routes/purchase.routes');
const taxRateRoutes = require('./src/routes/taxRate.routes');
const accountRoutes = require('./src/routes/accounts.routes');
const kitchenOrderRoutes = require('./src/routes/kitchenOrder.routes');
const wastageLogRoutes = require('./src/routes/wastageLog.routes');
const payrollRoutes = require('./src/routes/payroll.routes');
const attendanceRoutes = require('./src/routes/attendance.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const rolePermissionRoutes = require('./src/routes/rolePermissionRoutes'); 
const backupRoutes = require('./src/routes/backup.routes');
const receiptSettingsRoutes = require('./src/routes/receiptSettings');
const reportRoutes = require('./src/routes/report.routes');
const onboardingRoutes = require('./src/routes/onboarding.routes');

// const userRoutes = require('./src/routes/user.routes');      // If exists
// const inventoryRoutes = require('./src/routes/inventory.routes'); // If exists
// const packageRoutes = require('./src/routes/package.routes');     // If exists

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);                        // ✅ Fixed
app.use('/api/menus', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stock-transactions', stockTransactionRoutes);
app.use('/api/stock-transfers', stockTransferRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/production-plans', productionRoutes);
app.use('/api/event-executions', eventExecutionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/tax-rates', taxRateRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/kitchen-orders', kitchenOrderRoutes);
app.use('/api/wastage-logs', wastageLogRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/role-permissions', rolePermissionRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/receipt-settings', receiptSettingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/onboarding', onboardingRoutes);
// app.use('/api/users', userRoutes);                          // If exists
// app.use('/api/inventory', inventoryRoutes);                 // If exists
// app.use('/api/packages', packageRoutes);                    // If exists

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'Marquee ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Prisma unique constraint error
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: `Duplicate field value: ${err.meta?.target?.join(', ')}`
    });
  }
  
  // Prisma record not found error
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // Prisma foreign key error
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: The record you are trying to link does not exist'
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.'
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(!isProd && { stack: err.stack })
  });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   POST /api/auth/register        - Register user`);
  console.log(`   POST /api/auth/login           - Login user`);
  console.log(`   GET  /api/auth/me              - Get current user`);
  console.log(`   POST /api/auth/refresh-token   - Refresh token`);
  console.log(`   POST /api/auth/logout          - Logout user`);
  console.log(`   GET  /api/branches             - Get all branches (company-wise)`);
  console.log(`   GET  /api/categories           - Get categories (branch-wise)`);
  console.log(`   GET  /api/items                - Get items (branch-wise)`);
  console.log(`   GET  /api/menus                - Get menus (branch-wise)`);
  console.log(`   GET  /api/companies            - Get companies (admin)`);
  console.log(`   GET  /api/health               - Health check`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏢 Multi-Tenancy: ${process.env.MULTI_TENANCY || 'Enabled'}`);
});