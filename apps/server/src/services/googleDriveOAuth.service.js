// ═══════════════════════════════════════════════════════════
// services/googleDriveOAuth.service.js
// GOOGLE DRIVE OAUTH — User's Personal Gmail Account
// ═══════════════════════════════════════════════════════════

const { google } = require('googleapis');
const prisma = require('../config/database');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backups/google/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

class GoogleDriveOAuthService {
  /**
   * Generate OAuth URL for user to connect their Gmail
   */
   getAuthUrl(userId) {
    if (!userId) throw new Error('userId is required to generate auth URL');
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent',
    });
    console.log('🔗 Generated Google Auth URL for user:', userId);
    return url;
  }

  /**
   * Handle OAuth callback — exchange code for tokens
   */
  async handleCallback(code, state) {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    // Save tokens to DB
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        googleDriveRefreshToken: tokens.refresh_token,
        googleDriveAccessToken: tokens.access_token,
        googleDriveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleDriveEmail: userInfo.data.email,
      }
    });

    return { email: userInfo.data.email };
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidAuth(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        googleDriveRefreshToken: true,
        googleDriveAccessToken: true,
        googleDriveTokenExpiry: true,
      }
    });

    if (!user?.googleDriveRefreshToken) {
      throw new Error('Google Drive not connected. Please connect your Gmail account first.');
    }

    oauth2Client.setCredentials({
      refresh_token: user.googleDriveRefreshToken,
      access_token: user.googleDriveAccessToken,
      expiry_date: user.googleDriveTokenExpiry?.getTime(),
    });

    // Auto-refresh if expired
    const expiryDate = user.googleDriveTokenExpiry;
    if (!expiryDate || expiryDate < new Date(Date.now() + 60000)) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          googleDriveAccessToken: credentials.access_token,
          googleDriveTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        }
      });
      oauth2Client.setCredentials(credentials);
    }

    return oauth2Client;
  }

  /**
   * Upload file to user's personal Google Drive
   */
  async uploadFile(userId, filePath, fileName, folderId = null) {
    const auth = await this.getValidAuth(userId);
    const drive = google.drive({ version: 'v3', auth });

    if (!require('fs').existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    const media = {
      mimeType: 'application/gzip',
      body: require('fs').createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return {
      fileId: response.data.id,
      driveLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink,
    };
  }

  /**
   * Delete file from user's Drive
   */
  async deleteFile(userId, fileId) {
    const auth = await this.getValidAuth(userId);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId });
    return true;
  }

  /**
   * Check if user has connected Google Drive
   */
  async isConnected(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { googleDriveRefreshToken: true, googleDriveEmail: true }
    });
    return {
      connected: !!user?.googleDriveRefreshToken,
      email: user?.googleDriveEmail || null,
    };
  }

  /**
   * Disconnect Google Drive
   */
  async disconnect(userId) {
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        googleDriveRefreshToken: null,
        googleDriveAccessToken: null,
        googleDriveTokenExpiry: null,
        googleDriveEmail: null,
      }
    });
    return true;
  }
}

module.exports = new GoogleDriveOAuthService();