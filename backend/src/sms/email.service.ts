import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Sends sign-in codes by email.
 *  EMAIL_PROVIDER=smtp   Gmail (or any SMTP) — SMTP_USER + SMTP_PASS (a Google “App password”). Good on your own computer or a VPS.
 *  EMAIL_PROVIDER=brevo  Brevo HTTP API — BREVO_API_KEY. Use this on hosts that block SMTP ports (e.g. Render’s free plan).
 *  EMAIL_PROVIDER=log    prints the code in the server log (development only).
 */
@Injectable()
export class EmailService {
  private log = new Logger('Email');
  private transport: nodemailer.Transporter | null = null;

  private html(code: string) {
    return `<div style="font-family:Arial,sans-serif;max-width:440px;margin:auto;padding:28px;border-radius:18px;background:#fff;border:1px solid #eee">
      <div style="font-size:22px;font-weight:800;color:#1D1617">Maa<span style="color:#A9151B">Crave</span></div>
      <p style="color:#5C5253;font-size:15px;margin:22px 0 8px">Your sign-in code is</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#A9151B">${code}</div>
      <p style="color:#8B8182;font-size:13px;margin-top:18px">It expires in 5 minutes. Never share it with anyone — MaaCrave will never ask for it.</p>
    </div>`;
  }

  async sendCode(to: string, code: string): Promise<void> {
    const provider = process.env.EMAIL_PROVIDER || 'log';
    const subject = `${code} is your MaaCrave code`;
    const text = `Your MaaCrave sign-in code is ${code}. It expires in 5 minutes. Don't share it with anyone.`;
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@maacrave.app';
    try {
      if (provider === 'smtp') {
        this.transport ??= nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 465,
          secure: (Number(process.env.SMTP_PORT) || 465) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await this.transport.sendMail({ from: `MaaCrave <${from}>`, to, subject, text, html: this.html(code) });
        return;
      }
      if (provider === 'brevo') {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': process.env.BREVO_API_KEY || '', 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ sender: { name: 'MaaCrave', email: from }, to: [{ email: to }], subject, textContent: text, htmlContent: this.html(code) }),
        });
        if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return;
      }
    } catch (e) {
      this.log.error(`Email to ${to.replace(/(.{2}).*@/, '$1***@')} failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('We couldn’t send the email. Please try again in a minute.');
    }
    if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Email is not configured.');
    this.log.warn(`[dev] Email to ${to}: your MaaCrave code is ${code}`);
  }
}
