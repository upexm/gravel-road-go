---
name: axero-code-review
description: Review code for Axero's Page Builder environment, checking quality, correctness, performance, security, and scope isolation. Use when reviewing code intended for Axero intranet, Page Builder widgets, custom scripts, or when the user mentions Axero code review.
---

# Axero Code Review

Review code designed to run within **Axero's intranet Page Builder environment**. Assume the code runs within an existing page.

## Review Objectives

Provide detailed, structured feedback on these areas:

### 1. Code Quality & Maintainability

**Check for:**
- Readability, structure, naming conventions, best practices
- Modularity and ease of customization for individual customers
- **Required header comment block** with:
  ```
  /*
   * Case Number: [Case #]
   * Description: [Short description of functionality]
   * Author: [Name]
   * Date Added: MM/DD/YYYY
   */
  ```

**Flag if missing:** Proper documentation header

### 2. Correctness & Reliability

**Check for:**
- Potential bugs, edge cases, logical errors
- Error handling and defensive coding practices
- Proper handling of asynchronous operations
- Null/undefined checks where needed

**Flag:** Any obvious bugs or missing error handling

### 3. Performance

**Check for:**
- Inefficient patterns or algorithms
- Unnecessary DOM operations or queries
- Expensive logic that could be optimized
- Multiple similar API calls that could be batched
- Event listener bloat

**Flag:** Operations that could impact shared intranet performance

### 4. Security

**Check for:**
- Client-side injection risks (XSS, HTML injection)
- Unsafe DOM manipulation (innerHTML with user data)
- Safe usage of global variables and APIs
- Proper data sanitization

**Flag:** Any security vulnerabilities

### 5. Scope & Isolation

**Check for:**
- Code is narrowly scoped to intended page/feature/functionality
- Selectors are specific enough to avoid conflicts
- Event listeners won't trigger on wrong elements
- CSS won't affect other pages or features
- Global namespace pollution

**Flag:** Patterns that could cause unintended side effects elsewhere in Axero

### 6. Additional Recommendations

Suggest improvements for:
- Robustness and error recovery
- Code clarity and maintainability
- Future extensibility
- UX enhancements

---

## Axero Platform Constraints

**Explicitly check for violations** of these platform-specific rules:

### HTML / Script Placement

✅ **Allowed:**
- Code inside `<body>`, `<script>`, and `<style>` tags
- Handlebars/Mustache templating syntax

❌ **Not Allowed:**
- Code outside body/script/style tags
- Modifications to `<head>` or page structure

### URLs & API Calls

✅ **Correct:**
```javascript
fetch('/api/cases/514', { credentials: 'include' })
fetch('/api/journey/123')
```

❌ **Incorrect:**
```javascript
fetch('https://example.com/api/cases/514')  // No base URL!
fetch('http://localhost/api/journey/123')   // No base URL!
```

**Rule:** Use relative paths only, no base URLs

### Event Handling

✅ **Correct:**
```javascript
button.addEventListener('click', (e) => {
  e.preventDefault();  // Always prevent default
  e.stopPropagation(); // Prevent bubbling if needed
  // ... handler code
});
```

❌ **Incorrect:**
```javascript
button.addEventListener('click', () => {
  // Missing e.preventDefault()
});
```

**Rule:** Always prevent default behavior on buttons

### Object Initialization (Critical!)

❌ **Forbidden** (parser strips empty braces with no space):
```javascript
if (!opts) opts = {};   // stripped by parser!
```

✅ **Safe alternatives:**
```javascript
if (!opts) opts = new Object();  // safest
if (!opts) opts = { };           // space between braces also works
```

**Rule:** Never use `{}` (no space) — the Axero editor strips it. Use `new Object()` or `{ }` (with a space).

### JSON Parser Bugs (HTML Entities & Backslashes)

#### HTML entities in regex literals

❌ **Forbidden** (will corrupt the widget JSON on save):
```javascript
// Regex literals containing & or ; for HTML entities
text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
```

✅ **Safe alternatives:**
```javascript
// DOMParser-based decoding
function decodeHTMLEntities(text) {
  if (!text) return text;
  var doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent;
}

// Character-code splitting
var qQ = String.fromCharCode(38, 113, 117, 111, 116, 59); // &quot;
var q = String.fromCharCode(34);                          // "
var sS = String.fromCharCode(38, 35, 51, 57, 59);         // &#39;
var s = String.fromCharCode(39);                          // '
text = text.split(qQ).join(q).split(sS).join(s);
```

**Rule:** Do **not** use regex literals with HTML entities (e.g. `/&quot;/g`) in widgets. Use `DOMParser` or `split().join()` patterns instead.

#### Backslashes in JS strings / regex

❌ **Forbidden** (JSON encoder will mis-escape these and break the widget):
```javascript
var str = "Line 1\nLine 2";
var regex1 = /^\d+$/;
var regex2 = /^Build:\s*/i;
```

✅ **Safe alternatives (character codes + `new RegExp`)**:
```javascript
var n = String.fromCharCode(10);           // newline
var str = "Line 1" + n + "Line 2";

var regex1 = new RegExp("^[0-9]+$");       // [0-9] instead of \d
var regex2 = new RegExp("^Build:[ ]*", "i"); // [ ] instead of \s
```

**Rule:** Avoid raw backslashes `\` inside widget JavaScript strings/regex. Prefer `String.fromCharCode` and `new RegExp("...")` with safe character classes.

### ASP.NET `aspnetForm` Wrapper

All content is wrapped in a global ASP.NET form (`aspnetForm`).

**Check for:**
- Nested `<form>` tags that may be stripped or behave unexpectedly.
- Buttons that should not submit but are missing `type="button"`.
- Over-reliance on `FormData` from nested forms instead of reading input values directly.

✅ **Preferred pattern:**
```javascript
const value = document.getElementById('myInput').value;
```

**Rule:** Avoid nested forms inside `aspnetForm`. Use `type="button"` for non-submit buttons and read values directly from inputs.

### Available Globals

These are safe to use:
- `CF_USERID` - Current user's ID
- `CF_SPACEID` - Current space ID
- `CF_USER_DISPLAY_NAME` - Current user's display name

**Flag if:** Code assumes globals that don't exist

### Pre-Loaded Assets

**Already available** (do not reload):
- ✅ Font Awesome Pro (v5 or v6)
- ✅ `emoji.min.js` 
- ✅ jQuery
- ✅ Alpine.js
- ✅ Bootstrap 2.3.2

**Spinner image path:**
```
/assets/Themes/default/images/spinner.gif
```

❌ **Flag if:** Code loads duplicate Font Awesome, emoji.min.js, or other pre-loaded libraries

### Fonts

❌ **Do not** override or re-declare font files in CSS. Platform fonts are managed globally.

### CSS Rules

✅ **Correct:**
```css
/* Unique, specific classes */
.custom-feature-widget-123 { }
.journey-readmore-link { }
.axero-custom-modal { }
```

❌ **Incorrect:**
```css
/* Too generic - will affect other pages */
.button { }
.modal { }
p { }
```

**Rules:**
- Assign unique, specific class names to all new UI elements
- Scope CSS only to those classes
- Avoid generic selectors that could affect global styles

### Design System

When reviewing CSS classes and UI patterns, check against the Axero UI Toolkit:

- **Storybook**: https://axero-ui-toolkit.netlify.app/
- **AI Conventions**: https://axero-ui-toolkit.netlify.app/?path=/docs/guides-developer-ai-conventions--docs
- **Common Classes**: https://axero-ui-toolkit.netlify.app/?path=/docs/guides-common-classes-usage--docs
- **Design Tokens (UpToDate)**: https://axero-ui-toolkit.netlify.app/?path=/docs/uptodatedesign-design-tokens--docs
- **Design Tokens (Legacy)**: https://axero-ui-toolkit.netlify.app/?path=/docs/legacy-ui-components-design-tokens--docs

**Rules:**
- Prefer UpToDate Design tokens over Legacy tokens when possible
- Use design system common classes where available
- Verify CSS class names exist in the design system before using Bootstrap or utility classes
- Note: Bootstrap 2.3.2 is loaded — classes like `alert-primary` (Bootstrap 4+) do NOT exist; use `alert-info`, `alert-success`, `alert-error` instead

---

## Review Output Format

Structure your review as:

```markdown
## Summary
[Brief overview of code purpose and overall assessment]

## Critical Issues 🔴
[Issues that MUST be fixed before deployment]

## Warnings 🟡
[Issues that should be addressed]

## Suggestions 💡
[Optional improvements]

## Axero Platform Compliance
✅ [What follows platform constraints]
❌ [What violates platform constraints]

## Code Quality Score
[Rate 1-5 stars with brief justification]

## Detailed Findings
[Section-by-section analysis with line number references]
```

---

## Example Review Snippets

### Good Code Example

```javascript
/*
 * Case Number: CASE-12345
 * Description: Expandable journey descriptions with caching
 * Author: John Doe
 * Date Added: 01/23/2026
 */

(function() {
  'use strict';
  
  const CONFIG = {
    apiBaseUrl: '/api/journey',  // ✅ Relative path
    cacheTTL: 30 * 60 * 1000
  };
  
  const cache = new Object();  // ✅ Using new Object(), not {}
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Scoped to specific modal
    const modal = document.querySelector('#journeyModal');
    if (!modal) return;  // ✅ Defensive check
    
    // ... implementation
  }
  
  init();
})();  // ✅ IIFE for isolation
```

### Bad Code Example (with issues)

```javascript
// ❌ Missing required header comment

var myData = {};  // ❌ Will be stripped by parser!

$('.button').click(function() {  // ❌ Too generic selector
  // ❌ Missing e.preventDefault()
  fetch('https://api.example.com/data');  // ❌ Absolute URL
});

document.body.innerHTML = userInput;  // ❌ XSS vulnerability
```

---

## Quick Reference

### Common Issues to Flag

| Issue | Severity | Example |
|-------|----------|---------|
| Missing header comment | 🟡 Warning | No case number/author |
| Empty object literal `{}` | 🔴 Critical | `opts = {}` stripped; use `new Object()` or `{ }` |
| Absolute URLs | 🔴 Critical | `https://...` instead of `/api/...` |
| Generic CSS selectors | 🟡 Warning | `.button` instead of `.custom-btn-xyz` |
| Missing preventDefault | 🟡 Warning | Button handlers without `e.preventDefault()` |
| XSS vulnerabilities | 🔴 Critical | Using innerHTML with unsanitized data |
| Duplicate library loads | 🟡 Warning | Loading Font Awesome again |
| Global namespace pollution | 🟡 Warning | Not using IIFE or module pattern |

---

## Additional Resources

- For platform gotchas, edge cases, and lessons learned, see [CONSIDERATIONS.md](CONSIDERATIONS.md)
- For extended code review examples, see [EXAMPLES.md](EXAMPLES.md)

## Additional Notes

- Assume the reviewer is familiar with JavaScript, jQuery, and Alpine.js
- Provide specific line numbers or code snippets when referencing issues
- Balance thoroughness with actionability - prioritize high-impact issues
- If code is already good, say so! Don't invent problems.
