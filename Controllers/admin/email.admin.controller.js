import dbCommonQuery from "../../utils/dbCommonQuery.js";
import { sendEmail } from "../../utils/email.js";

/**
 * Get All Email Templates
 * GET /api/admin/emails
 */
export const getAllEmailTemplates = async (req, res) => {
  try {
    const templates = await dbCommonQuery({
      model: "EmailTemplate",
      action: "find",
      filter: {},
      sort: { identifier: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: templates });
  } catch (error) {
    console.error("Get Email Templates Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch email templates." });
  }
};

/**
 * Get Email Template by ID
 * GET /api/admin/emails/:id
 */
export const getEmailTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await dbCommonQuery({
      model: "EmailTemplate",
      action: "findById",
      filter: id,
      lean: true,
    });

    if (!template) {
      return res.status(404).json({ status: false, message: "Template not found." });
    }

    return res.status(200).json({ status: true, data: template });
  } catch (error) {
    console.error("Get Email Template By ID Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch email template." });
  }
};

/**
 * Create Email Template
 * POST /api/admin/emails
 */
export const createEmailTemplate = async (req, res) => {
  try {
    const { identifier, subject, content } = req.body;
    if (!identifier || !subject || !content) {
      return res.status(400).json({
        status: false,
        message: "identifier, subject, and content are all required.",
      });
    }

    const existing = await dbCommonQuery({
      model: "EmailTemplate",
      action: "findOne",
      filter: { identifier: identifier.trim() },
      lean: true,
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: `Template with identifier '${identifier}' already exists.`,
      });
    }

    const template = await dbCommonQuery({
      model: "EmailTemplate",
      action: "create",
      data: {
        identifier: identifier.trim(),
        subject: subject.trim(),
        content: content.trim(),
      },
    });

    return res.status(201).json({ status: true, message: "Email template created.", data: template });
  } catch (error) {
    console.error("Create Email Template Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create email template." });
  }
};

/**
 * Update Email Template
 * PUT /api/admin/emails/:id
 */
export const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { identifier, subject, content } = req.body;

    const updateData = {};
    if (identifier) updateData.identifier = identifier.trim();
    if (subject) updateData.subject = subject.trim();
    if (content !== undefined) updateData.content = content.trim();

    const updated = await dbCommonQuery({
      model: "EmailTemplate",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Email template not found." });
    }

    return res.status(200).json({ status: true, message: "Email template updated.", data: updated });
  } catch (error) {
    console.error("Update Email Template Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update email template." });
  }
};

/**
 * Delete Email Template
 * DELETE /api/admin/emails/:id
 */
export const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "EmailTemplate",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Email template not found." });
    }

    return res.status(200).json({ status: true, message: "Email template deleted successfully." });
  } catch (error) {
    console.error("Delete Email Template Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete email template." });
  }
};

/**
 * Send Test Email
 * POST /api/admin/emails/test
 */
export const sendTestEmail = async (req, res) => {
  try {
    const { to, templateIdentifier, replacements } = req.body;

    if (!to || !templateIdentifier) {
      return res.status(400).json({
        status: false,
        message: "Recipient email 'to' and 'templateIdentifier' are required.",
      });
    }

    await sendEmail({
      to: to.trim(),
      templateIdentifier: templateIdentifier.trim(),
      replacements: replacements || { fullname: "Admin Tester", otp: "123456" },
    });

    return res.status(200).json({
      status: true,
      message: `Test email sent successfully to ${to}.`,
    });
  } catch (error) {
    console.error("Send Test Email Error:", error);
    return res.status(500).json({
      status: false,
      message: `Failed to send test email: ${error.message}`,
    });
  }
};
