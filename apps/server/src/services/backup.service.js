// ═══════════════════════════════════════════════════════════
// services/backup.service.js
// BACKUP ENGINE — PostgreSQL Dump + Google Drive + Cleanup
// ═══════════════════════════════════════════════════════════

const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const googleDriveOAuthService = require('./googleDriveOAuth.service');

const execAsync = util.promisify(exec);

// ── Auto-detect pg_dump path (Windows + Linux/Mac) ──
// ── Auto-detect pg_dump path (Windows + Linux/Mac) ──
const findPgDump = () => {
  // 1. Pehle .env wala path check karo
  if (process.env.PG_DUMP_PATH && fs.existsSync(process.env.PG_DUMP_PATH)) {
    console.log('🔍 Using pg_dump from .env:', process.env.PG_DUMP_PATH);
    return process.env.PG_DUMP_PATH;
  }

  // 2. Automated search across common PostgreSQL versions on Windows & x86
  const versions = ['18', '17', '16', '15', '14', '13', '12', '11', '10'];
  const basePaths = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL'
  ];

  for (const basePath of basePaths) {
    for (const ver of versions) {
      const p = path.join(basePath, ver, 'bin', 'pg_dump.exe');
      if (fs.existsSync(p)) {
        console.log(`✅ Auto-detected PostgreSQL v${ver} pg_dump at:`, p);
        return p;
      }
    }
  }

  // 3. Fallback to global command if added to system PATH
  return 'pg_dump';
};

// ── Config ──
const BACKUP_DIR = process.env.BACKUP_LOCAL_PATH || path.join(process.cwd(), 'backups');
const DB_NAME = process.env.DATABASE_NAME || 'raath_db';
const DB_USER = process.env.DATABASE_USER || 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || '5432';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

class BackupService {
  constructor() {
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (err) {
      console.error('Failed to create backup directory:', err);
    }
  }

  /**
   * Main method: Create backup, upload to Drive, update log
   */
  async createBackup(companyId, branchId, userId, backupLogId, customLocalPath = null) {
    const backupLog = await prisma.backupLog.findUnique({
      where: { id: backupLogId },
      select: { backupNo: true, fileName: true, location: true }
    });

    const fileName = `raath_backup_${backupLog?.backupNo || 'new'}.sql`;
    
    // ── CUSTOM PATH LOGIC ──
    const defaultDir = BACKUP_DIR;
    const backupDir = customLocalPath ? path.resolve(customLocalPath) : defaultDir;
    await fsPromises.mkdir(backupDir, { recursive: true });
    const filePath = path.join(backupDir, fileName);
    let driveData = null;
    let fileSize = 0;
    let tablesCount = 0;

    try {
      // 1. Update status to running
      await this.updateBackupLog(backupLogId, { status: 'running', filePath });

      // 2. Get table count
      tablesCount = await this.getTableCount();

      // 3. Dump database
      await this.dumpDatabase(filePath);

      // 4. Get file size
      const stats = await fsPromises.stat(filePath);
      fileSize = stats.size;

      // 5. Upload to Google Drive (if requested) — User's personal account
      if ((backupLog?.location === 'google_drive' || backupLog?.location === 'both') && userId) {
        try {
          driveData = await googleDriveOAuthService.uploadFile(userId, filePath, fileName);
          console.log('✅ Uploaded to User Drive:', driveData.fileId);
        } catch (driveErr) {
          console.error('⚠️ Drive upload failed:', driveErr.message);
          if (backupLog?.location === 'google_drive') {
            throw new Error(`Google Drive upload failed: ${driveErr.message}`);
          }
        }
      }

      // 6. Determine final location
      const finalLocation = driveData ? 'both' : 'local';

      // 7. Update log to completed
      await this.updateBackupLog(backupLogId, {
        status: 'completed',
        filePath,
        fileName,
        fileSize,
        tablesCount,
        driveFileId: driveData?.fileId || null,
        driveLink: driveData?.driveLink || null,
        location: finalLocation,
      });

      // 8. Cleanup old backups
      await this.cleanupOldBackups(companyId, userId);

      return {
        success: true,
        filePath,
        driveFileId: driveData?.fileId,
        driveLink: driveData?.driveLink,
      };

    } catch (error) {
      console.error('❌ Backup failed:', error);
      
      await this.updateBackupLog(backupLogId, {
        status: 'failed',
        deletedReason: (error.message || 'Backup failed').substring(0, 95),
      });

      // Cleanup partial file
            try { await fsPromises.unlink(filePath); } catch (e) { }

      throw error;
    }
  }

  /**
   * Dump PostgreSQL database using pg_dump
   */
  async dumpDatabase(outputPath) {
    const pgDumpPath = findPgDump();
    const isWin = process.platform === 'win32';

    console.log('🗄️  Running pg_dump...');
    console.log('   Path:', pgDumpPath);

    const connectionUri = `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

    await new Promise((resolve, reject) => {
      const formattedPath = isWin && !pgDumpPath.startsWith('"') ? `"${pgDumpPath}"` : pgDumpPath;

      const pgDump = spawn(formattedPath, [
        connectionUri,
        '--no-owner',
        '--no-acl'
      ], { shell: true });

      // 🛠️ Yahan humne gzip hata kar seedha file write stream laga di hai
      const outStream = fs.createWriteStream(outputPath);

      let stderrData = '';

      pgDump.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pgDump.on('error', (err) => {
        reject(new Error(`pg_dump spawn failed: ${err.message}. Is PostgreSQL installed?`));
      });

      // Pipeline direct pg_dump se file par jaye gi (.sql file banegi)
      pipeline(pgDump.stdout, outStream)
        .then(() => {
          if (stderrData && !stderrData.toLowerCase().includes('warning') && !stderrData.toLowerCase().includes('notice')) {
            reject(new Error(`pg_dump error: ${stderrData}`));
          } else {
            console.log('✅ Database dumped successfully as .sql:', outputPath);
            resolve();
          }
        })
        .catch((err) => {
          reject(new Error(`Backup pipeline failed: ${err.message}`));
        });
    });
  }

  /**
   * Get table count from database
   */
  async getTableCount() {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      return parseInt(result[0]?.count || 0);
    } catch (err) {
      console.error('Failed to get table count:', err);
      return 0;
    }
  }

  /**
   * Update backup log in Prisma
   */
  async updateBackupLog(id, data) {
    return await prisma.backupLog.update({
      where: { id },
      data,
    });
  }

  /**
   * Cleanup old backups (local + DB + Drive)
   */
  async cleanupOldBackups(companyId, userId) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    try {
      const oldBackups = await prisma.backupLog.findMany({
        where: {
          companyId,
          createdAt: { lt: cutoffDate },
          deletedAt: null,
          isAutoDeleted: false,
        },
      });

      for (const backup of oldBackups) {
        // Delete local file
        if (backup.filePath) {
          try {
            await fs.unlink(backup.filePath);
            console.log('🗑️  Deleted local file:', backup.filePath);
          } catch (e) {
            console.warn('Local file delete failed:', e.message);
          }
        }

        // Delete from Drive (user's personal account)
        if (backup.driveFileId && userId) {
          try {
            await googleDriveOAuthService.deleteFile(userId, backup.driveFileId);
          } catch (e) {
            console.warn('Drive delete failed:', e.message);
          }
        }

        // Mark as auto-deleted
        await prisma.backupLog.update({
          where: { id: backup.id },
          data: {
            deletedAt: new Date(),
            isAutoDeleted: true,
            deletedReason: `Auto-cleanup: retention policy (${RETENTION_DAYS} days)`,
            status: 'deleted',
          },
        });
      }

      if (oldBackups.length > 0) {
        console.log(`🧹 Cleaned up ${oldBackups.length} old backups`);
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
}

module.exports = new BackupService();