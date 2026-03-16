/**
 * List Raw HTML widget IDs for a Page Builder page (WidgetTypeID 18 only).
 * Reads from process.env (when set by setup script) or .env.axero.
 *
 * With AXERO_OUTPUT_JSON=1: prints a JSON array of { WidgetID, WidgetTitle } to stdout (for setup validation).
 * Otherwise: prints a human-readable table (WidgetID, Title) to stdout.
 *
 * Prerequisites: AXERO_BEARER_TOKEN and AXERO_DEMO_SITE from .env.axero or process.env.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env.axero');
const RAW_HTML_TYPE_ID = 18;

function loadEnv() {
  let token = process.env.AXERO_BEARER_TOKEN || null;
  let siteUrl = process.env.AXERO_DEMO_SITE || null;
  let pageId = process.env.AXERO_PAGE_ID ? parseInt(process.env.AXERO_PAGE_ID, 10) : 38;
  let spaceId = process.env.AXERO_SPACE_ID ? parseInt(process.env.AXERO_SPACE_ID, 10) : 6;

  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!token && t.startsWith('AXERO_BEARER_TOKEN=')) token = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
      if (!siteUrl && t.startsWith('AXERO_DEMO_SITE=')) siteUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
      if (t.startsWith('AXERO_PAGE_ID=')) pageId = parseInt(line.split('=')[1].trim(), 10) || 38;
      if (t.startsWith('AXERO_SPACE_ID=')) spaceId = parseInt(line.split('=')[1].trim(), 10) || 6;
    }
  }

  if (!token || !siteUrl) {
    console.error('❌ .env.axero must have AXERO_BEARER_TOKEN and AXERO_DEMO_SITE. Run: npm run axero:setup');
    process.exit(1);
  }
  return { token, siteUrl, pageId, spaceId };
}

function isRawHtmlWidget(w) {
  return w.WidgetTypeID === RAW_HTML_TYPE_ID || w.WidgetTypeName === 'Raw HTML';
}

async function main() {
  const { token, siteUrl, pageId, spaceId } = loadEnv();
  const baseUrl = (siteUrl || '').replace(/\/$/, '');
  const url = `${baseUrl}/api/pb/pages/${pageId}`;
  const params = { format: 'json', locale: 'en-US', spaceID: spaceId };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const res = await axios.get(url, { headers, params });
  const data = res.data;
  const pageName = data.PageName || data.PageID || pageId;

  if (!data.WidgetsFlattened || !Array.isArray(data.WidgetsFlattened)) {
    if (process.env.AXERO_OUTPUT_JSON === '1' || process.env.AXERO_OUTPUT_JSON === 'true') {
      console.log('[]');
    } else {
      console.log('Page', pageId, '(', pageName, ') has no widgets.');
    }
    return;
  }

  const rawWidgets = data.WidgetsFlattened.filter(isRawHtmlWidget).map((w) => ({
    WidgetID: w.WidgetID,
    WidgetTitle: w.WidgetTitle || '',
  }));

  const outputJson = process.env.AXERO_OUTPUT_JSON === '1' || process.env.AXERO_OUTPUT_JSON === 'true';

  if (outputJson) {
    console.log(JSON.stringify(rawWidgets));
    return;
  }

  console.log('Page', pageId, '(', pageName, ') – Raw HTML widgets only:');
  console.log('');
  if (rawWidgets.length === 0) {
    console.log('  No Raw HTML widgets on this page.');
    console.log('');
    return;
  }
  console.log('  WidgetID  Title');
  console.log('  --------  -----');
  for (const w of rawWidgets) {
    const id = String(w.WidgetID).padEnd(9);
    const title = (w.WidgetTitle || '').slice(0, 50);
    console.log('  ' + id + title);
  }
  console.log('');
  console.log('Enter one of the WidgetID values above when configuring deploy (e.g. in npm run setup).');
}

main().catch((err) => {
  if (process.env.AXERO_OUTPUT_JSON === '1' || process.env.AXERO_OUTPUT_JSON === 'true') {
    console.log('[]');
  } else {
    console.error('❌ Request failed:', err.response?.status, err.response?.statusText);
    if (err.response?.data) console.error(err.response.data);
  }
  process.exit(1);
});
