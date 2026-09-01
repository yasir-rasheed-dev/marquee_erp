// ═══════════════════════════════════════════════════════════
// services/googleDrive.service.js
// GOOGLE DRIVE UPLOADER — Service Account
// ═══════════════════════════════════════════════════════════

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEYFILEPATH = process.env.GOOGLE_DRIVE_KEYFILE || path.join(process.cwd(), 'config', 'google-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

class GoogleDriveService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || null;
  }

  async uploadFile(filePath, fileName, mimeType = 'application/gzip') {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : undefined,
      };

      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      // Make file publicly readable (optional)
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      return {
        fileId: response.data.id,
        driveLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink,
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({ fileId });
      return true;
    } catch (error) {
      console.error('Google Drive delete error:', error);
      return false;
    }
  }
}

module.exports = new GoogleDriveService();