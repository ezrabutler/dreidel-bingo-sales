import fs from 'node:fs'
import path from 'node:path'
import { put } from '@vercel/blob'
import { chromium } from 'playwright'

const COLOR_MAP: Record<string, string> = {
  '1': '#ef4444',
  '2': '#facc15',
  '3': '#22c55e',
  '4': '#3b82f6',
  '5': '#a78bfa',
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

function normalizeSeedString(seed: string) {
  const digits = (seed || '').replace(/\D/g, '').slice(0, 128)
  return digits.padEnd(128, '1')
}

function getBoardRows(seed: string, boardIndex: number) {
  const boardDigits = normalizeSeedString(seed).slice(boardIndex * 16, boardIndex * 16 + 16)

  return Array.from({ length: 4 }, (_, rowIndex) => {
    return boardDigits.slice(rowIndex * 4, rowIndex * 4 + 4)
  })
}

function buildBoardHtml(seed: string, boardIndex: number) {
  const rows = getBoardRows(seed, boardIndex)

  const cells = rows
    .map((row) => {
      return row
        .map((digit) => {
          const fill = COLOR_MAP[digit] || COLOR_MAP.default
          return `<div class="dot" style="background:${fill};"></div>`
        })
        .join('')
    })
    .join('')

  const labels = LABELS.map((label, index) => {
    return `
      <div class="label-col">
        <div class="label">${label}</div>
        <div class="glyph">${HEBREW_LABELS[index]}</div>
      </div>
    `
  }).join('')

  return `
    <div class="board">
      <div class="labels">${labels}</div>
      <div class="grid">${cells}</div>
      <div class="game-label">game #${boardIndex + 1}</div>
    </div>
  `
}

function buildPageHtml(seed: string) {
  const boards = Array.from({ length: 8 }, (_, index) => buildBoardHtml(seed, index)).join('')

  return `
    <div class="page">
      <div class="page-header">
        <div class="title">CJC HANUKKAH PARTY</div>
        <div class="subtitle">HANUKKAH 2026 / 5787</div>
      </div>
      <div class="board-grid">${boards}</div>
    </div>
  `
}

async function renderHtmlToPdf(filePath: string, pagesHtml: string) {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      deviceScaleFactor: 1
    })

    await page.setContent(`<!doctype html><html><head><style>
      @page { size: 3300px 2550px; margin: 0; }
      html, body {
        margin: 0;
        background: #ffffff;
        font-family: Arial, sans-serif;
      }
      body {
        padding: 0;
      }
      .page {
        width: ${PAGE_WIDTH}px;
        height: ${PAGE_HEIGHT}px;
        background: #ffffff;
        box-sizing: border-box;
        page-break-after: always;
        page-break-inside: avoid;
      }
      .page:last-child {
        page-break-after: auto;
      }
      .page-header {
        text-align: center;
        padding-top: 36px;
        margin-bottom: 18px;
      }
      .title {
        font-size: 78px;
        font-weight: 900;
        letter-spacing: 4px;
        color: #111827;
      }
      .subtitle {
        margin-top: 6px;
        font-size: 34px;
        letter-spacing: 2px;
        color: #111827;
      }
      .board-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: ${GAP_Y}px ${GAP_X}px;
        padding: 0 ${START_X}px;
        justify-items: center;
        align-items: start;
      }
      .board {
        width: ${BOARD_WIDTH}px;
        height: ${BOARD_HEIGHT}px;
        border: 2px solid #d1d5db;
        background: #ffffff;
        padding: 18px 20px 12px;
        box-sizing: border-box;
      }
      .labels {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 8px;
      }
      .label-col {
        text-align: center;
      }
      .label {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        text-transform: lowercase;
      }
      .glyph {
        margin-top: 2px;
        font-size: 44px;
        line-height: 1;
        font-weight: 700;
        color: #111827;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 8px;
      }
      .dot {
        width: 62px;
        height: 62px;
        border-radius: 9999px;
        background: #e5e7eb;
      }
      .game-label {
        margin-top: 16px;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        text-align: left;
      }
    </style></head><body>${pagesHtml}</body></html>`, {
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
  customerName,
  seedStrings,
  paperSize
}: {
  orderId: string
  sheets: number
  variant: string
  customerName: string
  seedStrings?: string[]
  paperSize?: string
}) {
  const tempDir = path.join(process.cwd(), 'server', 'storage', 'tmp')
  fs.mkdirSync(tempDir, { recursive: true })

  const perPageSeedStrings = (seedStrings && seedStrings.length ? seedStrings : [generateUniqueSheetString(1)])
    .slice(0, Math.max(1, Number(sheets) || 1))

  const filePath = path.join(tempDir, `${orderId}.pdf`)
  const pagesHtml = perPageSeedStrings.map(buildPageHtml).join('')

  await renderHtmlToPdf(filePath, pagesHtml)

  const blobUrl = await uploadPdfToBlob(filePath, orderId)

  return {
    filePath,
    blobUrl,
    fileName: `${orderId}.pdf`,
    sheetCount: perPageSeedStrings.length
  }
}
