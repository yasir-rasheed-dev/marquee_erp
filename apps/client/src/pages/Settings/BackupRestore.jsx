import React, { useState, useEffect, useCallback } from 'react';
import backupApi from '../../services/backupApi';

// ── Icons ──
const Icons = {
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Cloud: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
  HardDrive: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Alert: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Database: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Spinner: () => <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
  Folder: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  Server: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
  Google: () => <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  Unlink: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
};

// ── Status Badge ──
const StatusBadge = ({ status }) => {
  const styles = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    running: 'bg-blue-100 text-blue-700 border-blue-200',
    deleted: 'bg-red-100 text-red-700 border-red-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const style = styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} capitalize`}>
      {status === 'running' && <Icons.Spinner />}
      {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status}
    </span>
  );
};

// ── Location Badge ──
const LocationBadge = ({ location }) => {
  if (location === 'google_drive') {
    return <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md"><Icons.Cloud /> Google Drive</span>;
  }
  if (location === 'both') {
    return <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md"><Icons.Cloud /> Local + Drive</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md"><Icons.HardDrive /> Local</span>;
};

// ── Toast ──
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bg = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className={`fixed top-4 right-4 z-50 ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}>
      {type === 'success' ? <Icons.Check /> : <Icons.Alert />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80"><Icons.X /></button>
    </div>
  );
};

// ── Trigger Backup Modal ──
const TriggerBackupModal = ({ isOpen, onClose, onTrigger, triggering }) => {
  const [form, setForm] = useState({
    backupNo: '',
    fileName: '',
    location: 'local',
    dbName: 'raath_db',
    localPath: '',
  });
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: null });
  const [checkingGoogle, setCheckingGoogle] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (isOpen) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const backupNo = `BKP-${dateStr}-${timeStr}`;
      setForm({
        backupNo,
        fileName: `raath_backup_${backupNo}.sql.gz`,
        location: 'local',
        dbName: 'raath_db',
        localPath: '',
      });
      checkGoogleStatus();
    }
  }, [isOpen]);

  const checkGoogleStatus = async () => {
    setCheckingGoogle(true);
    try {
      const res = await backupApi.getGoogleDriveStatus();
      if (res.data?.success) {
        setGoogleStatus(res.data.data);
      }
    } catch (err) {
      console.error('Google status check failed:', err);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const res = await backupApi.getGoogleAuthUrl();
      console.log('🔐 Auth URL response:', res.data);
      
      const url = res.data?.data?.url;
      if (!url) {
        showToast('Failed to get Google auth URL. Please try again.', 'error');
        return;
      }
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        'googleOAuth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        showToast('Popup blocked! Please allow popups for this site.', 'error');
        // Fallback: open in same tab
        window.location.href = url;
        return;
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          checkGoogleStatus();
        }
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to connect Google Drive';
      showToast(msg, 'error');
      console.error('Connect failed:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if ((form.location === 'local' || form.location === 'both') && !form.localPath.trim()) {
      alert('Please enter a local storage path');
      return;
    }
    if ((form.location === 'google_drive' || form.location === 'both') && !googleStatus.connected) {
      alert('Please connect your Google account first');
      return;
    }
    
    onTrigger(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icons.Plus /> Create New Backup
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Icons.X />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Backup Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backup Number</label>
            <input
              type="text"
              value={form.backupNo}
              onChange={(e) => setForm(f => ({ ...f, backupNo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              required
            />
          </div>

          {/* File Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
            <input
              type="text"
              value={form.fileName}
              onChange={(e) => setForm(f => ({ ...f, fileName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Location</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'local', label: 'Local Only', icon: <Icons.HardDrive /> },
                { value: 'google_drive', label: 'Google Drive', icon: <Icons.Cloud /> },
                { value: 'both', label: 'Both', icon: <Icons.Server /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, location: opt.value }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.location === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── LOCAL PATH ── */}
          {(form.location === 'local' || form.location === 'both') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Local Storage Path <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Folder />
                </div>
                <input
                  type="text"
                  placeholder="e.g., D:\Backups\Raath or /home/user/backups"
                  value={form.localPath}
                  onChange={(e) => setForm(f => ({ ...f, localPath: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">Enter full folder path. File will be saved here.</p>
            </div>
          )}

          {/* ── GOOGLE DRIVE CONNECTION ── */}
          {(form.location === 'google_drive' || form.location === 'both') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Google Drive Account</label>
              
              {checkingGoogle ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Icons.Spinner /> Checking...
                </div>
              ) : googleStatus.connected ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Icons.Check />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Connected</p>
                      <p className="text-xs text-emerald-600">{googleStatus.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await backupApi.disconnectGoogleDrive();
                        checkGoogleStatus();
                      } catch (err) {
                        console.error('Disconnect failed:', err);
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={connectGoogleDrive}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-all"
                  >
                    <Icons.Google />
                    Connect Gmail Account
                  </button>
                  <p className="text-xs text-gray-500">Backup will be saved to your personal Google Drive.</p>
                </div>
              )}
            </div>
          )}

          {/* Database Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
            <input
              type="text"
              value={form.dbName}
              onChange={(e) => setForm(f => ({ ...f, dbName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <div className="text-amber-600 mt-0.5"><Icons.Alert /></div>
            <div className="text-xs text-amber-800">
              <p className="font-medium">Backup will run in background</p>
              <p className="mt-0.5">Refresh the list to check status after a few minutes.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={triggering || ((form.location === 'google_drive' || form.location === 'both') && !googleStatus.connected)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {triggering ? <Icons.Spinner /> : <Icons.Cloud />}
              {triggering ? 'Starting...' : 'Start Backup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ──
const BackupRestore = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', location: '', dateFrom: '', dateTo: '' });
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.location) params.location = filters.location;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await backupApi.getAll(params);
      if (res.data?.success) {
        setBackups(res.data.data || []);
      } else {
        setBackups([]);
      }
    } catch (err) {
      console.error('Fetch backups failed:', err);
      showToast('Failed to load backups', 'error');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Trigger Backup with Options ──
  const handleTrigger = async (formData) => {
    setTriggering(true);
    try {
      const res = await backupApi.trigger({
        location: formData.location,
        dbName: formData.dbName,
        backupNo: formData.backupNo,
        fileName: formData.fileName,
        localPath: formData.localPath || undefined,
      });
      if (res.data?.success) {
        showToast(`Backup "${res.data.data?.backupNo}" triggered successfully`);
        setShowTriggerModal(false);
        fetchBackups();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to trigger backup';
      if (err.response?.data?.needsGoogleAuth) {
        showToast('Please connect Google Drive first', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setTriggering(false);
    }
  };

  const handleDownload = async (backup) => {
    try {
      const res = await backupApi.download(backup.id);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.fileName || `backup-${backup.backupNo}.sql.gz`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Download started');
    } catch (err) {
      if (backup.driveLink) {
        window.open(backup.driveLink, '_blank');
        return;
      }
      showToast('Download failed', 'error');
    }
  };

  const confirmDelete = (backup) => {
    setDeleteTarget(backup);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await backupApi.delete(deleteTarget.id);
      showToast(`Backup "${deleteTarget.backupNo}" deleted`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchBackups();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await backupApi.getById(id);
      if (res.data?.success) {
        setSelectedBackup(res.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      showToast('Failed to load backup details', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Trigger Backup Modal */}
      <TriggerBackupModal
        isOpen={showTriggerModal}
        onClose={() => setShowTriggerModal(false)}
        onTrigger={handleTrigger}
        triggering={triggering}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Database /> Backup & Restore
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage database backups, restore points, and auto-cleanup policies</p>
        </div>
        <button
          onClick={() => setShowTriggerModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Icons.Plus /> Create Backup
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Search backup no, file, db..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="deleted">Deleted</option>
          </select>

          <select
            value={filters.location}
            onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">All Locations</option>
            <option value="local">Local</option>
            <option value="google_drive">Google Drive</option>
            <option value="both">Both</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={fetchBackups}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <Icons.Refresh />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Backup No</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">File Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tables</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Icons.Spinner />
                      <span className="text-sm">Loading backups...</span>
                    </div>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Icons.Database />
                      <span className="text-sm">No backups found</span>
                      <span className="text-xs">Try adjusting filters or create a new backup</span>
                    </div>
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">{backup.backupNo}</div>
                      <div className="text-xs text-gray-500">{backup.dbName || 'raath_db'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={backup.fileName}>
                      {backup.fileName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={backup.status} />
                    </td>
                    <td className="px-4 py-3">
                      <LocationBadge location={backup.location} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      {formatBytes(backup.fileSize)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {backup.tablesCount || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewDetails(backup.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Icons.Eye />
                        </button>
                        {backup.status !== 'deleted' && backup.status !== 'pending' && backup.status !== 'running' && (
                          <>
                            <button
                              onClick={() => handleDownload(backup)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Download"
                            >
                              <Icons.Download />
                            </button>
                            <button
                              onClick={() => confirmDelete(backup)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Icons.Trash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
          <span>Showing {backups.length} backup{backups.length !== 1 ? 's' : ''}</span>
          <span>Branch: {JSON.parse(localStorage.getItem('selectedBranch') || '{}')?.name || 'Not selected'}</span>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBackup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Backup Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icons.X />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Backup Number</label>
                  <p className="text-sm font-mono text-gray-900 mt-0.5">{selectedBackup.backupNo}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <div className="mt-0.5"><StatusBadge status={selectedBackup.status} /></div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Database</label>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedBackup.dbName || 'raath_db'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Tables Count</label>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedBackup.tablesCount || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">File Size</label>
                  <p className="text-sm text-gray-900 mt-0.5">{formatBytes(selectedBackup.fileSize)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
                  <div className="mt-0.5"><LocationBadge location={selectedBackup.location} /></div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase">File Name</label>
                  <p className="text-sm font-mono text-gray-900 mt-0.5 break-all">{selectedBackup.fileName || '-'}</p>
                </div>
                {selectedBackup.filePath && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Local Path</label>
                    <p className="text-sm font-mono text-gray-600 mt-0.5 break-all bg-gray-50 p-2 rounded">{selectedBackup.filePath}</p>
                  </div>
                )}
                {selectedBackup.driveLink && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Drive Link</label>
                    <a href={selectedBackup.driveLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline mt-0.5 block break-all">
                      {selectedBackup.driveLink}
                    </a>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Created By</label>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedBackup.createdBy?.name || '-'} {selectedBackup.createdBy?.email ? `(${selectedBackup.createdBy.email})` : ''}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Created At</label>
                  <p className="text-sm text-gray-900 mt-0.5">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                {selectedBackup.deletedAt && (
                  <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <label className="text-xs font-medium text-red-600 uppercase">Deleted</label>
                    <p className="text-sm text-red-700 mt-0.5">{formatDate(selectedBackup.deletedAt)} — {selectedBackup.deletedReason || 'No reason'}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              {selectedBackup.status !== 'deleted' && selectedBackup.driveLink && (
                <a href={selectedBackup.driveLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Open in Drive
                </a>
              )}
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Icons.Alert />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Backup?</h3>
                  <p className="text-sm text-gray-500">This will remove local file and Drive file permanently.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-mono text-gray-700">{deleteTarget.backupNo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{deleteTarget.fileName || 'No file name'}</p>
                <p className="text-xs text-gray-400 mt-1">Location: {deleteTarget.location}</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default BackupRestore;