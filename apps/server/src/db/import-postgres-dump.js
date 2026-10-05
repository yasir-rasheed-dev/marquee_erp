// ═══════════════════════════════════════════════════════════
// One-time import: PostgreSQL data dump (plain SQL from pg_restore) → MySQL
// Usage: node src/db/import-postgres-dump.js <data.sql>
// Create data.sql with: pg_restore --data-only --no-owner -f data.sql ../database/marquee
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Undo the escaping used by Postgres COPY text format
const unescapeCopy = (v) =>
  v.replace(/\\(.)/g, (_, c) => ({ b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' }[c] ?? c));

const parseDump = (file) => {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const tables = [];
  let cur = null;
  for (const line of lines) {
    if (!cur) {
      const m = line.match(/^COPY public\.("?)(\w+)\1 \((.*)\) FROM stdin;/);
      if (m) cur = { name: m[2], cols: m[3].split(', ').map((c) => c.replace(/"/g, '')), rows: [] };
      continue;
    }
    if (line === '\\.') { tables.push(cur); cur = null; continue; }
    cur.rows.push(line.split('\t').map((v) => (v === '\\N' ? null : unescapeCopy(v))));
  }
  return tables;
};

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node src/db/import-postgres-dump.js <data.sql>');
  const tables = parseDump(file);

  const dbCols = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS d
       FROM information_schema.columns WHERE table_schema = DATABASE()`
  );
  const colInfo = {};
  for (const { t, c, d } of dbCols) (colInfo[t.toLowerCase()] ||= {})[c] = d;

  let total = 0;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name, cols, rows } of tables) {
      const info = colInfo[name.toLowerCase()];
      if (!info) throw new Error(`Table ${name} not found in MySQL`);
      const missing = cols.filter((c) => !info[c]);
      if (missing.length) throw new Error(`Table ${name}: columns missing in MySQL: ${missing.join(', ')}`);

      await tx.$executeRawUnsafe(`DELETE FROM \`${name}\``);
      for (const row of rows) {
        const values = row.map((v, i) => {
          if (v === null) return null;
          if (info[cols[i]] === 'tinyint') return v === 't' ? 1 : v === 'f' ? 0 : Number(v);
          return v;
        });
        await tx.$executeRawUnsafe(
          `INSERT INTO \`${name}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...values
        );
      }
      if (rows.length) console.log(`  ✔ ${name}: ${rows.length} rows`);
      total += rows.length;
    }
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }, { timeout: 120000 });

  console.log(`✅ Imported ${total} rows from ${tables.length} tables`);
}

main()
  .catch((e) => { console.error('❌ Import failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
