/**
 * Interactive setup for Axero Page Builder deploy.
 * Prompts for site URL, bearer token, page ID, space ID, and either:
 *   - single-widget mode: widget ID (or look it up) and HTML file name
 *   - multi-widget mode: multiple widget ID ↔ HTML file mappings
 * then writes .env.axero in the project root (parent of scripts/).
 *
 * Run from project root:
 *   - Full setup (site, token, page, space, widgets): node scripts/setup-axero-env.js
 *     or: npm run axero:setup
 *   - Widgets-only setup (reuse existing site/token/page/space): node scripts/setup-axero-env.js --widgets-only
 *     or: npm run axero:setup-widgets
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env.axero');

function parseEnv(pathToEnv) {
  if (!fs.existsSync(pathToEnv)) return { };
  const content = fs.readFileSync(pathToEnv, 'utf8');
  const out = { };
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        out[key] = value;
      }
    }
  }
  return out;
}

function prompt(rl, question, defaultVal, secret = false) {
  const def = defaultVal != null && defaultVal !== '' ? ` (default: ${defaultVal})` : '';
  return new Promise((resolve) => {
    const q = question + def + ': ';
    rl.question(q, (answer) => {
      const trimmed = (answer || '').trim();
      resolve(trimmed !== '' ? trimmed : (defaultVal || ''));
    });
  });
}

function ensureStubHtml(htmlFile) {
  const htmlPath = path.join(PROJECT_ROOT, htmlFile);
  if (fs.existsSync(htmlPath)) return;
  const defaultHtml = `<!-- Axero Raw HTML widget – edit this file -->
<!-- Deploy to Page Builder is working when you see the message below -->
<div style="padding: 1rem; background: #e8f4f8; border: 1px solid #0d6efd; border-radius: 6px; font-family: sans-serif;">
  <strong style="color: #0d6efd;">✓ Page Builder deploy is working</strong>
  <p style="margin: 0.5rem 0 0; color: #333;">This content was deployed from your project. Edit <code>${htmlFile}</code> and run <code>npm run push</code> to update.</p>
</div>
`;
  try {
    fs.writeFileSync(htmlPath, defaultHtml, 'utf8');
    console.log('Created stub HTML file:', htmlFile);
  } catch (err) {
    console.log('');
    console.log('Could not create', htmlFile, '–', err.message);
  }
}

/** Resolve HTML file: if blank use default (widget-{id}.html), then ensure file exists (create stub if missing). */
function resolveHtmlFileForWidget(widgetId, userInput) {
  const filename = (userInput && userInput.trim()) || `widget-${widgetId}.html`;
  const htmlPath = path.join(PROJECT_ROOT, filename);
  if (!fs.existsSync(htmlPath)) {
    ensureStubHtml(filename);
  }
  return filename;
}

/** Fetch Raw HTML widgets (TypeID 18) as array of { WidgetID, WidgetTitle }. Returns [] on error. */
function getRawHtmlWidgetsList(siteUrl, token, pageId, spaceId) {
  const listScript = path.join(__dirname, 'list-widget-ids.js');
  try {
    const stdout = execFileSync(process.execPath, [listScript], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        AXERO_DEMO_SITE: (siteUrl || '').replace(/\/$/, ''),
        AXERO_BEARER_TOKEN: token || '',
        AXERO_PAGE_ID: String(pageId || ''),
        AXERO_SPACE_ID: String(spaceId || ''),
        AXERO_OUTPUT_JSON: '1',
      },
    });
    const list = JSON.parse(stdout.trim() || '[]');
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

function printRawWidgetsTable(widgets) {
  if (!widgets.length) return;
  console.log('');
  console.log('  WidgetID  Title');
  console.log('  --------  -----');
  for (const w of widgets) {
    const id = String(w.WidgetID).padEnd(9);
    const title = (w.WidgetTitle || '').slice(0, 50);
    console.log('  ' + id + title);
  }
  console.log('');
}

async function listWidgetsInteractive(siteUrl, token, pageId, spaceId) {
  const listScript = path.join(__dirname, 'list-widget-ids.js');
  try {
    console.log('');
    execFileSync(process.execPath, [listScript], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        AXERO_DEMO_SITE: siteUrl.replace(/\/$/, ''),
        AXERO_BEARER_TOKEN: token,
        AXERO_PAGE_ID: String(pageId),
        AXERO_SPACE_ID: String(spaceId),
      },
    });
    return true;
  } catch (err) {
    if (err.status !== undefined) {
      console.log('');
      console.log('Could not list widgets:', err.message || err.status);
    }
    console.log('You can run  npm run list-widgets  after setup to find Raw HTML widget IDs.');
    return false;
  }
}

async function configureSingleWidget(rl, existing, siteUrl, token, pageId, spaceId) {
  let widgetId = existing.AXERO_WIDGET_ID || '';

  if (siteUrl && token && pageId && spaceId) {
    const rawWidgets = getRawHtmlWidgetsList(siteUrl, token, pageId, spaceId);
    if (rawWidgets.length > 0) {
      console.log('');
      console.log('Raw HTML widgets on your page:');
      printRawWidgetsTable(rawWidgets);
      const validIds = rawWidgets.map((w) => String(w.WidgetID));
      while (true) {
        const entered = await prompt(
          rl,
          'Widget ID from the list above (or leave blank to skip)',
          widgetId || ''
        );
        if (!entered.trim()) break;
        const num = parseInt(entered.trim(), 10);
        if (!Number.isFinite(num)) {
          console.log('Please enter a numeric Widget ID.');
          continue;
        }
        if (validIds.includes(String(num))) {
          widgetId = String(num);
          break;
        }
        console.log('That Widget ID is not in the Raw HTML list. Use one of: ' + validIds.join(', '));
      }
    } else {
      const listed = await listWidgetsInteractive(siteUrl, token, pageId, spaceId);
      if (listed) {
        const chosen = await prompt(rl, 'Enter the Raw HTML widget ID to use (see list above)', widgetId || '');
        if (chosen) widgetId = chosen;
      }
    }
  }

  const htmlPrompt = await prompt(
    rl,
    'HTML file name to push (leave blank for index.html; file is created if missing)',
    existing.AXERO_HTML_FILE || 'index.html'
  );
  const htmlFile = resolveHtmlFileForWidget(widgetId || 'widget', htmlPrompt || 'index.html');

  return {
    widgetId: widgetId || '',
    htmlFile,
    widgetsMapping: '',
  };
}

async function configureMultipleWidgets(rl, existing, siteUrl, token, pageId, spaceId) {
  let rawWidgets = [];
  if (siteUrl && token && pageId && spaceId) {
    rawWidgets = getRawHtmlWidgetsList(siteUrl, token, pageId, spaceId);
    if (rawWidgets.length > 0) {
      console.log('');
      console.log('Raw HTML widgets on your page (enter Widget ID from this list):');
      printRawWidgetsTable(rawWidgets);
    } else {
      await listWidgetsInteractive(siteUrl, token, pageId, spaceId);
    }
  }

  const validIds = rawWidgets.map((w) => String(w.WidgetID));

  const mappings = [];
  if (existing.AXERO_WIDGETS) {
    const parts = existing.AXERO_WIDGETS.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(':');
      if (idx <= 0) continue;
      const id = trimmed.slice(0, idx).trim();
      const file = trimmed.slice(idx + 1).trim();
      if (id && file) {
        mappings.push({ widgetId: id, htmlFile: file });
      }
    }
  }

  console.log('');
  console.log('Configure multiple Raw HTML widgets. Enter a Widget ID from the list, then an HTML file.');
  console.log('Leave HTML file blank to create a default file (e.g. widget-101.html). Leave Widget ID blank when done.');

  while (true) {
    const widgetIdInput = await prompt(rl, 'Widget ID (leave blank to finish)', '');
    if (!widgetIdInput.trim()) break;
    const numeric = parseInt(widgetIdInput.trim(), 10);
    if (!Number.isFinite(numeric)) {
      console.log('Please enter a numeric Widget ID.');
      continue;
    }
    if (validIds.length > 0 && !validIds.includes(String(numeric))) {
      console.log('That Widget ID is not in the Raw HTML list. Use one of: ' + validIds.join(', '));
      continue;
    }
    const htmlInput = await prompt(
      rl,
      `HTML file for widget ${numeric} (leave blank to create widget-${numeric}.html)`,
      ''
    );
    const htmlFile = resolveHtmlFileForWidget(numeric, htmlInput);
    mappings.push({ widgetId: String(numeric), htmlFile });
  }

  if (mappings.length === 0) {
    console.log('');
    console.log('No widget mappings were entered.');
    const choice = await prompt(
      rl,
      'What would you like to do? (1) Set up a single widget now  (2) Retry multiple-widget mapping  (3) Quit and run setup/setup-widgets later',
      '3'
    );
    const c = (choice || '3').trim();
    if (c === '1') {
      return await configureSingleWidget(rl, existing, siteUrl, token, pageId, spaceId);
    }
    if (c === '2') {
      return await configureMultipleWidgets(rl, existing, siteUrl, token, pageId, spaceId);
    }
    return {
      quit: true,
      widgetId: '',
      htmlFile: '',
      widgetsMapping: '',
    };
  }

  const widgetsMapping = mappings.map((m) => `${m.widgetId}:${m.htmlFile}`).join(',');

  return {
    widgetId: '',
    htmlFile: '',
    widgetsMapping,
  };
}

async function main() {
  const widgetsOnly = process.argv.includes('--widgets-only');
  const existing = parseEnv(ENV_PATH);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('');
  console.log('Axero Page Builder – deploy setup');
  console.log('Values are saved to .env.axero in the project root.');
  console.log('(Leave blank to keep existing value if .env.axero already exists.)');
  console.log('');
  console.log('Saving .env.axero to:', ENV_PATH);
  console.log('');

  let siteUrl = existing.AXERO_DEMO_SITE || 'https://yoursite.communifire.com';
  let token = existing.AXERO_BEARER_TOKEN || '';
  let pageId = existing.AXERO_PAGE_ID || '';
  let spaceId = existing.AXERO_SPACE_ID || '';

  if (!widgetsOnly) {
    siteUrl = await prompt(rl, 'Axero site URL', siteUrl);
    token = await prompt(rl, 'Bearer token (REST API key)', token, true);
    pageId = await prompt(
      rl,
      'Page ID (Page Builder page that has the Raw HTML widget)',
      pageId
    );
    spaceId = await prompt(
      rl,
      'Space ID (e.g. from URL /spaces/6/... → 6)',
      spaceId
    );
  } else {
    console.log('Widgets-only mode: reusing existing site URL, token, page ID, and space ID from .env.axero (if present).');
  }

  if (!siteUrl || !token) {
    console.error('Site URL and Bearer token are required.');
    process.exit(1);
  }

  const mode = await prompt(
    rl,
    'Configure (1) a single Raw HTML widget or (2) multiple widgets on this page? (1/2)',
    '1'
  );

  let widgetConfig;
  if (mode.trim() === '2') {
    widgetConfig = await configureMultipleWidgets(rl, existing, siteUrl, token, pageId, spaceId);
  } else {
    widgetConfig = await configureSingleWidget(rl, existing, siteUrl, token, pageId, spaceId);
  }

  if (widgetConfig.quit) {
    rl.close();
    console.log('');
    console.log('Setup cancelled. Run  npm run setup  or  npm run setup-widgets  when ready.');
    console.log('');
    process.exit(0);
  }

  const gitRemoteUrl = widgetsOnly
    ? existing.GIT_REMOTE_ORIGIN || ''
    : await prompt(
        rl,
        'GitHub repo URL (optional – e.g. https://github.com/org/repo.git). Leave blank to skip',
        existing.GIT_REMOTE_ORIGIN || ''
      );

  rl.close();

  const lines = [
    '# Axero Page Builder deploy – do not commit .env.axero',
    `AXERO_DEMO_SITE=${siteUrl}`,
    `AXERO_BEARER_TOKEN=${token}`,
    `AXERO_PAGE_ID=${pageId}`,
    `AXERO_SPACE_ID=${spaceId}`,
  ];

  if (widgetConfig.widgetsMapping) {
    lines.push(`AXERO_WIDGETS=${widgetConfig.widgetsMapping}`);
    lines.push('AXERO_WIDGET_ID=');
    lines.push('AXERO_HTML_FILE=');
  } else {
    lines.push(`AXERO_WIDGETS=`);
    lines.push(`AXERO_WIDGET_ID=${widgetConfig.widgetId || ''}`);
    lines.push(`AXERO_HTML_FILE=${widgetConfig.htmlFile || ''}`);
  }

  if (gitRemoteUrl) {
    lines.push(`# Git remote (for reference; origin is set via git remote add)`);
    lines.push(`GIT_REMOTE_ORIGIN=${gitRemoteUrl}`);
  }

  try {
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');
    console.log('');
    console.log('Wrote Axero deploy config to', ENV_PATH);
  } catch (err) {
    console.error('');
    console.error('Failed to write .env:', err.message);
    process.exit(1);
  }

  if (gitRemoteUrl) {
    const hasGitAfter = fs.existsSync(path.join(PROJECT_ROOT, '.git'));
    if (!hasGitAfter) {
      try {
        execFileSync('git', ['init'], { cwd: PROJECT_ROOT, stdio: 'pipe' });
        console.log('');
        console.log('Initialized git repository.');
      } catch (e) {
        console.log('');
        console.log('Could not run git init. Run it manually, then: git remote add origin', gitRemoteUrl);
      }
    }
    const hasGitNow = fs.existsSync(path.join(PROJECT_ROOT, '.git'));
    if (hasGitNow) {
      try {
        execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: PROJECT_ROOT, stdio: 'pipe' });
      } catch (_) {
        try {
          execFileSync('git', ['remote', 'add', 'origin', gitRemoteUrl], { cwd: PROJECT_ROOT, stdio: 'pipe' });
          console.log('Added git remote "origin":', gitRemoteUrl);
        } catch (e) {
          console.log('');
          console.log('Could not add git remote. Add it manually: git remote add origin', gitRemoteUrl);
        }
      }
    }
  }

  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
