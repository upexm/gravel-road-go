/**
 * Push one or more HTML files to Page Builder Raw HTML widget(s).
 * All config is read from .env.axero: AXERO_DEMO_SITE, AXERO_BEARER_TOKEN,
 * AXERO_PAGE_ID, AXERO_SPACE_ID, and either:
 *   - single-widget mode: AXERO_WIDGET_ID, AXERO_HTML_FILE
 *   - multi-widget mode: AXERO_WIDGETS (comma-separated widgetId:filename pairs)
 *
 * Prerequisites: run npm run setup first to create .env.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env.axero');

function parseEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('❌ .env.axero not found. Run: npm run axero:setup');
    process.exit(1);
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const env = { };
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx <= 0) continue;
    const key = t.slice(0, idx).trim();
    const value = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

function loadEnv() {
  const env = parseEnvFile();

  const token = env.AXERO_BEARER_TOKEN || null;
  const siteUrl = env.AXERO_DEMO_SITE || null;
  const pageId = env.AXERO_PAGE_ID ? parseInt(env.AXERO_PAGE_ID, 10) || 38 : 38;
  const spaceId = env.AXERO_SPACE_ID ? parseInt(env.AXERO_SPACE_ID, 10) || 6 : 6;

  if (!token || !siteUrl) {
    console.error('❌ .env.axero must have AXERO_BEARER_TOKEN and AXERO_DEMO_SITE. Run: npm run axero:setup');
    process.exit(1);
  }

  const widgetsRaw = env.AXERO_WIDGETS || '';
  let mappings = [];

  if (widgetsRaw && widgetsRaw.trim() !== '') {
    mappings = widgetsRaw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => {
        const idx = part.indexOf(':');
        if (idx <= 0) {
          console.warn('⚠️ Skipping malformed AXERO_WIDGETS entry (missing colon):', part);
          return null;
        }
        const idStr = part.slice(0, idx).trim();
        const file = part.slice(idx + 1).trim();
        const widgetId = parseInt(idStr, 10);
        if (!Number.isFinite(widgetId)) {
          console.warn('⚠️ Skipping AXERO_WIDGETS entry with non-numeric widget ID:', part);
          return null;
        }
        if (!file) {
          console.warn('⚠️ Skipping AXERO_WIDGETS entry with empty filename:', part);
          return null;
        }
        return { widgetId, htmlFile: file };
      })
      .filter(Boolean);
  }

  if (mappings.length > 0) {
    return {
      mode: 'multi',
      token,
      siteUrl,
      pageId,
      spaceId,
      mappings,
    };
  }

  const widgetIdStr = env.AXERO_WIDGET_ID || '';
  const htmlFile = env.AXERO_HTML_FILE || 'my-widget.html';
  const widgetId = widgetIdStr ? parseInt(widgetIdStr, 10) : NaN;

  if (Number.isFinite(widgetId)) {
    return {
      mode: 'single',
      token,
      siteUrl,
      pageId,
      spaceId,
      widgetId,
      htmlFile,
    };
  }

  console.error('❌ .env.axero must have either AXERO_WIDGETS (for multi-widget deploy) or AXERO_WIDGET_ID/AXERO_HTML_FILE (for single-widget deploy). Run: npm run axero:setup');
  process.exit(1);
}

function findAndUpdateWidget(node, widgetId, html) {
  if (!node) return false;

  const id = node.WidgetID ?? node.ContentID ?? node.WidgetId;
  if (id != null && Number(id) === Number(widgetId)) {
    let props = node.WidgetProperties;
    if (typeof props === 'string') {
      try {
        props = JSON.parse(props);
      } catch (_) {
        props = { };
      }
    }
    if (props == null) props = { };
    props.RawHtml = html;
    node.WidgetProperties = typeof node.WidgetProperties === 'string' ? JSON.stringify(props) : props;
    return true;
  }

  if (Array.isArray(node.ChildWidgets)) {
    for (const child of node.ChildWidgets) {
      if (findAndUpdateWidget(child, widgetId, html)) return true;
    }
  }
  if (Array.isArray(node.Children)) {
    for (const child of node.Children) {
      if (findAndUpdateWidget(child, widgetId, html)) return true;
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (findAndUpdateWidget(child, widgetId, html)) return true;
    }
  }
  if (Array.isArray(node.Rows)) {
    for (const row of node.Rows) {
      if (findAndUpdateWidget(row, widgetId, html)) return true;
    }
  }
  if (Array.isArray(node.Widgets)) {
    for (const w of node.Widgets) {
      if (findAndUpdateWidget(w, widgetId, html)) return true;
    }
  }
  if (node.Row && Array.isArray(node.Row)) {
    for (const cell of node.Row) {
      if (findAndUpdateWidget(cell, widgetId, html)) return true;
    }
  }
  return false;
}

async function push() {
  const envConfig = loadEnv();
  const { token, siteUrl, pageId, spaceId } = envConfig;

  // Validate that all referenced HTML files exist before making network calls.
  if (envConfig.mode === 'single') {
    const htmlPath = path.join(PROJECT_ROOT, envConfig.htmlFile);
    if (!fs.existsSync(htmlPath)) {
      console.error('❌', envConfig.htmlFile, 'not found at', htmlPath);
      process.exit(1);
    }
  } else if (envConfig.mode === 'multi') {
    const missing = [];
    for (const mapping of envConfig.mappings) {
      const htmlPath = path.join(PROJECT_ROOT, mapping.htmlFile);
      if (!fs.existsSync(htmlPath)) {
        missing.push({ widgetId: mapping.widgetId, htmlFile: mapping.htmlFile, path: htmlPath });
      }
    }
    if (missing.length > 0) {
      console.error('❌ One or more HTML files referenced in AXERO_WIDGETS were not found:');
      for (const m of missing) {
        console.error('   - Widget', m.widgetId, '→', m.htmlFile, 'not found at', m.path);
      }
      console.error('   Create the missing file(s) or update AXERO_WIDGETS in .env, then retry.');
      process.exit(1);
    }
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const getUrl = `${siteUrl}/api/pb/pages/${pageId}`;
  const params = { format: 'json', locale: 'en-US', spaceID: spaceId };

  let pageData;
  try {
    const res = await axios.get(getUrl, { headers, params });
    pageData = res.data.ResponseData ?? res.data;
    if (!pageData) {
      console.error('❌ No page data in response');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ GET page failed:', err.response?.status, err.response?.statusText);
    if (err.response?.data) console.error(err.response.data);
    process.exit(1);
  }

  let layoutStr = pageData.widgetLayoutString ?? pageData.WidgetLayoutString;
  if (layoutStr == null) {
    console.error('❌ Page has no widgetLayoutString / WidgetLayoutString');
    process.exit(1);
  }

  let layout;
  try {
    layout = typeof layoutStr === 'string' ? JSON.parse(layoutStr) : layoutStr;
  } catch (e) {
    console.error('❌ Failed to parse widget layout JSON:', e.message);
    process.exit(1);
  }

  if (envConfig.mode === 'single') {
    const htmlPath = path.join(PROJECT_ROOT, envConfig.htmlFile);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const updated = findAndUpdateWidget(layout, envConfig.widgetId, html);
    if (!updated) {
      console.error('❌ Widget', envConfig.widgetId, 'not found in page layout');
      process.exit(1);
    }
  } else {
    const missingIds = [];
    for (const mapping of envConfig.mappings) {
      const htmlPath = path.join(PROJECT_ROOT, mapping.htmlFile);
      const html = fs.readFileSync(htmlPath, 'utf8');
      const updated = findAndUpdateWidget(layout, mapping.widgetId, html);
      if (!updated) {
        missingIds.push(mapping.widgetId);
      }
    }
    if (missingIds.length > 0) {
      console.error('❌ The following widget IDs from AXERO_WIDGETS were not found in the page layout:', missingIds.join(', '));
      console.error('   Verify the IDs via npm run list-widgets and update AXERO_WIDGETS in .env.');
      process.exit(1);
    }
  }

  const updatedLayoutString = JSON.stringify(layout);
  const payload = {
    ...pageData,
    widgetLayoutString: updatedLayoutString,
    WidgetLayoutString: updatedLayoutString,
    StatusID: 1,
  };

  const putUrl = `${siteUrl}/api/pb/pages/${pageId}`;
  try {
    await axios.put(putUrl, payload, { headers, params });
    if (envConfig.mode === 'single') {
      console.log('✅ Pushed', envConfig.htmlFile, 'to Page Builder page', pageId, 'widget', envConfig.widgetId);
    } else {
      const summary = envConfig.mappings.map((m) => `${m.widgetId}←${m.htmlFile}`).join(', ');
      console.log('✅ Pushed multi-widget mapping to Page Builder page', pageId);
      console.log('   Widgets/files:', summary);
    }
    console.log('🔗 Verify at:', `${siteUrl}/spaces/${spaceId}/`);
  } catch (err) {
    console.error('❌ PUT page failed:', err.response?.status, err.response?.statusText);
    if (err.response?.data) console.error(err.response.data);
    process.exit(1);
  }
}

push();
