import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // Use TLS, not SSL
  requireTLS: true, // Force TLS encryption
  auth: {
    user: process.env.SMTP_USER || "noreply@example.com",
    pass: process.env.SMTP_PASS || "defaultpass"
  },
  // Add connection timeout and debug options
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  debug: process.env.NODE_ENV === 'development'
});

// Log configuration on startup
console.log("Email configuration:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER ? "****" + process.env.SMTP_USER.slice(-10) : "not set",
  configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
});

export const sendWelcomeEmail = async (email: string, name: string, role: string) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || "stg.violin@gmail.com",
    to: email,
    subject: `Welcome to Rise Up Creators!`,
    html: `
      <div style="background: #000; color: #fff; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #FF3C2A;">Welcome to Rise Up Creators!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining Rise Up Creators as ${role === 'artist' ? 'an artist' : 'a fan'}!</p>
        ${role === 'artist' ? 
          '<p>You can now upload your music, create events, sell merch, and connect with your fans.</p>' :
          '<p>Discover amazing music, follow your favorite artists, and enjoy exclusive content.</p>'
        }
        <p>Get started by exploring the platform.</p>
        <p>Best regards,<br>The Rise Up Creators Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || "stg.violin@gmail.com",
      to: email,
      subject: "Reset Your Password - Rise Up Creators",
      html: `
        <div style="background: #000; color: #fff; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #FF3C2A;">Reset Your Password</h1>
          <p>You requested a password reset. Use the code below:</p>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #FF3C2A; margin: 0; text-align: center;">${resetToken}</h2>
          </div>
          <p>This code expires in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully to:", email);
    return result;
  } catch (error: any) {
    console.error("Failed to send password reset email:", {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

export const sendOrderConfirmation = async (email: string, orderDetails: any) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || "stg.violin@gmail.com",
    to: email,
    subject: "Order Confirmation - Rise Up Creators",
    html: `
      <div style="background: #000; color: #fff; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #FF3C2A;">Order Confirmed!</h1>
        <p>Your order #${orderDetails.id} has been confirmed.</p>
        <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount}</p>
          <p><strong>Status:</strong> ${orderDetails.status}</p>
        </div>
        <p>Thank you for your purchase!</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendTicketEmail = async (email: string, ticketDetails: any, qrCode: string) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || "stg.violin@gmail.com",
    to: email,
    subject: `Your Ticket for ${ticketDetails.eventTitle}`,
    html: `
      <div style="background: #000; color: #fff; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #FF3C2A;">Your Event Ticket</h1>
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>${ticketDetails.eventTitle}</h2>
          <p><strong>Date:</strong> ${new Date(ticketDetails.date).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${ticketDetails.location}</p>
          <p><strong>Ticket ID:</strong> ${ticketDetails.ticketId}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrCode}" alt="Ticket QR Code" style="max-width: 200px;">
        </div>
        <p>Present this QR code at the venue for entry.</p>
      </div>
    `,
    attachments: [
      {
        filename: 'ticket-qr.png',
        content: qrCode.split(',')[1],
        encoding: 'base64',
        cid: 'qr-code'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

export const sendArtistVerificationEmail = async (email: string, artistName: string, status: 'approved' | 'rejected', reason?: string) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || "stg.violin@gmail.com",
    to: email,
    subject: `Artist Verification ${status === 'approved' ? 'Approved' : 'Update'} - Rise Up Creators`,
    html: `
      <div style="background: #000; color: #fff; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: ${status === 'approved' ? '#22c55e' : '#ef4444'};">
          Artist Verification ${status === 'approved' ? 'Approved!' : 'Update'}
        </h1>
        <p>Hi ${artistName},</p>
        ${status === 'approved' ? 
          '<p>Congratulations! Your artist profile has been verified. You can now publish music and create content.</p>' :
          `<p>Your artist verification was not approved. ${reason ? `Reason: ${reason}` : ''}</p><p>You can reapply after addressing the issues.</p>`
        }
        <p>Best regards,<br>The Rise Up Creators Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};
