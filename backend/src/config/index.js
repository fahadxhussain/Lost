require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8081',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  university: {
    allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'isbstudent.comsats.edu.pk,comsats.edu.pk')
      .split(',')
      .map((d) => d.trim().toLowerCase()),
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'console',
    from: process.env.EMAIL_FROM || 'COMSATS Lost & Found <no-reply@comsats.edu.pk>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },
};
