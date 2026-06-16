import nodemailer from "nodemailer";
import EmailTemplate from "../Models/emailTemplate.schema.js";

// Initialize nodemailer transporter using SMTP settings from env variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Replace placeholders like {{key}} with values from replacements object.
 */
const compileTemplate = (content, replacements = {}) => {
  let compiled = content;
  for (const [key, value] of Object.entries(replacements)) {
    // Escape regex characters in key to prevent execution errors
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    compiled = compiled.replace(new RegExp(`{{${escapedKey}}}`, "g"), value);
  }
  return compiled;
};

/**
 * Send an email using database templates.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.templateIdentifier - The identifier of the email template in the database
 * @param {Object} options.replacements - Key-value pairs of substitutions
 */
export const sendEmail = async ({ to, templateIdentifier, replacements = {} }) => {
  const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

  try {
    // 1. Fetch template from database
    const template = await EmailTemplate.findOne({ identifier: templateIdentifier });
    if (!template) {
      throw new Error(`Email template with identifier '${templateIdentifier}' not found.`);
    }

    // 2. Compile dynamic content
    const compiledContent = compileTemplate(template.content, replacements);
    const compiledSubject = compileTemplate(template.subject, replacements);

    // 3. Fallback for incomplete SMTP configurations in development
    if (!isSmtpConfigured) {
      console.warn("⚠️ SMTP credentials are not fully configured in your .env file.");
      console.log(`--- [MOCK EMAIL SENT] ---`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${compiledSubject}`);
      console.log(`Body:\n${compiledContent}`);
      console.log(`-------------------------`);
      return { mock: true, to, subject: compiledSubject };
    }

    // 4. Send email using Nodemailer
    const mailOptions = {
      from: `"OtakuDuo" <${process.env.SMTP_USER}>`,
      to,
      subject: compiledSubject,
      html: compiledContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    // Print verification OTP to console as a backup for development/testing
    if (replacements.otp) {
      console.log(`[DEVELOPMENT BACKUP] OTP for ${to} is: ${replacements.otp}`);
    }
    throw error;
  }
};
export default sendEmail;
