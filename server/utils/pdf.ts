import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'

const COLOR_MAP: Record<string, string> = {
  '1': '#facc15',
  '2': '#60a5fa',
  '3': '#f87171',
  '4': '#4ade80',
  '5': '#c084fc',
  '6': '#f59e0b'
}

export function generateUniqueSheetString(seed: number) {
  const digits: string[] = []
  for (let i = 0; i < 128; i++) {
    digits.push(String(((seed * 31 + i * 17) % 6) + 1))
  }
  return digits.join('')
}

function drawRing(doc: PDFKit.PDFDocument, x: number, y: number, radius: number, color: string) {
  doc.save()
  doc.fillColor(color)
  doc.circle(x, y, radius)
  doc.fill()
  doc.restore()
}

function drawCard(doc: PDFKit.PDFDocument, digits: string, x: number, y: number) {
  doc.save()
  doc.strokeColor('#cbd5e1')
  doc.lineWidth(1)
  doc.rect(x, y, 190, 180).stroke()

  const labels = ['shin', 'hey', 'gimmel', 'nūn']
  labels.forEach((label, index) => {
    const labelX = x + 22 + index * 44
    doc.fillColor('#0f172a')
    doc.fontSize(8).text(label, labelX, y + 10, { width: 35, align: 'center' })
  })

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col
      const digit = digits[index]
      const centerX = x + 22 + col * 42
      const centerY = y + 46 + row * 38
      drawRing(doc, centerX, centerY, 7, COLOR_MAP[digit] || '#e2e8f0')
    }
  }

  doc.restore()
}

export async function generateOrderPdf({ orderId, sheets, variant, customerName }: any) {
  const dir = path.join(process.cwd(), 'server', 'storage', 'pdfs')
  mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${orderId}.pdf`)

  const doc = new PDFDocument({ size: 'LETTER', margin: 24, layout: 'landscape' })
  const stream = doc.pipe(createWriteStream(filePath))

  doc.fillColor('#ffffff')
  doc.rect(0, 0, doc.page.width, doc.page.height).fill()
  doc.fillColor('#0f172a')

  doc.fontSize(18).text(`${customerName || 'Dreidel Bingo'} · ${variant} · ${sheets} sheet${sheets > 1 ? 's' : ''}`, 40, 22)

  for (let sheetIndex = 0; sheetIndex < Number(sheets); sheetIndex++) {
    const digits = generateUniqueSheetString(sheetIndex + 1)
    const cardLayout = [
      [0, 1, 2, 3],
      [4, 5, 6, 7]
    ]

    cardLayout.forEach((row, rowIndex) => {
      row.forEach((cardNumber) => {
        const x = 42 + (cardNumber % 4) * 200
        const y = 52 + rowIndex * 190
        drawCard(doc, digits.slice(cardNumber * 16, (cardNumber + 1) * 16), x, y)
      })
    })

    if (sheetIndex < Number(sheets) - 1) {
      doc.addPage({ size: 'LETTER', margin: 24, layout: 'landscape' })
      doc.fillColor('#ffffff')
      doc.rect(0, 0, doc.page.width, doc.page.height).fill()
      doc.fillColor('#0f172a')
    }
  }

  doc.end()

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  return filePath
}
