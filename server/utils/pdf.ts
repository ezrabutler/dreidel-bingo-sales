import fs from 'node:fs'
import path from 'node:path'
import { put } from '@vercel/blob'
import { chromium } from 'playwright'

const PDF_PAGE_WIDTH = 3300
const PDF_PAGE_HEIGHT = 2550

function getPrintablePageUrl(baseUrl?: string) {
  const configured = process.env.PDF_RENDER_URL || process.env.NUXT_PUBLIC_SITE_URL || process.env.BASE_URL || baseUrl

  if (configured) {
    return new URL('/mockup', configured.endsWith('/') ? configured : `${configured}/`).toString()
  }

  return 'http://127.0.0.1:3000/mockup'
}

async function renderPageToPdf(filePath: string, pageUrl: string) {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: PDF_PAGE_WIDTH, height: PDF_PAGE_HEIGHT },
      deviceScaleFactor: 1,
      colorScheme: 'light'
    })

    await page.goto(pageUrl, {
      waitUntil: 'networkidle',
      timeout: 120000
    })

    await page.emulateMedia({ media: 'print' })

    await page.pdf({
      path: filePath,
      width: `${PDF_PAGE_WIDTH}px`,
      height: `${PDF_PAGE_HEIGHT}px`,
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
  customerName,
  seedStrings,
  paperSize,
  pageUrl
}: {
  orderId: string
  sheets: number
  variant: string
  customerName: string
  seedStrings?: string[]
  paperSize?: string
  pageUrl?: string
}) {
  const tempDir = path.join(process.cwd(), 'server', 'storage', 'tmp')
  fs.mkdirSync(tempDir, { recursive: true })

  const filePath = path.join(tempDir, `${orderId}.pdf`)
  const targetUrl = pageUrl || getPrintablePageUrl()

  await renderPageToPdf(filePath, targetUrl)

  const blobUrl = await uploadPdfToBlob(filePath, orderId)

  return {
    filePath,
    blobUrl,
    fileName: `${orderId}.pdf`,
    sheetCount: Number(sheets) || 1
  }
}
