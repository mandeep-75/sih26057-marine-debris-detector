import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'

const shots = mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true }) || ''
const OUT = new URL('../shots/', import.meta.url).pathname

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:5173/')
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}01-upload-empty.png` })

await page.getByRole('button', { name: 'Load all 6' }).click()
await page.getByRole('button', { name: /Run detection on 6 scans/ }).click()
await page.getByText(/Scan complete —/).waitFor({ timeout: 30000 })
await page.screenshot({ path: `${OUT}02-upload-done.png` })

await page.getByRole('tab', { name: 'Review Detections' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}03-review.png` })

await page.getByRole('tab', { name: 'Insights' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}04-insights.png` })

// 5) Map — set one batch coordinate, screenshot located map
await page.getByRole('tab', { name: 'Map & Report' }).click()
const fields = page.locator('input[type="text"]')
await fields.nth(0).fill('8.3112')
await fields.nth(1).fill('76.943')
await fields.nth(2).fill('0.012')
await page.getByRole('button', { name: 'Apply to batch' }).click()
await page.getByText(/Batch coordinate set/).waitFor()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}05-geo-map.png` })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}06-map.png` })

console.log('errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()