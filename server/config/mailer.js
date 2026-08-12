const nodemailer = require('nodemailer');

// Universal Email Dispatcher with Dedicated Routing:
// - Gmail SMTP for Director Admin Alerts (shahriyartaufik@gmail.com)
// - Resend API for Outgoing Student Credentials (student emails)
async function dispatchEmail({ to, subject, htmlContent, fromName = 'Admission Cell Jigyassa', preferredProvider = 'auto' }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // ROUTE A: DIRECT GMAIL SMTP (PREFERRED FOR DIRECTOR ALERTS)
  if (preferredProvider === 'smtp') {
    if (smtpUser && smtpPass && !smtpPass.includes('your_') && !smtpUser.includes('your_')) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${fromName}" <${smtpUser}>`,
          to: to,
          subject: subject,
          html: htmlContent
        });

        console.log(`📧 [Gmail SMTP Success] Dispatched alert to Director inbox ${to}: ${info.messageId}`);
        return { success: true, provider: 'nodemailer', id: info.messageId };
      } catch (err) {
        console.warn(`⚠️ [Gmail SMTP Error]: ${err.message}. Trying Resend fallback...`);
      }
    }
  }

  // ROUTE B: RESEND API (PREFERRED FOR OUTGOING STUDENT CREDENTIALS)
  if (resendApiKey && !resendApiKey.includes('your_')) {
    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'Admission Cell Jigyassa <onboarding@resend.dev>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: Array.isArray(to) ? to : [to],
          subject: subject,
          html: htmlContent
        })
      });

      const data = await resp.json();
      if (resp.ok) {
        console.log(`🚀 [Resend API Success] Dispatched credentials to student ${to}: ${data.id}`);
        return { success: true, provider: 'resend', id: data.id };
      } else {
        console.warn(`⚠️ [Resend API Notice]: ${data.message || JSON.stringify(data)}`);
      }
    } catch (e) {
      console.warn(`⚠️ [Resend Dispatch Exception]: ${e.message}`);
    }
  }

  // SECONDARY FALLBACK TO GMAIL SMTP (IF RESEND FAILS OR IN TESTING SANDBOX)
  if (smtpUser && smtpPass && !smtpPass.includes('your_') && !smtpUser.includes('your_')) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass }
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to: to,
        subject: subject,
        html: htmlContent
      });

      console.log(`📧 [Nodemailer SMTP Fallback Success] Dispatched to ${to}: ${info.messageId}`);
      return { success: true, provider: 'nodemailer', id: info.messageId };
    } catch (err) {
      console.warn(`⚠️ [Nodemailer Fallback Error]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  console.log(`ℹ️ [Email Simulated] To: ${to} | Subject: "${subject}"`);
  return { success: true, simulated: true };
}

// Send Admin Email Notification for New Admission Application directly to Director via Gmail SMTP
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
          To review or approve this application, log in to your <a href="/admin-portal.html" style="color: #ffb703; font-weight: bold;">Jigyasa Science Admin Control Desk</a>.
        </p>
      </div>
    </div>
  `;

  return await dispatchEmail({
    to: adminEmail,
    subject: subject,
    htmlContent: htmlContent,
    fromName: 'Admission Cell Jigyassa',
    preferredProvider: 'smtp'
  });
}

// Send Student Credentials Email when Admin Approves Application via Resend API
async function sendStudentCredentialsEmail({ studentEmail, name, studentId, password, course }) {
  if (!studentEmail) return { success: false, message: 'No student email provided' };

  const subject = `🎉 Welcome to Jigyasa Science Academy! Your Student Account Credentials`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #040711; color: #ffffff; border: 1.5px solid #00f0ff; border-radius: 14px; padding: 28px; box-shadow: 0 8px 32px rgba(0,240,255,0.2);">
      <h2 style="color: #00f0ff; border-bottom: 1px solid rgba(0,240,255,0.3); padding-bottom: 14px; margin-top: 0; font-size: 22px;">
        🎓 Welcome to Jigyasa Science Academy!
      </h2>
      <p style="font-size: 16px; color: #cbd5e1; line-height: 1.5;">
        Dear <strong>${name}</strong>,<br/>
        Congratulations! Your admission application has been <strong>APPROVED</strong> by the Director. You now have official student portal access.
      </p>

      <div style="background: rgba(0, 240, 255, 0.08); border-left: 4px solid #00f0ff; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #ffb703; font-size: 16px;">🔑 Your Portal Access Credentials</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1; width: 45%;">Assigned Student ID:</td>
            <td style="padding: 6px 0; color: #00f0ff; font-weight: bold; font-size: 17px;">${studentId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">Unique Password:</td>
            <td style="padding: 6px 0; color: #ffb703; font-weight: bold; font-size: 18px; letter-spacing: 1px;">${password}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #cbd5e1;">Enrolled Program:</td>
            <td style="padding: 6px 0; color: #ffffff;">${course}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="https://jigyassa.netlify.app/student-portal.html" style="background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%); color: #040711; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; display: inline-block;">
          🚀 Log In To Student Portal
        </a>
      </div>

      <p style="font-size: 13px; color: #94a3b8; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-bottom: 0;">
        If you have any questions, reply directly to this email or contact Jigyasa Support.<br/>
        <em>Keep your credentials safe and secure.</em>
      </p>
    </div>
  `;

  return await dispatchEmail({
    to: studentEmail,
    subject: subject,
    htmlContent: htmlContent,
    fromName: 'Jigyasa Science Academy',
    preferredProvider: 'resend'
  });
}

module.exports = { dispatchEmail, sendAdmissionEmail, sendStudentCredentialsEmail };
