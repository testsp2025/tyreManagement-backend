const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Use dynamic import for puppeteer to avoid startup failure if optional dep missing
async function getPuppeteer() {
  try {
    return require('puppeteer');
  } catch (err) {
    throw new Error('Puppeteer is not installed. Install optional dependency puppeteer.');
  }
}

// POST /api/pdf/generate
// body: { html: string }
router.post('/generate', async (req, res) => {
  const { html } = req.body || {};
  if (!html) return res.status(400).json({ error: 'Missing html body' });

  let browser;
  try {
    const puppeteer = await getPuppeteer();
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });

    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed', err);
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
