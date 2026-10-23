import { defineEventHandler, getHeader, readRawBody } from 'h3'
import Stripe from 'stripe'
import { generateOrderPdf } from '../../utils/pdf'
import { saveOrder, getOrderById } from '../../utils/order-store'
import { finalizeSeedStrings, releaseReservedSeedStrings } from '../../utils/seed-strings'
import { sendOrderEmail } from '../../utils/email'

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = getHeader(event, 'stripe-signature')

  if (!stripeSecret || !webhookSecret || !signature) {
    return { received: true }
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  const rawBody = await readRawBody(event)

  if (!rawBody) {
    return { received: true }
  }

  let payload: any
  try {
    payload = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook verification failed', error)
    return { received: false }
  }

  if (payload.type === 'checkout.session.completed') {
    const session = payload.data.object as any
    const orderId = session.metadata?.orderId || session.id
    const order = await getOrderById(orderId)
    const sheets = Number(order?.sheets || session.metadata?.sheets || 1)
    const variant = order?.variant || session.metadata?.variant || '5-color'
    const name = order?.customerName || session.metadata?.name || 'Dreidel Player'
    const email = order?.email || session.metadata?.email || 'customer@example.com'
    const paperSize = order?.paperSize || session.metadata?.paperSize || 'letter'
    const reservedSeedStrings = order?.reservedSeedStrings && order.reservedSeedStrings.length ? order.reservedSeedStrings : await finalizeSeedStrings(orderId)

    const pdfResult = await generateOrderPdf({
      orderId,
      sheets,
      variant,
      customerName: name,
      paperSize,
      seedStrings: reservedSeedStrings
    })

    const finalOrder = {
      ...(order || {
        id: orderId,
        customerName: name,
        email,
        sheets,
        variant,
        paperSize,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reservedSeedStrings,
        pdfFilePath: '',
        downloadUrl: '',
        fileName: '',
        stripeSessionId: session.id
      }),
      status: 'fulfilled',
      stripeSessionId: session.id,
      pdfFilePath: pdfResult.filePath,
      pdfUrl: pdfResult.blobUrl,
      fileName: pdfResult.fileName,
      downloadUrl: pdfResult.blobUrl || `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/download/${orderId}`
    }

    await saveOrder(finalOrder)
    await finalizeSeedStrings(orderId)
    await sendOrderEmail(finalOrder)
  }

  if (payload.type === 'checkout.session.expired' || payload.type === 'checkout.session.async_payment_failed') {
    const session = payload.data.object as any
    const orderId = session.metadata?.orderId || session.id
    await releaseReservedSeedStrings(orderId)
  }

  return { received: true }
})
