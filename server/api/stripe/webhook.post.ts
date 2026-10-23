import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, getRequestURL, readBody } from 'h3'
import Stripe from 'stripe'
import { saveOrder } from '../utils/order-store'
import { finalizeSeedStrings, reserveSeedStrings } from '../utils/seed-strings'
import { generateOrderPdf } from '../utils/pdf'
import { sendOrderEmail } from '../utils/email'

const PRODUCT_PRICING = {
  '4-color': 2.5,
  '5-color': 3.5,
  '6-color': 4.5
} as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sheets = Number(body.sheets || 1)
  const variant = (body.variant || '5-color') as keyof typeof PRODUCT_PRICING
  const paperSize = body.paperSize === 'a4' ? 'a4' : 'letter'
  const name = String(body.name || 'Dreidel Player')
  const email = String(body.email || 'customer@example.com')

  if (!Number.isInteger(sheets) || sheets < 1) {
    throw createError({ status: 400, statusMessage: 'Please provide a valid number of sheets.' })
  }

  if (!(variant in PRODUCT_PRICING)) {
    throw createError({ status: 400, statusMessage: 'Unsupported color variant.' })
  }

  const orderId = randomUUID()
  const baseUrl = getRequestURL(event).origin
  const total = Number((PRODUCT_PRICING[variant] * sheets).toFixed(2))

  let reservedSeedStrings: string[] = []
  try {
    reservedSeedStrings = reserveSeedStrings(sheets, orderId)
  } catch (error) {
    throw createError({
      status: 400,
      statusMessage: error instanceof Error ? error.message : 'Insufficient printable seed strings available.'
    })
  }

  const order = {
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
    stripeSessionId: ''
  }

  saveOrder(order)

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (stripeSecretKey) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${sheets} Dreidel Bingo sheets · ${variant}` },
          unit_amount: Math.round(total * 100)
        },
        quantity: 1
      }],
      metadata: {
        orderId,
        sheets: String(sheets),
        variant,
        name,
        email,
        paperSize
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`
    })

    order.stripeSessionId = session.id
    saveOrder(order)

    return {
      url: session.url,
      orderId,
      sessionId: session.id
    }
  }

  const pdfFilePath = await generateOrderPdf({
    orderId,
    sheets,
    variant,
    customerName: name,
    paperSize,
    seedStrings: reservedSeedStrings
  })

  const fulfilledOrder = {
    ...order,
    status: 'fulfilled',
    pdfFilePath,
    fileName: `dreidel-bingo-${sheets}-sheets-${variant}.pdf`,
    downloadUrl: `${baseUrl}/api/download/${orderId}`
  }

  finalizeSeedStrings(orderId)
  saveOrder(fulfilledOrder)
  await sendOrderEmail(fulfilledOrder)

  return {
    orderId,
    url: `${baseUrl}/success?orderId=${orderId}`
  }
})
