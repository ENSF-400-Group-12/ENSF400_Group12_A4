const path = require('path');
const multer = require('multer');
const { getUploadsDir, ensureDir } = require('../lib/storageConfig');

const uploadsDir = getUploadsDir();
ensureDir(uploadsDir);

/** iPhone often uses HEIC/HEIF; some clients send octet-stream with .heic extension. */
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uid = (req.session && req.session.userId) != null ? req.session.userId : '0';
    const safe = `${uid}-${Date.now()}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      'Only image files are allowed (JPEG, PNG, GIF, WebP, or iPhone HEIC/HEIF).'
    ),
    false
  );
};

/** ~18MB: iPhone photos can exceed 5MB before server-side downscale. */
const maxFileSize = 18 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

module.exports = { upload, memoryUpload, ALLOWED_MIMES };
