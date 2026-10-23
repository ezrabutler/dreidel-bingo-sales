import nodemailer from 'nodemailer'

export async function sendOrderEmail(order: any) {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || 'orders@dreidelbingo.com'

  if (!host || !user || !pass) {
    console.log(`Mock email delivery for ${order.email}: ${order.downloadUrl}`)
    return { mocked: true }
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user,
      pass
    }
  })

  await transporter.sendMail({
    from,
    to: order.email,
    subject: 'Your Dreidel Bingo printables are ready',
    html: `
      <h1>Your Dreidel Bingo order is ready.</h1>
      <p>Hello ${order.customerName || 'friend'},</p>
      <p>Your printable PDF is available here:</p>
      <p><a href="${order.downloadUrl}">${order.downloadUrl}</a></p>
      <p>Order details: ${order.sheets} sheets · ${order.variant} · ${order.paperSize === 'a4' ? 'A4' : 'Letter'}</p>
    `
  })

  return { sent: true }
}
