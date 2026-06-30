import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendTeacherCredentials(
    email: string,
    firstName: string,
    username: string,
    password: string,
  ): Promise<void> {
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f4f6f8;">
        <table width="600" cellpadding="0" cellspacing="0" style="margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#0d6efd;padding:20px;text-align:center;">
              <h2 style="color:#ffffff;margin:0;">Welcome to LAT Platform</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="font-size:14px;color:#333;">Dear ${firstName},</p>
              <p style="font-size:14px;color:#555;">Your teacher account has been created. Please find your login credentials below:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0;">
                <tr>
                  <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Username</strong></td>
                  <td style="padding:10px;border:1px solid #eee;">${username}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Password</strong></td>
                  <td style="padding:10px;border:1px solid #eee;">${password}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#555;">Login at: <a href="${process.env.LOGIN_URL}" style="color:#0d6efd;">${process.env.LOGIN_URL}</a></p>
              <p style="font-size:13px;color:#777;margin-top:30px;">Please change your password after first login.</p>
              <p style="font-size:14px;color:#333;margin-top:30px;">Regards,<br/><strong>LAT Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#999;">
              This is an automated email. Please do not reply.
            </td>
          </tr>
        </table>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Lat Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Teacher Account Credentials',
      html,
    });
  }
}
