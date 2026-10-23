import fs from 'node:fs'
import path from 'node:path'
import { put } from '@vercel/blob'
import { chromium } from 'playwright'

const MOCKUP_SVG_PATH = path.join(process.cwd(), 'assets', 'db-2026-mock.svg')

async function renderMockupSvgToPdf(filePath: string) {
  const svg = fs.readFileSync(MOCKUP_SVG_PATH, 'utf8')
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: 3300, height: 2550 },
      deviceScaleFactor: 1
    })

    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#fff;">${svg}</body></html>`,
      { waitUntil: 'load' }
    )

    await page.pdf({
      path: filePath,
      width: '3300px',
      height: '2550px',
      printBackground: true,
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true
    })
  } finally {
    await browser.close()
  }
}

async function uploadPdfToBlob(filePath: string, orderId: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return null
  }

  const buffer = fs.readFileSync(filePath)
  const file = new File([buffer], `${orderId}.pdf`, { type: 'application/pdf' })
  const result = await put(`${orderId}.pdf`, file, {
    access: 'public',
    addRandomSuffix: false
  })

  return result.url
}

export async function generateOrderPdf({
  orderId,
  sheets,
  variant,
  customerName
}: {
  orderId: string
  sheets: number
  variant: string
  customerName: string
}) {
  const tempDir = path.join(process.cwd(), 'server', 'storage', 'tmp')
  fs.mkdirSync(tempDir, { recursive: true })

  const filePath = path.join(tempDir, `${orderId}.pdf`)
  await renderMockupSvgToPdf(filePath)

  const blobUrl = await uploadPdfToBlob(filePath, orderId)

  return {
    filePath,
    blobUrl,
    fileName: `${orderId}.pdf`
  }
}
