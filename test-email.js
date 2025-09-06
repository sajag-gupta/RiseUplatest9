import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    debug: true
  });

  try {
    console.log('Testing email configuration...');
    console.log('SMTP User:', process.env.SMTP_USER);
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'Test Email - Rise Up Creators',
      html: '<h1>Test Email</h1><p>If you receive this, email is working!</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.response) console.error('Response:', error.response);
  }
}

testEmail();
