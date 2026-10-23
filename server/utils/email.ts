import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'

const COLOR_MAP: Record<string, string> = {
  '1': '#facc15',
  '2': '#1d4ed8',
  '3': '#ef4444',
  '4': '#22c55e',
  '5': '#a855f7',
  '6': '#f59e0b'
}

const LABELS = ['shin', 'hey', 'gimmel', 'nūn']

function normalizeDigits(value: string, fallback: string[] = []) {
  const digits = (value || '').replace(/\s+/g, '').split('').filter((entry) => /\d/.test(entry))
  if (digits.length >= 128) {
    return digits.slice(0, 128).join('')
  }

  if (fallback.length) {
    return fallback.slice(0, 128).join('')
  }

  return Array.from({ length: 128 }, (_, index) => String((index % 6) + 1)).join('')
}

function drawBoard(doc: PDFKit.PDFDocument, digits: string, x: number, y: number) {
  const boardWidth = 150
  const boardHeight = 150
  doc.save()
  doc.fillColor('#ffffff')
  doc.rect(x, y, boardWidth, boardHeight).fill()

  LABELS.forEach((label, idx) => {
    const labelX = x + 18 + idx * 34
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text(label, labelX, y + 8, {
      width: 32,
      align: 'center'
    })
  })

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const digit = digits[row * 4 + col] || '1'
      const cx = x + 23 + col * 34
      const cy = y + 46 + row * 28
      const color = COLOR_MAP[digit] || '#facc15'
      doc.fillColor(color).circle(cx, cy, 12).fill()
    }
  }

  doc.restore()
}

export async function generateOrderPdf({
  orderId,
  sheets,
  variant,
  customerName,
  paperSize = 'letter',
  seedStrings = []
}: {
  orderId: string
  sheets: number
  variant: string
  customerName: string
  paperSize?: 'letter' | 'a4'
  seedStrings?: string[]
}) {
  const dir = path.join(process.cwd(), 'server', 'storage', 'pdfs')
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${orderId}.pdf`)
  const pageSize = paperSize === 'a4' ? 'A4' : 'LETTER'
  const doc = new PDFDocument({ size: pageSize, margin: 22, layout: 'portrait' })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  const pageWidth = pageSize === 'A4' ? 595.28 : 612
  const pageHeight = pageSize === 'A4' ? 841.89 : 792

  doc.fillColor('#f5f5f4').rect(0, 0, pageWidth, pageHeight).fill()
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(46).text('DREIDEL BINGO', 40, 18, {
    align: 'center',
    width: pageWidth - 80
  })

  const rows = 2
  const cols = 4
  const boardWidth = 150
  const boardHeight = 150
  const gapX = 14
  const gapY = 18
  const startX = 28
  const startY = 80

  const actualSeedStrings = seedStrings.length ? seedStrings : Array.from({ length: Math.max(sheets, 1) }, (_, index) => normalizeDigits(String(index + 1)))

  for (let sheetIndex = 0; sheetIndex < Number(sheets); sheetIndex++) {
    const seedString = normalizeDigits(actualSeedStrings[sheetIndex] || '', Array.from({ length: 128 }, (_, idx) => String((idx % 6) + 1)))

    for (let boardIndex = 0; boardIndex < 8; boardIndex++) {
      const row = Math.floor(boardIndex / cols)
      const col = boardIndex % cols
      const x = startX + col * (boardWidth + gapX)
      const y = startY + row * (boardHeight + gapY)
      const digits = seedString.slice(boardIndex * 16, boardIndex * 16 + 16)
      drawBoard(doc, digits, x, y)
    }

    const footerY = startY + rows * (boardHeight + gapY) + 16
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(`${customerName || 'Dreidel Bingo'} | ${variant} | ${sheetIndex + 1}/${sheets}`, 40, footerY, {
      width: pageWidth - 80,
      align: 'center'
    })

    if (sheetIndex < Number(sheets) - 1) {
      doc.addPage({ size: pageSize, margin: 22, layout: 'portrait' })
      doc.fillColor('#f5f5f4').rect(0, 0, pageWidth, pageHeight).fill()
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(46).text('DREIDEL BINGO', 40, 18, {
        align: 'center',
        width: pageWidth - 80
      })
    }
  }

  doc.end()

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  return filePath
}
