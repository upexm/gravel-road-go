# Axero Page Builder — Considerations & Gotchas

Platform-specific edge cases, common pitfalls, and lessons learned from real code reviews.

---

## Parser & Editor Quirks

### Empty Object Literals
The Page Builder editor strips `{}` (no space). Safe alternatives:
```javascript
const obj = new Object();   // safest
const obj = { };            // space between braces works
const obj = { key: "val" }; // populated literals are fine
```
**Note:** Populated object literals like `{ a: 1, b: 2 }` are NOT stripped — only empty `{}`.

### JSON Parser Bug: HTML Entities in Regex Literals

The widget source is serialized into JSON when saving. Regex literals that contain HTML entity characters like `&` or `;` (for example when trying to decode `&quot;` or `&#39;`) can cause the underlying JSON to corrupt. Strings such as `/&quot;/g` may be interpreted as malformed HTML/JSON by the platform editor.

**Guidance:**
- Avoid regex literals that include `&` or `;` for HTML entity decoding.
- Prefer `DOMParser` or character-code-based `split().join()` patterns instead.

```javascript
// Safer pattern
function decodeHTMLEntities(text) {
    if (!text) return text;
    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.documentElement.textContent;
}
```

### JSON Parser Bug: Backslashes in JS Strings

The Axero editor/serializer has trouble with backslashes in JavaScript strings and regex inside widgets. Sequences like `\n`, `\s`, or `\d` can become invalid escape sequences when the widget is reloaded, leading to `Bad escaped character in JSON` errors and broken widgets.

**Guidance:**
- Avoid raw backslashes in widget JavaScript when possible.
- Use `String.fromCharCode` for control characters and `new RegExp("...")` with explicit character classes instead of `\d`, `\s`, etc.

```javascript
// Safer patterns
var n = String.fromCharCode(10); // newline
var str = "Line 1" + n + "Line 2";

var regex = new RegExp("^[0-9]+$");       // [0-9] instead of \d
var regex2 = new RegExp("^Build:[ ]*", "i"); // [ ] instead of \s
```

### Handlebars/Mustache Conflicts
If using template literals with `${}`, these are safe. But if Axero's Handlebars templating is active on the page, `{{ }}` double-brace syntax may be intercepted. Wrap dynamic JS templates in `<script>` tags or use backtick template literals to avoid collisions.

---

## Bootstrap 2.3.2 Compatibility

Axero loads Bootstrap **2.3.2**, not Bootstrap 4/5. Many commonly used Bootstrap classes do NOT exist:

| Class | Available? | Alternative |
|-------|-----------|-------------|
| `alert-primary` | ❌ No (Bootstrap 4+) | Use `alert-info` |
| `alert-secondary` | ❌ No (Bootstrap 4+) | Use `alert` or custom class |
| `alert-warning` | ❌ No (Bootstrap 4+) | Use `alert alert-block` |
| `alert-info` | ✅ Yes | — |
| `alert-success` | ✅ Yes | — |
| `alert-error` | ✅ Yes | — |
| `d-flex`, `d-none` | ❌ No (Bootstrap 4+) | Use inline styles or custom classes |
| `btn-primary` | ✅ Yes | — |
| `btn-danger` | ✅ Yes | — |
| `btn-outline-*` | ❌ No (Bootstrap 4+) | Custom CSS |

**Rule of thumb:** If a Bootstrap class name looks modern (hyphenated modifiers like `-primary`, `-secondary`, `-outline-*`, `d-*`, `flex-*`), verify it exists in Bootstrap 2.3.2 before relying on it.

The Axero UI Toolkit common classes may fill some of these gaps — check: https://axero-ui-toolkit.netlify.app/?path=/docs/guides-common-classes-usage--docs

---

## Alpine.js Integration

### Accessing Component Data
Axero uses Alpine.js for reactive UI. Custom scripts often need to bridge into Alpine component data:

```javascript
// Alpine v2 internal (current Axero)
node.__x.$data

// Alpine v3 public API (future-safe fallback)
window.Alpine.$data(node)
```

**Best practice:** Try the public API first, fall back to internals:
```javascript
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
```

**Fragility warning:** If Axero upgrades Alpine versions, `__x` may change. Document any Alpine internals access with a comment.

---

## Caching & Data Freshness

### Cache Invalidation After Mutations
When code caches API responses (common for user lists, journey data), always invalidate after write operations (add, remove, update). Otherwise the UI may show stale data until TTL expires.

```javascript
// After a bulk add/remove operation:
cache.clear();               // or delete specific key
await refreshData();         // re-fetch with clean cache
```

### Stale Request Guards
When multiple async operations can be triggered in quick succession (e.g., selecting/deselecting personas), use an incrementing ID to discard stale responses:

```javascript
state.latestRequestId = (state.latestRequestId || 0) + 1;
const thisRequest = state.latestRequestId;
const data = await fetchData();
if (thisRequest !== state.latestRequestId) return; // superseded
```

---

## DOM & Event Patterns

### MutationObserver Scope
Observing `document.body` with `{ childList: true, subtree: true }` fires on every DOM change. Mitigations:
- Guard the callback with an early return if work is already done
- Narrow the observed target if a stable container exists
- Consider disconnecting after initialization and reconnecting on specific events

### Class Name Matching
Avoid strict equality checks on `className` — it breaks if the element gains additional classes:
```javascript
// Fragile:
if (el.className === 'my-class') { }

// Robust:
if (el.classList.contains('my-class')) { }
if (el.closest('.my-class')) { }
```

### innerHTML vs DOM API
Prefer the DOM API (`createElement`, `textContent`, `append`) over `innerHTML` for dynamic content. Even when the HTML is static, `innerHTML` establishes a pattern that's risky if user data is ever introduced:
```javascript
// Fragile:
btn.innerHTML = `<i class="fas fa-plus"></i> Add`;

// Safe:
btn.textContent = "";
btn.append(el("i", { class: "fas fa-plus" }), document.createTextNode(" Add"));
```

---

## API Patterns

### Rate Limiting
Axero is a shared intranet. Bulk operations (adding 200 users) can flood the server. Always rate-limit API calls:
- Cap concurrent requests (e.g., 2-3 at a time)
- Add minimum delay between requests (e.g., 200ms)
- Show progress feedback to the user during long operations

### Pagination Safety
When paginating API results with `while` loops, always add a max-page cap to prevent infinite loops:
```javascript
const MAX_PAGES = 200;
let page = 1;
while (page <= MAX_PAGES) {
    const res = await fetchPage(page);
    if (res.items.length < PAGE_SIZE) break;
    page++;
}
```

### Relative URLs Only
Never include base URLs. Use `Communifire.buildApiUrl()` when available, or plain relative paths:
```javascript
// Correct:
fetch('/api/journey/123')
Communifire.buildApiUrl('/journey/user/search')

// Wrong:
fetch('https://company.axero.com/api/journey/123')
```

---

## Fonts & Assets

- **Do not** override or re-declare font files in CSS — platform fonts are managed globally
- **Do not** reload Font Awesome, emoji.min.js, or jQuery — they're already present
- Spinner image available at `/assets/Themes/default/images/spinner.gif` (alternative to Font Awesome spinner icon)

---

## ASP.NET `aspnetForm` Wrapper

All Page Builder content ultimately lives inside a global ASP.NET form (`aspnetForm`). Nested forms inside this wrapper can be stripped, behave inconsistently, or trigger unexpected submissions.

**Guidance:**
- Avoid adding nested `<form>` elements inside widgets when possible.
- Prefer reading values directly from inputs (e.g. `document.getElementById('myInput').value`) instead of relying on nested `FormData`.
- Use `type="button"` for any button that should not submit the outer form.

This helps prevent accidental full-page reloads and confusing form behavior.
