# Axero Page Builder Deploy

Deploy one or more HTML files to Axero Page Builder **Raw HTML** widget(s). Scripts and Cursor skills are included; you only configure your `.env.axero` via setup.

## Setup

1. **Clone this repository.**

2. **In a terminal** (in the project root), install dependencies and run setup:
   ```bash
   npm install
   npm run axero:setup
   ```
   Setup will create a `.env.axero` file and prompt you for:
   - Axero site URL, bearer token, page ID, space ID  
   - Whether you want to configure **one** Raw HTML widget or **multiple** Raw HTML widgets on the same Page Builder page  
   - For a single widget: Widget ID (leave blank and setup will list widgets on your page so you can pick the Raw HTML one) and an HTML file name to push (default `index.html`; setup creates the file if it doesn’t exist)  
   - For multiple widgets: a list of widget IDs and the HTML file name that should be deployed into each widget (setup will create stub HTML files for any new names)  
   - Optional: GitHub repo URL (if provided and no repo exists, setup runs `git init` and adds `origin`)

3. **Deploy.** Say **"deploy"** or **"push to site"** in Cursor and the agent will push to Git and update the widget(s). Or run:
   ```bash
   npm run axero:push
   ```

### Adding to an existing project

If you already have a project and want to add this Axero toolkit without overwriting anything:

1. **Copy toolkit files and folders** into the root of your existing repo:
   - `scripts/`
   - `.cursor/`
   - `Docs/`
   - `env.example` (optional; for reference or manual setup)

2. **Merge `package.json` changes** instead of replacing your existing file:
   - Open your project’s existing `package.json`.
   - Under `"scripts"`, add the Axero scripts (rename if you prefer different names):

   ```json
   "scripts": {
     "...": "...",
     "axero:setup": "node scripts/setup-axero-env.js",
     "axero:setup-widgets": "node scripts/setup-axero-env.js --widgets-only",
     "axero:push": "node scripts/push-page.js",
     "axero:list-widgets": "node scripts/list-widget-ids.js",
     "axero:discover": "node scripts/discover-pagebuilder-api.js"
   }
   ```

   - Under `"dependencies"` (or `"devDependencies"`), add `axios` if it is not already present:

   ```json
   "dependencies": {
     "...": "...",
     "axios": "^1.6.0"
   }
   ```

   Do **not** remove your existing scripts or dependencies—only add the Axero entries.

3. **Update `.gitignore`** to keep local config out of git. Append this block to your existing `.gitignore`:

   ```gitignore
   # Axero Page Builder toolkit
   .env.axero
   .env.axero.*
   ```

4. **Install dependencies** from your existing project root:

   ```bash
   npm install
   ```

5. **Run Axero setup** from your existing project root:

   ```bash
   npm run axero:setup
   ```

   This creates or updates `.env.axero` **only**. It does not touch your existing `.env` file.

After that you can use all of the commands in the table below from your existing project.

## Commands

| Command | Description |
|--------|-------------|
| `npm run axero:setup` | Create or update `.env.axero` (interactive). Prompts for site, token, page, space, and either single- or multi-widget config. |
| `npm run axero:setup-widgets` | Re-run only the widget/file mapping prompts using existing site, token, page, and space values. |
| `npm run axero:push` | Push one or more HTML files to the configured Raw HTML widget(s) and publish the page. |
| `npm run axero:list-widgets` | List widgets on your page so you can find Raw HTML widget IDs. |
| `npm run axero:discover` | Verify Page Builder API access. |

## .env.axero (created by setup)

For all modes:

| Key | Description |
|-----|-------------|
| `AXERO_DEMO_SITE` | Base URL of your Axero site. |
| `AXERO_BEARER_TOKEN` | Axero REST API bearer token. |
| `AXERO_PAGE_ID` | Page Builder page ID that has the Raw HTML widget(s). |
| `AXERO_SPACE_ID` | Space ID (e.g. from URL `/spaces/6/...`). |

For **single-widget** deploys:

| Key | Description |
|-----|-------------|
| `AXERO_WIDGET_ID` | Raw HTML widget ID (leave blank in setup to look it up). |
| `AXERO_HTML_FILE` | Name of the HTML file to push. |

For **multi-widget** deploys:

| Key | Description |
|-----|-------------|
| `AXERO_WIDGETS` | Comma-separated list of `widgetId:filename` pairs, e.g. `123:header.html,456:body.html`. |

Do not commit `.env.axero` (it’s in `.gitignore`).

### .env.axero examples

**Single-widget (one Raw HTML widget, one file):**

```env
AXERO_DEMO_SITE=https://yoursite.communifire.com
AXERO_BEARER_TOKEN=your-token
AXERO_PAGE_ID=42
AXERO_SPACE_ID=6
AXERO_WIDGETS=
AXERO_WIDGET_ID=101
AXERO_HTML_FILE=index.html
```

**Multi-widget (one page, several Raw HTML widgets, each with its own file):**

```env
AXERO_DEMO_SITE=https://yoursite.communifire.com
AXERO_BEARER_TOKEN=your-token
AXERO_PAGE_ID=42
AXERO_SPACE_ID=6
AXERO_WIDGETS=101:header.html,102:body.html,103:footer.html
AXERO_WIDGET_ID=
AXERO_HTML_FILE=
```

Here, widget `101` gets `header.html`, widget `102` gets `body.html`, and widget `103` gets `footer.html`. One `npm run push` updates all three and publishes the page.

### File and folder layout

HTML files can live at the **project root** or in a **subfolder**. Paths in `.env.axero` are relative to the project root.

**Recommended: flat at root (simplest)**  
Keep a few widget files next to `package.json` with clear names:

```
your-project/
  index.html          # single-widget default, or one of several
  header.html
  body.html
  footer.html
  package.json
  .env.axero
```

**Recommended: `widgets/` subfolder (many widgets)**  
Group all widget HTML in one folder so the root stays clean:

```
your-project/
  widgets/
    header.html
    hero.html
    body.html
    sidebar.html
    footer.html
  package.json
  .env.axero
```

In `.env.axero` you would set:

```env
AXERO_WIDGETS=101:widgets/header.html,102:widgets/hero.html,103:widgets/body.html,104:widgets/sidebar.html,105:widgets/footer.html
```

**Naming tips**

- Use short, descriptive names: `header.html`, `hero.html`, `sidebar.html`, `faq-accordion.html`.
- Avoid spaces and special characters in filenames; use hyphens or underscores if needed (e.g. `faq-accordion.html`).
- Keep names consistent with the widget’s purpose so `AXERO_WIDGETS` stays easy to read and maintain.

---

## Axero Code Review skill

This repo includes an **Axero Code Review** Cursor skill that reviews HTML/JS/CSS intended for Axero’s Page Builder (Raw HTML widgets, custom scripts, intranet features).

### What it does

The skill instructs the AI to check your code for:

- **Code quality** — Structure, naming, required header comment (case number, author, date)
- **Correctness** — Bugs, error handling, async safety
- **Performance** — DOM/API usage, event listener bloat
- **Security** — XSS, unsafe `innerHTML`, sanitization
- **Scope & isolation** — Selectors and CSS that could affect other pages
- **Axero platform rules** — Relative URLs only, no empty `{}` (parser strips it), no `<head>` changes, Bootstrap 2.3.2 compatibility, pre-loaded assets (no duplicate Font Awesome/jQuery), design system alignment

Reviews are structured as Summary, Critical issues, Warnings, Suggestions, Platform compliance, and a code quality score.

### How to use it

1. **Ensure the skill is in your project**  
   The skill lives under `.cursor/skills/axero-code-review/` (SKILL.md plus CONSIDERATIONS.md and EXAMPLES.md). If you’re using this deploy pack from another app, copy that folder into your app’s `.cursor/skills/` so Cursor can see it.

2. **Ask for a review**  
   In Cursor, say things like:
   - *“Review this code for Axero”*
   - *“Run an Axero code review on [file or selection]”*
   - *“Check this Page Builder widget for platform compliance”*

3. **Share the right context**  
   Open or @-mention the file(s) you want reviewed (e.g. your Raw HTML widget file or script). The agent will use the Axero Code Review skill and the platform rules in the skill to produce the review.

### README usage in new vs existing projects

- **New projects from this template**  
  When you click “Use this template” on GitHub, the generated repository’s `README.md` is intended to be your main project README. You can customize it as needed, but it already describes how to use the Axero toolkit and deploy workflow.

- **Existing projects adopting the toolkit**  
  When you copy this toolkit into an existing repository that already has a `README.md`, do **not** overwrite your existing README. Instead:
  - Keep your existing `README.md` as the primary project documentation.
  - Optionally rename this file to something like `AXERO-DEPLOY.md` in your project, or link back to the original template README on GitHub.
  - Use the “Adding to an existing project” section above as the canonical guide for integrating the toolkit.
