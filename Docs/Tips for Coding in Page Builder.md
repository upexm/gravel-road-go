# Page Builder / RawHTML Development Guidelines

## General Constraints

- We are working within an existing page. Output **only body-level markup**, including `<script>` and `<style>` blocks.  
- **Do not** include `<html>`, `<head>`, or `<body>` tags.  
- You do not need to use a base URL for API calls or links. Use **relative paths only**  
  (e.g. `/api/cases/514`, not `https://baseurl.com/api/cases/514`).  
- You do not need an API key for API calls since the user is already authenticated.  
- Always prevent default behavior on buttons to avoid page refreshes:

```javascript
e.preventDefault();
```

---

## JavaScript Object Initialization (RawHTML Parser Behavior)

The Page Builder RawHTML renderer **strips empty object literals `{}`**, which can silently break scripts.

### Rules

- **Never use empty `{}`** in scripts.  
- This includes inline initialization and fallback logic.

### Do NOT use

```javascript
const obj = {};
if (!opts) opts = {};
```

### Do use one of the following

```javascript
const obj = { };
```

```javascript
const obj = new Object();
```

```javascript
const obj = Object.create(null);
```

### Safe initialization pattern

```javascript
if (!opts) opts = new Object();
```

---

## JSON Parser Bug (HTML Entities in Regex Literals)

The Page Builder parser will corrupt your widget if you attempt to use regular expression literals containing HTML entity characters like `&` or `;` (e.g., when attempting to decode `&amp;` or `&quot;`). This happens because the parser evaluates expressions like `/&quot;/g` as malformed HTML, which causes the widget JSON payload to instantly corrupt when saving.

### Rules

- **Never use literal regex `/ /` for parsing HTML Entities** in widgets.  
- If you must decode HTML entities in a widget's JavaScript, use the `DOMParser()` or `split().join()` pattern exclusively.

### Do NOT use (will crash the widget)

```javascript
function decodeHTMLEntities(text) {
    return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
```

### Do use (built-in DOMParser)

```javascript
function decodeHTMLEntities(text) {
    if (!text) return text;
    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.documentElement.textContent;
}
```

### Do use (character code splitting)

```javascript
function decodeHTMLEntities(text) {
    var qQ = String.fromCharCode(38, 113, 117, 111, 116, 59); // &quot;
    var q = String.fromCharCode(34); // "
    var sS = String.fromCharCode(38, 35, 51, 57, 59); // &#39;
    var s = String.fromCharCode(39); // '
    return text
        .split(qQ).join(q)
        .split(sS).join(s);
}
```

---

## JSON Parser Bug (Backslashes in JS Strings)

The Axero platform serializes the widget's HTML/JS into a JSON object when saving it. However, its JSON encoder **fails to properly escape JavaScript backslashes** in strings/regex inside the widget source code. When the platform parses this JSON upon loading the widget, strings like `\n` or `\s` are evaluated as invalid escape sequences, throwing an `Uncaught SyntaxError: Bad escaped character in JSON` and completely breaking the widget.

### Rules

- **Never use raw backslashes `\`** inside JavaScript strings or regular expressions in HTML widgets.

### Do NOT use

```javascript
var str = "Line 1\nLine 2";
var regex1 = /^\d+$/;
var regex2 = /^Build:\s*/i;
```

### Do use `String.fromCharCode` and `new RegExp()` with escaped strings

```javascript
// Use character codes for newlines/tabs
var n = String.fromCharCode(10); // newline
var str = "Line 1" + n + "Line 2";
// Use new RegExp with character classes that avoid backslashes entirely
var regex1 = new RegExp("^[0-9]+$"); // Use [0-9] instead of \d
var regex2 = new RegExp("^Build:[ ]*", "i"); // Use [ ] instead of \s
```

---

## ASP.NET Form Wrapper (`aspnetForm`)

The site wraps all content inside a global ASP.NET form (`aspnetForm`).  
As a result, **nested `<form>` tags may be stripped or behave unexpectedly**.

### Guidelines

- Avoid relying on nested `<form>` elements.  
- Prefer reading values directly from inputs instead of using `FormData`.

### Example

```javascript
const value = document.getElementById('myInput').value;
```

### Buttons

- Add `type="button"` to any button that is **not** meant to submit.  
- This prevents unexpected submissions and page reloads.

```html
<button type="button">Click me</button>
```

---

## Globals Available on the Page

The following global variables are always available:

- `CF_USERID`  
- `CF_SPACEID`  
- `CF_USER_DISPLAY_NAME`

---

## Fonts & Assets

- **Do not** override or re-declare font files in CSS.  
- Spinner image is available at: `/assets/Themes/default/images/spinner.gif`

---

## Existing Libraries

- Emoji script is already present: `emoji.min.js?v=10.64.1.20250616` **Do not load it again.**  
- Font Awesome Pro is already present. **Do not load or re-import another instance.**

---

## CSS Scoping & Host Page Conflicts

The host page includes **global CSS rules** that may override your styles  
(e.g. fixed heights on `<select>` elements).

### Rules

- Assign **unique classes** to all new components and elements that require styling.  
- Scope **all CSS** strictly to your component or container.  
- Prefer **selector specificity** over `!important` to avoid breaking other widgets and to keep overrides maintainable.