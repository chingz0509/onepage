import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'

const chrome = [
  process.env.CHROME_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((candidate) => candidate && existsSync(candidate))

if (!chrome) throw new Error('Chrome/Chromium not found; set CHROME_EXECUTABLE_PATH')

const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const origin = server.resolvedUrls?.local[0]
if (!origin) throw new Error('Vite did not expose a local URL')

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })

try {
  const page = await browser.newPage()
  await page.goto(`${origin}#/new`, { waitUntil: 'networkidle0' })
  await page.click('.ep-continue')
  await page.waitForSelector('.lk-input')

  await page.$eval('.lk-input', (input) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, 'https://github.com/earendil-')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const typedState = await page.$eval('.lk-slot', (slot) => ({
    reading: slot.getAttribute('aria-busy') === 'true',
    disabled: slot.querySelector('input')?.disabled,
  }))
  if (typedState.reading || typedState.disabled) {
    throw new Error(`Paused typing started reading: ${JSON.stringify(typedState)}`)
  }

  await page.$eval('.lk-input', (input) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text', 'https://github.com/earendil-works')
    input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: clipboard }))
  })
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const pastedState = await page.$eval('.lk-slot', (slot) => ({
    reading: slot.getAttribute('aria-busy') === 'true',
    disabled: slot.querySelector('input')?.disabled,
  }))
  if (!pastedState.reading || !pastedState.disabled) {
    throw new Error(`Pasted URL did not start reading: ${JSON.stringify(pastedState)}`)
  }

  console.log('PASS: typing waits for confirmation; pasting still reads automatically')
} finally {
  await browser.close()
  await server.close()
}
