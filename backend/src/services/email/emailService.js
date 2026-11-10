const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../../shared/logger');

class EmailService {
  constructor() {
    this.provider = config.email.provider;
    this.transporter = null;

    if (this.provider === 'smtp' && config.email.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.port === 465,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.pass,
        },
      });
    }
  }

  async sendVerificationOtp(email, otp, name = 'Student') {
    const subject = 'Your Verification Code - COMSATS Lost & Found';
    const text = `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code is valid for ${config.university.otpExpiryMinutes} minutes. If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #003366; text-align: center;">COMSATS Lost & Found</h2>
        <p>Dear ${name},</p>
        <p>Thank you for registering. Use the following One-Time Password (OTP) to activate your account:</p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #003366;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This OTP will expire in <strong>${config.university.otpExpiryMinutes} minutes</strong>. Please do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">COMSATS University Islamabad &bull; Student Community</p>
      </div>
    `;

    if (this.transporter && this.provider === 'smtp') {
      try {
        await this.transporter.sendMail({
          from: config.email.from,
          to: email,
          subject,
          text,
          html,
        });
        logger.info(`Verification OTP sent via SMTP to ${email}`);
        return true;
      } catch (err) {
        logger.error(`Failed to send email via SMTP to ${email}: ${err.message}`, err);
        // Fallback to console log so development is not blocked
        this.logToConsole(email, otp);
        return false;
      }
    }

    // Default: Console Logger for development
    this.logToConsole(email, otp);
    return true;
  }

  logToConsole(email, otp) {
    console.log('\n======================================================');
    console.log('       [EMAIL SERVICE - DEVELOPMENT OTP DISPATCH]');
    console.log(`  Recipient: ${email}`);
    console.log(`  OTP Code : >>> ${otp} <<<`);
    console.log(`  Validity : ${config.university.otpExpiryMinutes} minutes`);
    console.log('======================================================\n');
  }
}

module.exports = new EmailService();
