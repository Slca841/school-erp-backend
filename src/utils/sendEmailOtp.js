import nodemailer from "nodemailer";

export const sendEmailOtp = async (toEmail, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // 👈 App Password
    }
  });

  await transporter.sendMail({
    from: `"School ERP" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Admin Verification OTP",
    html: `
      <h2>Admin Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    `
  });
};
