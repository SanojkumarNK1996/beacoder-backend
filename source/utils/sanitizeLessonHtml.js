const sanitizeHtml = require("sanitize-html");

const sanitizeLessonHtml = (html) => sanitizeHtml(html, {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "ul", "ol", "li", "br",
    "pre", "code", "strong", "em", "b", "i", "u",
    "a", "span", "div"
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    "*": ["class"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  nonTextTags: ["style", "script", "textarea", "noscript"]
});

module.exports = sanitizeLessonHtml;
