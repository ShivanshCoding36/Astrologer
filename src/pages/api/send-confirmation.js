import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, slot, meetLink } = req.body;

    const formattedTime = new Date(slot).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    await resend.emails.send({
      from: 'Astro Shipra <noreply@astroshipra.com>',
      to: email,
      subject: 'Your Consultation is Confirmed ✨',
      html: `
        <h2>Hi ${name},</h2>
        <p>Your consultation has been confirmed.</p>

        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Google Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}