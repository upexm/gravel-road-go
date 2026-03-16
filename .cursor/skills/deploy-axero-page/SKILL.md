---
name: deploy-axero-page
description: Commits and pushes changes to git, then deploys the project HTML file to an Axero Page Builder Raw HTML widget. Use when the user asks to deploy, push to site, ship changes, commit and push to git and site, or push to Axero.
---

# Deploy to Axero Page Builder (Git + Site)

When the user asks to deploy, push to site, ship changes, or commit and push to git and site, follow this workflow.

## First-time setup check

Before running the deploy workflow:

1. **Check for config:** Look for a `.env` file in the project root. It must contain:
   - `AXERO_DEMO_SITE` (site URL)
   - `AXERO_BEARER_TOKEN` (bearer token)
   - `AXERO_PAGE_ID`, `AXERO_SPACE_ID`
   - **Either** single-widget keys: `AXERO_WIDGET_ID`, `AXERO_HTML_FILE`  
     **or** multi-widget mapping: `AXERO_WIDGETS` (comma-separated `widgetId:filename` pairs).

2. **If `.env` is missing or any of these keys are missing or placeholder:**
   - Tell the user: "Axero deploy config is missing or incomplete. Run **npm run setup** once — it will prompt you for site URL, bearer token, page ID, space ID, and either a single widget + HTML file or multiple widget/file mappings, and save them to `.env`."
   - For single widget, tell the user: "Run **npm run setup** and leave Widget ID blank — setup will fetch widgets from your page and help you pick the Raw HTML one. Or run **npm run list-widgets** to list widgets and set AXERO_WIDGET_ID in .env."
   - For multiple widgets on the same page, tell the user: "Run **npm run setup** and choose option 2 (multiple widgets) to map each Raw HTML widget ID to an HTML file, or later use **npm run setup-widgets** to reconfigure just the widget/file mappings."
   - Do **not** run the deploy workflow until the user has run `npm run setup` (or manually created a complete `.env`). Then they can ask to deploy again.

3. **If the project doesn't have the deploy scripts yet:** Tell the user to add the deploy scripts to the project (e.g. from this repo: `scripts/setup-axero-env.js`, `scripts/push-page.js`, `scripts/list-widget-ids.js`), add the npm scripts to `package.json`, then run **`npm run setup`** to enter their Axero (and optional GitHub) info. They can later run **`npm run setup-widgets`** to change just the widget/file mappings.

## Deploy workflow (when .env is configured)

1. **Stage and commit**
   - `git add` the changed files (or `git add -A` if the user wants everything).
   - `git commit` with a short, descriptive message. Use the user's message if they gave one; otherwise infer from the changes.

2. **Push to Git**
   - `git push` (current branch).

3. **Push to Axero Page Builder**
   - From project root: `npm run push`.
   - This updates either:
     - A single Raw HTML widget using `AXERO_WIDGET_ID` + `AXERO_HTML_FILE`, or
     - Multiple Raw HTML widgets using `AXERO_WIDGETS` (each `widgetId:filename` pair)  
     and publishes the page using values from `.env`.
   - Remind the user to verify on their site (e.g. the space URL for the page they configured).

## Prerequisites (for the user)

- Project has the deploy scripts and `npm run setup` has been run once (so `.env` exists with all required keys for either single-widget or multi-widget deploy).
- `npm install` has been run (so `axios` is available and `node scripts/push-page.js` works).

## If something fails

- **Git:** Resolve conflicts or auth (e.g. remote credentials) before retrying.
- **npm run push:** Ensure `.env` has all required keys (run `npm run setup` and leave Widget ID blank to look up, or run `npm run setup` / `npm run setup-widgets` to adjust multi-widget mappings; run `npm run list-widgets` to confirm IDs); run `npm run discover` to verify API access if needed.

## Commands (reference)

```bash
npm run setup           # First-time: prompt for config (site, token, page, space, widgets) and write .env
npm run setup-widgets   # Re-run only the widget/file mapping prompts using existing site/token/page/space
npm run list-widgets    # List widgets on the page (find Raw HTML widget IDs)
npm run push            # Deploy HTML to Page Builder (single or multi-widget depending on .env)
git add -A && git commit -m "Your message" && git push && npm run push
```
