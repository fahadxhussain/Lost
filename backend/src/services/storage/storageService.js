const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const config = require('../../config');
const logger = require('../../shared/logger');
const { BadRequestError } = require('../../shared/errors/AppError');

// Configure Cloudinary if credentials provided
if (config.storage.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: config.storage.cloudinary.cloudName,
    api_key: config.storage.cloudinary.apiKey,
    api_secret: config.storage.cloudinary.apiSecret,
    secure: true,
  });
}

// Ensure uploads folder exists (for temporary staging or local disk storage)
const uploadDirectory = path.join(__dirname, '../../..', config.storage.uploadDir);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // Never serve an accepted image as executable HTML because of its original extension.
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.bin';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter: Accept only images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only JPG, PNG, and WebP image formats are supported'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for smartphone photos
  },
});

function getLocalImageUrl(req, filename) {
  if (!filename) return null;
  const protocol = req ? req.protocol : 'http';
  const host = req ? req.get('host') : `localhost:${config.port}`;
  return `${protocol}://${host}/uploads/${filename}`;
}

/**
 * Uploads an image to Cloudinary (if configured) or returns the local server URL.
 * Automatically compresses and optimizes images when stored on Cloudinary.
 */
async function getPublicImageUrl(req, filename) {
  if (!filename) return null;

  const filePath = path.join(uploadDirectory, filename);

  // If Cloudinary is configured and enabled (and not running offline tests)
  if (
    config.storage.provider === 'cloudinary' &&
    config.storage.cloudinary.cloudName &&
    config.nodeEnv !== 'test'
  ) {
    try {
      if (fs.existsSync(filePath)) {
        logger.info(`[StorageService] Uploading ${filename} to Cloudinary...`);
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'comsats_lost_found',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        });
        logger.info(`[StorageService] Cloudinary upload successful: ${result.secure_url}`);
        return result.secure_url;
      }
    } catch (err) {
      logger.error(`[StorageService] Cloudinary upload failed, falling back to local: ${err.message}`);
    }
  }

  return getLocalImageUrl(req, filename);
}

module.exports = {
  upload,
  getPublicImageUrl,
  uploadDirectory,
};
