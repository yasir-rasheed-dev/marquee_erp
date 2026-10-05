const { PrismaClient } = require('@prisma/client');

// Shared hosting (cPanel) caps connections per MySQL user (max_user_connections),
// so the whole app shares this single client with a small, fixed pool.
// Override with DB_CONNECTION_LIMIT, or by putting connection_limit in DATABASE_URL.
const buildDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const limit = parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10);
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}&pool_timeout=20`;
};

const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
