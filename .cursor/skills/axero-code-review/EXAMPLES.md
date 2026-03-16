# Axero Code Review — Extended Examples

Real-world patterns showing good and bad practices for Page Builder code.

---

## Example 1: Well-Structured Feature Script

```javascript
/*
 * Case Number: 56683
 * Description: Adds a persona selector to the Journey "Add Users" modal
 * Author: Jennifer Kirkland
 * Date Added: 01/23/2026
 */
(function () {
    'use strict';

    const PATH_PREFIX = (window.CF_VD || "") + "/journeys";
    if (!location.pathname?.startsWith(PATH_PREFIX)) return;  // Scoped to page

    const CONFIG = {
        SELECTORS: {
            MODAL: ".modal-content.journey-modal",
            SEARCH_WRAP: ".filter-search-input"
        },
        RENDER_LIMIT: 50,
        DEBUG: false
    };

    // Rate limiter prevents flooding shared intranet
    class RateLimiter {
        constructor(maxConcurrent, minDelayMs) {
            this.maxConcurrent = maxConcurrent;
            this.minDelayMs = minDelayMs;
            this.activeRequests = 0;
            this.queue = [];
            this.lastRequestTime = 0;
        }
        async enqueue(fn) { /* ... */ }
    }

    const API_LIMITER = new RateLimiter(2, 200);
    const cache = new Object();  // Safe empty object init

    // Alpine bridge with v2/v3 fallback
    const getAlpineData = (node) => {
        while (node) {
            if (node.__x?.$data) return node.__x.$data;
            if (window.Alpine?.$data) {
                try { const d = window.Alpine.$data(node); if (d) return d; } catch (_) { }
            }
            node = node.parentElement;
        }
        return null;
    };

    // IIFE + path check + defensive returns = good isolation
})();
```

**What's good:**
- Header comment block with case number, author, date
- IIFE for scope isolation
- Path prefix guard — only runs on `/journeys`
- Centralized CONFIG with specific selectors
- Rate limiting for API calls
- `new Object()` for empty object initialization
- Alpine.js bridge with public API fallback

---

## Example 2: Common Mistakes

```javascript
// ❌ Missing header comment block

var userData = {};  // ❌ Empty {} stripped by parser

// ❌ No IIFE — pollutes global namespace
const API_URL = 'https://company.axero.com/api/users';  // ❌ Absolute URL

$('.button').click(function() {  // ❌ Generic selector, missing preventDefault
    fetch(API_URL).then(res => res.json()).then(data => {
        document.getElementById('results').innerHTML = data.name;  // ❌ XSS risk
    });
});

// ❌ Loading Font Awesome again (already pre-loaded)
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
document.head.appendChild(link);  // ❌ Also modifying <head>!
```

**Issues found:**
1. No header comment — 🟡 Warning
2. `{}` will be stripped — 🔴 Critical
3. Global variable pollution — 🟡 Warning
4. Absolute URL — 🔴 Critical
5. Generic `.button` selector — 🟡 Warning
6. Missing `e.preventDefault()` — 🟡 Warning
7. `innerHTML` with API data — 🔴 Critical (XSS)
8. Duplicate Font Awesome load — 🟡 Warning
9. Modifying `<head>` — 🔴 Critical

---

## Example 3: Safe DOM Manipulation

```javascript
// ❌ Unsafe: innerHTML with user-provided data
function renderUser(user) {
    container.innerHTML += `<div class="user">${user.name}</div>`;
}

// ✅ Safe: DOM API with textContent
function renderUser(user) {
    const div = document.createElement('div');
    div.className = 'persona-user-card';  // Scoped class name
    div.textContent = user.name;          // Safe — no HTML parsing
    container.append(div);
}

// ✅ Safe: Using an el() helper
const el = (tag, attrs, ...children) => {
    if (!attrs) attrs = new Object();
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "text") n.textContent = v;
        else if (k === "class") n.className = v;
        else n.setAttribute(k, v);
    }
    children.flat().forEach(c => n.append(c));
    return n;
};

function renderUser(user) {
    return el("div", { class: "persona-user-card" },
        el("h6", { class: "persona-user-name", text: user.name }),
        el("small", { class: "text-muted", text: user.email })
    );
}
```

---

## Example 4: CSS Scoping

```css
/* ❌ Bad: Generic selectors that bleed into global styles */
.card { padding: 20px; }
.modal { z-index: 9999; }
h3 { color: red; }
.btn { border-radius: 0; }
p { font-size: 18px; }

/* ✅ Good: Namespaced to avoid collisions */
.persona-picker-card { padding: 20px; }
.journey-bulk-modal { z-index: 9999; }
.persona-group-header { color: #495057; font-weight: 600; }
.nx-select-chip .nx-chip { border-radius: 8px; }
```

---

## Example 5: Event Handling

```javascript
// ❌ Bad: Missing preventDefault, generic selector
document.querySelector('button').addEventListener('click', () => {
    doSomething();
});

// ✅ Good: Specific selector, preventDefault, stopPropagation where needed
document.querySelector('[data-persona-picker] .nx-chip-remove').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removePersona(e.target.dataset.id);
});
```

---

## Example 6: Bootstrap 2.3.2 Compatibility

```html
<!-- ❌ Bad: Bootstrap 4+ classes that don't exist in 2.3.2 -->
<div class="alert alert-primary">Info message</div>
<div class="d-flex justify-content-between">Layout</div>
<button class="btn btn-outline-primary">Click</button>

<!-- ✅ Good: Bootstrap 2.3.2 compatible classes -->
<div class="alert alert-info">Info message</div>
<div style="display:flex; justify-content:space-between;">Layout</div>
<button class="btn btn-primary">Click</button>

<!-- ✅ Better: Use Axero UI Toolkit classes where available -->
<!-- Check: https://axero-ui-toolkit.netlify.app/?path=/docs/guides-common-classes-usage--docs -->
```

---

## Example 7: Pagination with Safety Cap

```javascript
// ❌ Bad: Unbounded loop
const fetchAll = async () => {
    let page = 1;
    while (true) {
        const res = await fetch(`/api/users?page=${page}`);
        const data = await res.json();
        if (data.items.length === 0) break;
        page++;
    }
};

// ✅ Good: Max-page safety cap
const fetchAll = async () => {
    let page = 1;
    const MAX_PAGES = 200;
    while (page <= MAX_PAGES) {
        const res = await fetch(`/api/users?page=${page}`, { credentials: 'same-origin' });
        const data = await res.json();
        if (data.items.length < PAGE_SIZE) break;
        page++;
    }
    if (page > MAX_PAGES) console.warn('Pagination cap reached');
};
```

---

## Example 8: Cache Invalidation

```javascript
// ❌ Bad: Stale cache after mutation
async function addUser(user) {
    await apiPost('/api/journey/user/add', user);
    refreshList();  // May serve cached (stale) data
}

// ✅ Good: Clear cache before refresh
async function addUser(user) {
    await apiPost('/api/journey/user/add', user);
    DATA_CACHE.clear();
    refreshList();  // Fetches fresh data
}
```

---

## Example 9: JSON Parser Bugs & `aspnetForm`

```javascript
// ❌ Bad: HTML entity regex + backslashes in strings
function decodeHTMLEntities(text) {
  return text
    .replace(/&quot;/g, '"')   // ❌ Regex literal with & and ; will corrupt widget JSON
    .replace(/&#39;/g, "'");
}

var str = "Line 1\nLine 2";     // ❌ Backslash escape likely to break JSON
var regex = /^Build:\s*/i;     // ❌ \s in regex literal

// ❌ Bad: Nested form inside aspnetForm and missing button type
<form id="innerForm">
  <input id="myInput" name="myInput" />
  <button>Submit</button>      // ❌ Implicit submit; may trigger outer aspnetForm submit
</form>

// ✅ Good: DOMParser / character-code, safe regex, and aspnetForm-safe buttons
function decodeHTMLEntitiesSafe(text) {
  if (!text) return text;
  var doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent;
}

var n = String.fromCharCode(10);      // newline
var safeStr = "Line 1" + n + "Line 2";
var safeRegex = new RegExp("^Build:[ ]*", "i");

// Avoid nested forms; read values directly and use type="button"
const value = document.getElementById('myInput').value;
document
  .getElementById('myButton')
  .addEventListener('click', function (e) {
    e.preventDefault();
    // handle value
  });
```
