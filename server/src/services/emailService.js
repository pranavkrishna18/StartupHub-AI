const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Shared HTML layout wrapper for all StartupHub AI emails.
 * Uses a premium, dark-mode, high-tech aesthetic matching the web app.
 */
const getSharedHtmlLayout = (title, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #06050c;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #cbd5e1;
        }
        .wrapper {
          width: 100%;
          background-color: #06050c;
          padding: 40px 20px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0c0a1a;
          border: 1px solid #1e1b4b;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #150f36 0%, #06050c 100%);
          padding: 30px 40px;
          text-align: center;
          border-bottom: 1px solid #1e1b4b;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin: 0;
          text-decoration: none;
        }
        .logo-accent {
          color: #00f2fe;
        }
        .content {
          padding: 40px;
          line-height: 1.6;
        }
        h1 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 20px;
        }
        p {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 15px;
          color: #94a3b8;
        }
        .btn-container {
          margin: 30px 0;
          text-align: center;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(90deg, #7c3aed 0%, #6366f1 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
          transition: transform 0.2s ease;
        }
        .footer {
          padding: 30px 40px;
          background-color: #06050c;
          border-top: 1px solid #1e1b4b;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        .footer-links {
          margin-bottom: 15px;
        }
        .footer-links a {
          color: #00f2fe;
          text-decoration: none;
          margin: 0 10px;
        }
        .social-placeholder {
          margin-top: 10px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <span class="logo-text">StartupHub <span class="logo-accent">AI</span></span>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <div class="footer-links">
              <a href="${frontendUrl}">Explore Feed</a> &bull;
              <a href="${frontendUrl}/matches">Discovery</a> &bull;
              <a href="${frontendUrl}/dashboard">Dashboard</a>
            </div>
            <p style="font-size: 11px; color: #475569; margin: 0;">
              &copy; ${new Date().getFullYear()} StartupHub AI. All rights reserved.<br>
              Bringing transparency and acceleration to early stage startup validation.
            </p>
            <div class="social-placeholder">
              Follow us on GitHub &bull; LinkedIn &bull; Twitter
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Main email sender function wrapping Resend API
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html
    });

    if (response.error) {
      console.error(`❌ Resend API Error sending email to ${to}:`, response.error.message || response.error);
      return response;
    }

    const emailId = response.data?.id;
    console.log(`✉️ Email successfully sent to ${to}. ID: ${emailId}`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Send Welcome Email
 */
exports.sendWelcomeEmail = async (to, name) => {
  const content = `
    <h1>Welcome to StartupHub AI, ${name}! 🚀</h1>
    <p>We are absolutely thrilled to welcome you to our acceleration community. StartupHub AI is a platform designed to validate product ideas, discover stellar co-founders, and track traction early.</p>
    <p>As a next step, make sure to set up your profile, browse current startups on the feed, and run AI reports on models you find promising.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/onboarding" class="btn">Complete Your Profile</a>
    </div>
    <p>If you have any questions, simply reply to this email. We're here to help you build.</p>
  `;
  const html = getSharedHtmlLayout('Welcome to StartupHub AI', content);
  return sendEmail({ to, subject: 'Welcome to StartupHub AI! 🚀', html });
};

/**
 * Send Verification Email
 */
exports.sendVerificationEmail = async (to, name, verificationToken) => {
  const verifyLink = `${frontendUrl}/verify-email/${verificationToken}`;
  const content = `
    <h1>Verify Your Account 🛡️</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thank you for signing up on StartupHub AI. To activate your account and start validating ideas, please confirm your email address by clicking the button below:</p>
    <div class="btn-container">
      <a href="${verifyLink}" class="btn">Verify Email Address</a>
    </div>
    <p>If the button doesn't work, copy and paste the following link into your browser:</p>
    <p style="word-break: break-all;"><a href="${verifyLink}" style="color: #00f2fe;">${verifyLink}</a></p>
    <p>This verification link is valid for 24 hours.</p>
  `;
  const html = getSharedHtmlLayout('Verify Your Account', content);
  return sendEmail({ to, subject: 'Verify your StartupHub AI Account 🛡️', html });
};

/**
 * Send Forgot Password Reset Link Email
 */
exports.sendForgotPasswordEmail = async (to, name, resetToken) => {
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
  const content = `
    <h1>Reset Your Password 🔑</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset the password linked with your account. Click the button below to specify a new password:</p>
    <div class="btn-container">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>
    <p>If the button above does not work, copy and paste this link in your browser:</p>
    <p style="word-break: break-all;"><a href="${resetLink}" style="color: #00f2fe;">${resetLink}</a></p>
    <p>This password reset request is secure and will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  `;
  const html = getSharedHtmlLayout('Reset Your Password', content);
  return sendEmail({ to, subject: 'Reset Your StartupHub AI Password 🔑', html });
};

/**
 * Send Password Reset Success Confirmation Email
 */
exports.sendPasswordResetSuccessEmail = async (to, name) => {
  const content = `
    <h1>Password Reset Successful ✅</h1>
    <p>Hi ${name || 'there'},</p>
    <p>This is a confirmation email that the password for your StartupHub AI account has been successfully reset.</p>
    <p>You can now log in securely with your new password.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/login" class="btn">Log In Now</a>
    </div>
    <p>If you did not perform this action, please contact support immediately.</p>
  `;
  const html = getSharedHtmlLayout('Password Reset Successful', content);
  return sendEmail({ to, subject: 'StartupHub AI — Password Reset Successful ✅', html });
};

/**
 * Send Password Changed Email (from settings/profile)
 */
exports.sendPasswordChangedEmail = async (to, name) => {
  const content = `
    <h1>Your Password Was Updated 🔒</h1>
    <p>Hi ${name || 'there'},</p>
    <p>The password for your StartupHub AI account was recently changed. If you initiated this change, no further action is required.</p>
    <p>If you did not request or make this change, please reset your password immediately or contact our support team to secure your account.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/login" class="btn">Log In</a>
    </div>
  `;
  const html = getSharedHtmlLayout('Password Changed', content);
  return sendEmail({ to, subject: 'StartupHub AI — Password Security Alert 🔒', html });
};

/**
 * Send Verification Success Email
 */
exports.sendVerificationSuccessEmail = async (to, name) => {
  const content = `
    <h1>Email Confirmed! 🎉</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Your email address has been successfully verified. You now have full credentials to create startups, request AI feedback reports, comment on proposals, and find co-founders.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/" class="btn">Explore Startup Ideas</a>
    </div>
  `;
  const html = getSharedHtmlLayout('Account Verified', content);
  return sendEmail({ to, subject: 'StartupHub AI — Account Verified 🎉', html });
};

/**
 * Send New Comment Notification Email
 */
exports.sendNewCommentEmail = async (to, name, startupName, commentAuthor, commentContent) => {
  const content = `
    <h1>New Comment on ${startupName} 💬</h1>
    <p>Hi ${name || 'there'},</p>
    <p><strong>${commentAuthor}</strong> left a comment on your startup idea <strong>${startupName}</strong>:</p>
    <blockquote style="background-color: #1e1b4b; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; color: #cbd5e1; border-radius: 6px; font-style: italic;">
      "${commentContent}"
    </blockquote>
    <div class="btn-container">
      <a href="${frontendUrl}/" class="btn">View Community Discussion</a>
    </div>
  `;
  const html = getSharedHtmlLayout('New Comment Received', content);
  return sendEmail({ to, subject: `New Comment on ${startupName} 💬`, html });
};

/**
 * Send New Upvote Notification Email
 */
exports.sendNewUpvoteEmail = async (to, name, startupName, voterName, totalVotes) => {
  const content = `
    <h1>Your Startup Idea was Upvoted! 🔺</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Great news! <strong>${voterName}</strong> just upvoted your startup idea <strong>${startupName}</strong>.</p>
    <p>Your concept is gaining traction and now has a total of <strong>${totalVotes}</strong> votes.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/dashboard" class="btn">View Founder Dashboard</a>
    </div>
  `;
  const html = getSharedHtmlLayout('New Upvote Received', content);
  return sendEmail({ to, subject: `Upvote received for ${startupName}! 🔺`, html });
};

/**
 * Send New Waitlist Join Notification Email
 */
exports.sendNewWaitlistEmail = async (to, name, startupName, subscriberEmail, totalWaitlist) => {
  const content = `
    <h1>New Waitlist Subscriber! 🌟</h1>
    <p>Hi ${name || 'there'},</p>
    <p>An early adopter is interested! <strong>${subscriberEmail}</strong> has just subscribed to the private launch waitlist for <strong>${startupName}</strong>.</p>
    <p>You now have <strong>${totalWaitlist}</strong> subscribers tracking your validation milestones.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/dashboard" class="btn">View Waitlist Signups</a>
    </div>
  `;
  const html = getSharedHtmlLayout('New Waitlist Signup', content);
  return sendEmail({ to, subject: `New waitlist signup for ${startupName} 🌟`, html });
};

/**
 * Send Co-founder Application Submitted Notification Email
 */
exports.sendApplicationSubmittedEmail = async (to, name, startupName, applicantName, roleProposed, message) => {
  const content = `
    <h1>New Co-founder Application! 🤝</h1>
    <p>Hi ${name || 'there'},</p>
    <p><strong>${applicantName}</strong> has applied to join <strong>${startupName}</strong> as a co-founder.</p>
    <p><strong>Proposed Role:</strong> ${roleProposed}</p>
    <p><strong>Pitch Message:</strong></p>
    <blockquote style="background-color: #1e1b4b; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; color: #cbd5e1; border-radius: 6px; font-style: italic;">
      "${message}"
    </blockquote>
    <div class="btn-container">
      <a href="${frontendUrl}/dashboard" class="btn">Review Application</a>
    </div>
  `;
  const html = getSharedHtmlLayout('New Application Received', content);
  return sendEmail({ to, subject: `New co-founder application for ${startupName} 🤝`, html });
};

/**
 * Send Application Accepted Email
 */
exports.sendApplicationAcceptedEmail = async (to, name, startupName, role) => {
  const content = `
    <h1>Application Accepted! 🎉</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Congratulations! Your application to join <strong>${startupName}</strong> has been <strong>accepted</strong>.</p>
    <p>You have been added to the team roster as <strong>${role}</strong>.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/chat" class="btn">Start Collaborating</a>
    </div>
  `;
  const html = getSharedHtmlLayout('Application Accepted', content);
  return sendEmail({ to, subject: `Welcome to the team of ${startupName}! 🎉`, html });
};

exports.sendApplicationRejectedEmail = async (to, name, startupName) => {
  const content = `
    <h1>Application Update 📋</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thank you for your interest in joining <strong>${startupName}</strong>. The founder has reviewed your application and decided not to proceed with collaboration at this time.</p>
    <p>We encourage you to explore other startups on the feed and connect with other builders!</p>
    <div class="btn-container">
      <a href="${frontendUrl}/" class="btn">Explore Startup Ideas</a>
    </div>
  `;
  const html = getSharedHtmlLayout('Application Roster Update', content);
  return sendEmail({ to, subject: `Application update for ${startupName} 📋`, html });
};

exports.sendApplicationStageUpdateEmail = async (to, name, startupName, role, stage) => {
  const content = `
    <h1>Application Pipeline Update 📋</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We have a pipeline update regarding your application to join <strong>${startupName}</strong> for the role of <strong>${role}</strong>.</p>
    <p>Your application status has been advanced to: <strong>${stage}</strong>.</p>
    <p>Check your candidate dashboard or chat workspace to stay updated on next steps.</p>
    <div class="btn-container">
      <a href="${frontendUrl}/dashboard" class="btn">View My Dashboard</a>
    </div>
  `;
  const html = getSharedHtmlLayout('Application Stage Update', content);
  return sendEmail({ to, subject: `Application update for ${startupName} 📋`, html });
};


/**
 * Send Offline Direct Messages Summary Email (Module 5 Batching)
 */
exports.sendOfflineMessagesSummaryEmail = async (to, name, count, senderNames) => {
  const content = `
    <h1>Unread Messages Waiting for You 💬</h1>
    <p>Hi ${name || 'there'},</p>
    <p>While you were away, you received <strong>${count}</strong> new unread direct messages on StartupHub AI from the following members:</p>
    <p style="font-size: 16px; font-weight: bold; color: #ffffff; background-color: #0c0a1a; border: 1px dashed #1e1b4b; padding: 12px; border-radius: 8px; text-align: center;">
      ${senderNames.join(', ')}
    </p>
    <div class="btn-container">
      <a href="${frontendUrl}/chat" class="btn">Open Chat & Reply</a>
    </div>
    <p>We batch notifications so that you only receive one email alert when direct messages stack up.</p>
  `;
  const html = getSharedHtmlLayout('Unread Chat Messages Waiting', content);
  return sendEmail({ to, subject: `You have ${count} unread messages waiting on StartupHub AI 💬`, html });
};

/**
 * Send Security Alert: Email Changed Email (Module 7)
 */
exports.sendEmailChangedEmail = async (oldEmail, newEmail, name) => {
  const content = `
    <h1>Security Update: Email Address Changed 🔒</h1>
    <p>Hi ${name || 'there'},</p>
    <p>This is a critical security notice that the email address associated with your StartupHub AI account was recently changed.</p>
    <p style="font-size: 14px; color: #cbd5e1; background-color: #0c0a1a; border: 1px solid #1e1b4b; padding: 15px; border-radius: 8px; line-height: 1.8;">
      <strong>Old Email:</strong> ${oldEmail}<br>
      <strong>New Email:</strong> ${newEmail}
    </p>
    <p>If you initiated this change, you can safely disregard this warning. Confirmations have been dispatched to your new address.</p>
    <p>If you did not request this update, someone may have accessed your account. Please reach out to support immediately to lock your account.</p>
  `;
  const html = getSharedHtmlLayout('Security Email Alert', content);
  return sendEmail({ to: oldEmail, subject: 'StartupHub AI — Critical Security Alert: Email Changed 🔒', html });
};

/**
 * Send Admin Announcement Email (Module 8)
 */
exports.sendAnnouncementEmail = async (to, name, announcementTitle, announcementMessage) => {
  const content = `
    <h1>Platform Announcement 📢</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We have an exciting platform announcement from the StartupHub AI team:</p>
    <div style="background-color: #0c0a1a; border: 1px solid #1e1b4b; padding: 25px; border-radius: 12px; margin: 25px 0;">
      <h2 style="color: #00f2fe; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">${announcementTitle}</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0; whitespace: pre-line;">${announcementMessage}</p>
    </div>
    <div class="btn-container">
      <a href="${frontendUrl}/" class="btn">Launch StartupHub AI</a>
    </div>
    <p>You received this email because you are a registered member of our builder acceleration community.</p>
  `;
  const html = getSharedHtmlLayout(announcementTitle, content);
  return sendEmail({ to, subject: `Announcement: ${announcementTitle} 📢`, html });
};

/**
 * Send Weekly Performance Digest Email to Founders (Module 9)
 */
exports.sendFounderWeeklyDigestEmail = async (to, name, startupsStats) => {
  let statsHtml = '';
  for (const stat of startupsStats) {
    statsHtml += `
      <div style="background-color: #0c0a1a; border: 1px solid #1e1b4b; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #1e1b4b; padding-bottom: 8px;">
          ${stat.startupName}
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 10px 5px; border-bottom: 1px solid #1e1b4b; border-right: 1px solid #1e1b4b;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">Total Cumulative Views</span>
              <span style="font-size: 20px; font-weight: 800; color: #00f2fe;">${stat.views}</span>
            </td>
            <td style="width: 50%; padding: 10px 5px; border-bottom: 1px solid #1e1b4b; padding-left: 15px;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">New Votes (Past Week)</span>
              <span style="font-size: 20px; font-weight: 800; color: #7c3aed;">+${stat.newVotes}</span>
            </td>
          </tr>
          <tr>
            <td style="width: 50%; padding: 10px 5px; border-right: 1px solid #1e1b4b; padding-top: 15px;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">New Waitlist Leads</span>
              <span style="font-size: 20px; font-weight: 800; color: #10b981;">+${stat.newWaitlist}</span>
            </td>
            <td style="width: 50%; padding: 10px 5px; padding-left: 15px; padding-top: 15px;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">New Co-founder Apps</span>
              <span style="font-size: 20px; font-weight: 800; color: #f59e0b;">+${stat.newApplications}</span>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const content = `
    <h1>Weekly Performance Digest 📊</h1>
    <p>Hi ${name || 'Founder'},</p>
    <p>Here is your weekly traction and validation performance summary for your startup projects on StartupHub AI:</p>
    ${statsHtml}
    <div class="btn-container">
      <a href="${frontendUrl}/dashboard" class="btn">Go to Founder Dashboard</a>
    </div>
    <p>Keep validation high, gather feedback, and accelerate your building loop!</p>
  `;
  const html = getSharedHtmlLayout('Weekly Performance Digest', content);
  return sendEmail({ to, subject: 'Weekly Startup Performance Digest 📊', html });
};

/**
 * Send Platform Weekly Roundup (Trending Startups) Email (Module 9)
 */
exports.sendPlatformWeeklyRoundupEmail = async (to, name, trendingStartups) => {
  let listHtml = '';
  let index = 1;
  for (const startup of trendingStartups) {
    listHtml += `
      <div style="background-color: #0c0a1a; border: 1px solid #1e1b4b; padding: 20px; border-radius: 12px; margin-bottom: 15px; width: 100%; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 40px; font-size: 24px; font-weight: 900; color: #00f2fe; padding-right: 10px;">
              #${index++}
            </td>
            <td style="vertical-align: top;">
              <h3 style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 4px 0;">
                ${startup.startupName}
              </h3>
              <span style="font-size: 10px; text-transform: uppercase; color: #7c3aed; font-weight: 700; background-color: rgba(124,58,237,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">
                ${startup.category}
              </span>
              <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0; line-height: 1.4;">
                ${startup.tagline}
              </p>
              <div style="font-size: 12px; font-weight: 600; color: #10b981;">
                🔥 +${startup.newVotes} votes this week
              </div>
              <div style="margin-top: 12px;">
                <a href="${frontendUrl}/startup/${startup.startupId}" style="color: #00f2fe; text-decoration: none; font-size: 12px; font-weight: 700;">
                  View Startup Pitch &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const content = `
    <h1>Weekly Trending Startups 🚀</h1>
    <p>Hi ${name || 'Builder'},</p>
    <p>Check out the most upvoted and trending validation concepts in the StartupHub AI community this past week:</p>
    ${listHtml}
    <div class="btn-container" style="margin-top: 30px;">
      <a href="${frontendUrl}/" class="btn">Explore All Concepts</a>
    </div>
    <p>Want to support or collaborate with fellow builders? Submit votes, join waitlists, or apply for matching roles directly on the platform!</p>
  `;
  const html = getSharedHtmlLayout('Weekly Trending Startups', content);
  return sendEmail({ to, subject: 'Weekly Trending Startups on StartupHub AI 🚀', html });
};




