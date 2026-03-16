/**
 * Discovery script for Page Builder API.
 * Fetches the page and logs response structure. Reads AXERO_PAGE_ID, AXERO_SPACE_ID from .env (defaults 38, 6).
 *
 * Prerequisites: .env.axero with AXERO_BEARER_TOKEN, AXERO_DEMO_SITE. Run npm run axero:setup first.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env.axero');

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('❌ .env.axero not found. Run: npm run axero:setup');
    process.exit(1);
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  let token = null;
  let siteUrl = null;
  let pageId = 38;
  let spaceId = 6;
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t.startsWith('AXERO_BEARER_TOKEN=')) token = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    if (t.startsWith('AXERO_DEMO_SITE=')) siteUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    if (t.startsWith('AXERO_PAGE_ID=')) pageId = parseInt(line.split('=')[1].trim(), 10) || 38;
    if (t.startsWith('AXERO_SPACE_ID=')) spaceId = parseInt(line.split('=')[1].trim(), 10) || 6;
  }
  if (!token || !siteUrl) {
    console.error('❌ .env.axero must have AXERO_BEARER_TOKEN and AXERO_DEMO_SITE. Run: npm run axero:setup');
    process.exit(1);
  }
  return { token, siteUrl, pageId, spaceId };
}

async function discover() {
  const { token, siteUrl, pageId, spaceId } = loadEnv();
  const url = `${siteUrl}/api/pb/pages/${pageId}`;
  const params = { format: 'json', locale: 'en-US', spaceID: spaceId };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log('Page Builder API discovery');
  console.log('GET', url);
  console.log('params:', params);
  console.log('');

  try {
    const res = await axios.get(url, { headers, params });
    const data = res.data;
    console.log('Response keys:', Object.keys(data));
    console.log('');

    if (data.ResponseData) {
      console.log('ResponseData keys:', Object.keys(data.ResponseData));
      const page = data.ResponseData;
      if (page.widgetLayoutString != null) {
        console.log('widgetLayoutString length:', page.widgetLayoutString.length);
        try {
          const layout = JSON.parse(page.widgetLayoutString);
          console.log('Parsed widgetLayout (top-level) keys:', Object.keys(layout));
          console.log('');
          const { widgetLayoutString, ...rest } = page;
          console.log('Full ResponseData (excluding long widgetLayoutString):');
          console.log(JSON.stringify(rest, null, 2));
          console.log('');
          console.log('Parsed widgetLayout sample (first 2000 chars):');
          console.log(JSON.stringify(layout).slice(0, 2000));
        } catch (e) {
          console.log('Parse widgetLayoutString error:', e.message);
          console.log('Raw widgetLayoutString (first 500 chars):', page.widgetLayoutString.slice(0, 500));
        }
      } else {
        console.log('Full ResponseData:', JSON.stringify(data.ResponseData, null, 2));
      }
    } else {
      console.log('(No ResponseData; top-level keys shown above. Full response may be large.)');
    }
  } catch (err) {
    console.error('❌ Request failed:', err.response?.status, err.response?.statusText);
    if (err.response?.data) console.error('Body:', err.response.data);
    process.exit(1);
  }
}

discover();
