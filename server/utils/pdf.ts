import fs from 'node:fs'
import path from 'node:path'
import { put } from '@vercel/blob'
import { chromium } from 'playwright'

const COLOR_MAP: Record<string, string> = {
  '1': '#facc15',
  '2': '#60a5fa',
  '3': '#f87171',
  '4': '#4ade80',
  '5': '#c084fc',
  '6': '#f59e0b',
  default: '#e5e7eb'
}

const LABELS = ['shin', 'hey', 'gimmel', 'nūn']
const HEBREW_LABELS = ['ש', 'ה', 'ג', 'נ']

const PAGE_WIDTH = 3300
const PAGE_HEIGHT = 2550
const BOARD_WIDTH = 560
const BOARD_HEIGHT = 590
const GAP_X = 80
const GAP_Y = 110
const START_X = 140
const START_Y = 440

export function generateUniqueSheetString(seed: number) {
  const digits: string[] = []
  for (let i = 0; i < 128; i++) {
    digits.push(String(((seed * 31 + i * 17) % 6) + 1))
  }
  return digits.join('')
}

function buildBoardSvg(boardDigits: string, x: number, y: number, boardNumber: number) {
  const cells: string[] = []

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const index = col * 4 + row
      const value = boardDigits[index] || '0'
      const fill = COLOR_MAP[value] || COLOR_MAP.default
      const centerX = x + 80 + row * 125
      const centerY = y + 130 + col * 125
      cells.push(
        `<circle cx="${centerX}" cy="${centerY}" r="42" fill="${fill}" />`
      )
    }
  }

  const labels = LABELS.map((label, index) => {
    const labelX = x + 70 + index * 140
    const glyphX = x + 72 + index * 140
    return `
      <g>
        <text x="${labelX}" y="${y + 60}" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="32" fill="#111827">${label}</text>
        <text x="${glyphX}" y="${y + 110}" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#111827">${HEBREW_LABELS[index]}</text>
      </g>
    `
  }).join('')

  return `
    <g>
      <rect x="${x}" y="${y}" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" fill="#ffffff" stroke="#d1d5db" stroke-width="2" rx="0"/>
      ${labels}
      ${cells.join('')}
      <text x="${x + 28}" y="${y + BOARD_HEIGHT + 44}" font-family="Avenir Next, Arial, sans-serif" font-size="30" fill="#111827">game #${boardNumber}</text>
    </g>
  `
}

function buildSheetSvg(sheetDigits: string) {
  const boards = [] as string[]

  for (let boardIndex = 0; boardIndex < 8; boardIndex++) {
    const col = boardIndex % 4
    const row = Math.floor(boardIndex / 4)
    const x = START_X + col * (BOARD_WIDTH + GAP_X)
    const y = START_Y + row * (BOARD_HEIGHT + GAP_Y)
    const boardDigits = sheetDigits.slice(boardIndex * 16, boardIndex * 16 + 16)
    boards.push(buildBoardSvg(boardDigits, x, y, boardIndex + 1))
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">
      <rect x="0" y="0" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>
      <text x="${PAGE_WIDTH / 2}" y="110" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-weight="800" font-size="120" fill="#111827">CJC HANUKKAH PARTY</text>
      <text x="${PAGE_WIDTH / 2}" y="230" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="64" fill="#111827">HANUKKAH 2026 / 5787</text>
      ${boards.join('')}
    </svg>
  `
}

async function renderSvgToPdf(filePath: string, svg: string) {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      deviceScaleFactor: 1
    })

    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff;">${svg}</body></html>`, {
      waitUntil: 'load'
    })

    await page.pdf({
      path: filePath,
      width: `${PAGE_WIDTH}px`,
      height: `${PAGE_HEIGHT}px`,
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

  const sheetCount = Number(sheets) || 1
  const filePath = path.join(tempDir, `${orderId}.pdf`)

  const sheetDigits = generateUniqueSheetString(1)
  const svg = buildSheetSvg(sheetDigits)
  await renderSvgToPdf(filePath, svg)

  const blobUrl = await uploadPdfToBlob(filePath, orderId)

  return {
    filePath,
    blobUrl,
    fileName: `${orderId}.pdf`,
    sheetCount
  }
}
