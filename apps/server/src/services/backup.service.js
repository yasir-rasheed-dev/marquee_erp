// ═══════════════════════════════════════════════════════════
// services/backup.service.js
// BACKUP ENGINE — MySQL Dump + Google Drive + Cleanup
// ═══════════════════════════════════════════════════════════

const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const googleDriveOAuthService = require('./googleDriveOAuth.service');

const execAsync = util.promisify(exec);

// ── Auto-detect mysqldump path (Windows + Linux/Mac) ──
const findMysqlDump = () => {
  // 1. Pehle .env wala path check karo
  if (process.env.MYSQLDUMP_PATH && fs.existsSync(process.env.MYSQLDUMP_PATH)) {
    console.log('🔍 Using mysqldump from .env:', process.env.MYSQLDUMP_PATH);
    return process.env.MYSQLDUMP_PATH;
  }

  // 2. Common install locations on Windows (XAMPP, MySQL Server, MariaDB)
  const candidates = [
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    ...['8.4', '8.0', '5.7'].map((v) => `C:\\Program Files\\MySQL\\MySQL Server ${v}\\bin\\mysqldump.exe`),
    ...['11.4', '10.11', '10.6', '10.4'].map((v) => `C:\\Program Files\\MariaDB ${v}\\bin\\mysqldump.exe`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log('✅ Auto-detected mysqldump at:', p);
      return p;
    }
  }

  // 3. Fallback to global command if added to system PATH
  return 'mysqldump';
};

// ── Config ──
const BACKUP_DIR = process.env.BACKUP_LOCAL_PATH || path.join(process.cwd(), 'backups');
const DB_NAME = process.env.DATABASE_NAME || 'marquee_erp';
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || '3306';
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
   * Dump MySQL database using mysqldump
   */
  async dumpDatabase(outputPath) {
    const dumpPath = findMysqlDump();

    console.log('🗄️  Running mysqldump...');
    console.log('   Path:', dumpPath);

    const args = [
      `--host=${DB_HOST}`,
      `--port=${DB_PORT}`,
      `--user=${DB_USER}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--default-character-set=utf8mb4',
      `--result-file=${outputPath}`,
      DB_NAME,
    ];

    await new Promise((resolve, reject) => {
      // Password env se pass hota hai taake command line par na dikhe
      const dump = spawn(dumpPath, args, { env: { ...process.env, MYSQL_PWD: DB_PASSWORD } });

      let stderrData = '';
      dump.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      dump.on('error', (err) => {
        reject(new Error(`mysqldump spawn failed: ${err.message}. Is MySQL installed?`));
      });

      dump.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`mysqldump error (code ${code}): ${stderrData}`));
        } else {
          console.log('✅ Database dumped successfully as .sql:', outputPath);
          resolve();
        }
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
        WHERE table_schema = DATABASE()
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