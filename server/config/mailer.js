const nodemailer = require('nodemailer');

// Send Email Notification for New Admission Application
async function sendAdmissionEmail(admission) {
  const adminEmail = process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com';
  const subject = `🚨 New Admission Application Received: ${admission.applicationId} - ${admission.name}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #040711; color: #ffffff; border: 1px solid #ffb703; border-radius: 12px; padding: 24px;">
      <h2 style="color: #ffb703; border-bottom: 1px solid rgba(255,183,3,0.3); padding-bottom: 12px; margin-top: 0;">
        ⚛️ Jigyasa Science Academy — New Admission Application
      </h2>
      <p style="font-size: 15px; color: #cbd5e1;">A new student has submitted an online admission application:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold; width: 35%;">Application Ref ID:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #00f0ff; font-weight: bold; font-size: 16px;">${admission.applicationId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Applicant Name:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffffff; font-weight: bold;">${admission.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Email Address:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffffff;"><a href="mailto:${admission.email}" style="color: #3b82f6;">${admission.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Contact Phone:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffffff;"><a href="tel:${admission.phone}" style="color: #10b981;">${admission.phone}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Target Program:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffb703; font-weight: bold;">${admission.targetCourse}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Previous Score (%):</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffffff;">${admission.previousPercentage || 'N/A'}%</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #cbd5e1; font-weight: bold;">Statement / Message:</td>
          <td style="padding: 10px; border-bottom: 1px solid #1a2744; color: #ffffff; font-style: italic;">"${admission.message || 'No message provided'}"</td>
        </tr>
      </table>

      <div style="background: rgba(255, 183, 3, 0.1); border-left: 4px solid #ffb703; padding: 12px; border-radius: 4px; margin-top: 20px;">
        <p style="margin: 0; font-size: 13px; color: #ffffff;">
          To review or approve this application, log in to your <a href="http://localhost:5000/admin-portal.html" style="color: #ffb703; font-weight: bold;">Jigyasa Science Admin Control Desk</a>.
        </p>
      </div>
    </div>
  `;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const isConfigured = smtpUser && smtpPass && !smtpPass.includes('your_') && !smtpUser.includes('your_');

  if (!isConfigured) {
    console.log(`ℹ️ Email Notification Simulated: Application ${admission.applicationId} for ${admission.name} (${adminEmail}). (Set Gmail App Password in .env to dispatch live emails).`);
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const info = await transporter.sendMail({
      from: `"Jigyasa Science Admissions" <${smtpUser}>`,
      to: adminEmail,
      subject: subject,
      html: htmlContent
    });

    console.log(`📧 Admission notification dispatched live to ${adminEmail} (App ID: ${admission.applicationId})`);
    return { success: true, info };
  } catch (err) {
    console.warn(`ℹ️ Email dispatch notice: ${err.message}. Application ${admission.applicationId} saved successfully in MongoDB Atlas.`);
    return { success: false, error: err.message };
  }
}

module.exports = { sendAdmissionEmail };
