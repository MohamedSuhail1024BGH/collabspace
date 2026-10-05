# International Web Design & Development Standards for Vibecoding

> **Purpose:** A practical, AI-friendly specification for building
> modern, accessible, responsive, international, secure, performant, and
> maintainable websites and web applications.
>
> **Primary use:** Give this document to an AI coding agent before
> asking it to create or modify UI. Treat the rules marked **MUST** as
> requirements, **SHOULD** as strong recommendations, and **MAY** as
> optional.

**Version:** 1.0\
**Updated:** 2026-10-05\
**Target:** Modern websites and web applications\
**Default accessibility target:** WCAG 2.2 Level AA

------------------------------------------------------------------------

## 1. Core Principle

Build for the **web first**, not for a single screen, browser, language,
country, or user type.

Every implementation should optimize for:

1.  **Accessibility**
2.  **Usability**
3.  **Responsive behavior**
4.  **Internationalization**
5.  **Semantic HTML**
6.  **Performance**
7.  **Security**
8.  **Maintainability**
9.  **Consistency**
10. **Progressive enhancement**

Do not optimize only for appearance. A page that looks excellent but is
inaccessible, unusable on mobile, slow, insecure, or impossible to
localize is not production-quality.

------------------------------------------------------------------------

# 2. Standards Hierarchy

When making implementation decisions, use this priority order:

1.  **Applicable legal/regulatory requirements**
2.  **W3C standards and recommendations**
3.  **Established platform/web standards**
4.  **Security standards and guidance**
5.  **Browser/platform capabilities**
6.  **Product requirements**
7.  **Design preferences**

Do not invent custom behavior when a native HTML/browser capability
already solves the problem.

### Primary references

-   W3C Web Standards: https://www.w3.org/standards/
-   WCAG 2.2: https://www.w3.org/TR/WCAG22/
-   WCAG Overview: https://www.w3.org/WAI/standards-guidelines/wcag/
-   W3C Internationalization: https://www.w3.org/International/
-   W3C Internationalization Quick Tips:
    https://www.w3.org/International/quicktips/
-   WHATWG HTML Living Standard: https://html.spec.whatwg.org/
-   Core Web Vitals: https://web.dev/articles/vitals
-   OWASP Top 10:2025: https://owasp.org/www-project-top-ten/

------------------------------------------------------------------------

# 3. Accessibility Standard --- WCAG 2.2 AA

## Requirement

The default target for production interfaces is **WCAG 2.2 Level AA**.

WCAG is organized around four principles:

-   **Perceivable**
-   **Operable**
-   **Understandable**
-   **Robust**

### AI instruction

When generating UI code:

> **MUST implement the interface so that keyboard users, screen-reader
> users, users with low vision, users with motor limitations, and users
> with cognitive/accessibility needs can use the core functionality.**

Do not treat accessibility as a later patch.

------------------------------------------------------------------------

## 3.1 Keyboard Accessibility

Every interactive feature MUST be usable with a keyboard.

### Rules

-   Use native `<button>` for actions.
-   Use `<a>` for navigation.
-   Use `<input>`, `<select>`, `<textarea>`, and native form controls
    where appropriate.
-   Do not use `<div>` or `<span>` as buttons.
-   Do not create custom keyboard behavior unless necessary.
-   Keyboard focus MUST be visible.
-   Focus order MUST be logical.
-   Users MUST be able to reach and operate dialogs, menus, dropdowns,
    tabs, forms, tables, and controls.
-   Avoid keyboard traps.

### Bad

``` html
<div onclick="save()">Save</div>
```

### Good

``` html
<button type="button" onclick="save()">Save</button>
```

------------------------------------------------------------------------

# 4. Semantic HTML

Use HTML according to meaning, not appearance.

### Prefer

``` html
<header>
<nav>
<main>
<section>
<article>
<aside>
<footer>
<h1>
<h2>
<h3>
<p>
<button>
<a>
<form>
<label>
<table>
```

### Avoid

``` html
<div class="button">
<div class="header">
<div class="navigation">
```

when a native semantic element exists.

### Heading hierarchy

Use a logical heading hierarchy:

``` text
h1
 ├── h2
 │    ├── h3
 │    └── h3
 └── h2
      └── h3
```

Rules:

-   Each page should have a clear primary heading.
-   Do not choose heading levels only because of font size.
-   Use CSS for visual sizing.
-   Do not skip heading levels merely to obtain a desired visual
    appearance.

------------------------------------------------------------------------

# 5. ARIA Rules

**First rule of ARIA: do not use ARIA when native HTML already provides
the required semantics.**

### Prefer

``` html
<button>Open menu</button>
```

over:

``` html
<div role="button" tabindex="0">Open menu</div>
```

Use ARIA when:

-   A custom interactive component genuinely requires it.
-   Additional accessible state must be communicated.
-   A relationship cannot be represented using native HTML.

### Important ARIA states

Examples:

``` html
<button aria-expanded="false">
```

``` html
<button aria-controls="settings-panel">
```

``` html
<input aria-invalid="true">
```

``` html
<div role="alert">
```

Do not add ARIA attributes randomly.

------------------------------------------------------------------------

# 6. Color and Contrast

Color MUST NOT be the only way information is communicated.

Bad:

> Red means overdue.

Good:

> Red + warning icon + "Overdue" label.

### Contrast

Design for WCAG 2.2 AA contrast requirements.

As a practical baseline:

-   Normal text: target at least **4.5:1**
-   Large text: target at least **3:1**
-   Important UI states and controls must remain distinguishable.
-   Do not rely on extremely subtle gray-on-gray text.

### Do not

-   Use low-contrast placeholder text as primary instructions.
-   Make disabled-looking content indistinguishable from active content
    when users need to understand the state.
-   Communicate success/error/warning using color alone.

------------------------------------------------------------------------

# 7. Focus States

Every keyboard-focusable element needs a clear focus indicator.

Example:

``` css
:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 3px;
}
```

Do not globally remove focus outlines without replacing them.

Avoid:

``` css
*:focus {
  outline: none;
}
```

------------------------------------------------------------------------

# 8. Touch and Pointer Interaction

Interactive targets should be comfortable to use on touch devices.

Rules:

-   Do not place critical actions extremely close together.
-   Avoid tiny icon-only buttons.
-   Provide adequate hit areas.
-   Do not require hover for essential functionality.
-   Ensure drag-and-drop alternatives exist when the operation is
    important.
-   Support touch, mouse, keyboard, and assistive technology where
    applicable.

------------------------------------------------------------------------

# 9. Forms

Forms MUST be understandable without relying on placeholders alone.

### Every input needs

-   A visible or programmatically associated label.
-   Appropriate input type.
-   Useful autocomplete information when applicable.
-   Clear validation.
-   Helpful error messages.
-   Accessible error association.
-   Logical keyboard order.

### Good

``` html
<label for="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
/>
```

### Error message

Bad:

> Invalid.

Good:

> Enter a valid email address, for example name@example.com.

Errors should explain:

1.  What went wrong.
2.  Which field is affected.
3.  How the user can fix it.

------------------------------------------------------------------------

# 10. Responsive Web Design

The UI MUST work across:

-   Small mobile phones
-   Large mobile phones
-   Tablets
-   Laptops
-   Desktop monitors
-   Large/high-resolution displays

Do not design only for one resolution.

## 10.1 Mobile-first

Prefer:

``` css
/* Base = small screens */

.container {
  width: 100%;
}

/* Enhance for larger screens */
@media (min-width: 768px) {
  .container {
    max-width: 1200px;
  }
}
```

Avoid designing around arbitrary device names such as:

``` text
iPhone breakpoint
iPad breakpoint
Samsung breakpoint
MacBook breakpoint
```

Use breakpoints where the **content layout needs to change**.

------------------------------------------------------------------------

# 11. Responsive Layout Rules

Prefer:

-   CSS Grid
-   Flexbox
-   `min()`
-   `max()`
-   `clamp()`
-   container queries where appropriate
-   fluid sizing
-   relative units

Avoid excessive fixed dimensions.

### Prefer

``` css
font-size: clamp(1.5rem, 2vw, 2.5rem);
```

over:

``` css
font-size: 40px;
```

for fluid headings where appropriate.

### Avoid

``` css
width: 1200px;
```

for major page containers.

Prefer:

``` css
width: min(100% - 2rem, 1200px);
margin-inline: auto;
```

------------------------------------------------------------------------

# 12. Logical CSS Properties

Use logical properties so the interface can support LTR and RTL
languages.

Prefer:

``` css
margin-inline
padding-inline
margin-block
padding-block
inset-inline-start
inset-inline-end
border-start-start-radius
```

Avoid unnecessarily hard-coding:

``` css
margin-left
margin-right
padding-left
padding-right
left
right
```

This is especially important for international applications.

------------------------------------------------------------------------

# 13. Internationalization (i18n)

Internationalization MUST be considered from the beginning.

Do not design an English-only interface and assume translation can be
added later.

W3C recommends Unicode/UTF-8, explicit language metadata, support for
local formats, and RTL handling.

## 13.1 Character Encoding

Use UTF-8.

``` html
<meta charset="utf-8">
```

The database, API, source files, and application should consistently
support Unicode.

------------------------------------------------------------------------

# 14. Language Metadata

Set the document language.

``` html
<html lang="en">
```

Examples:

``` html
<html lang="en">
<html lang="ta">
<html lang="hi">
<html lang="ar" dir="rtl">
```

If content changes language inside a document, mark the language
appropriately where needed.

------------------------------------------------------------------------

# 15. RTL Support

Applications intended for global audiences SHOULD support right-to-left
languages.

Examples:

-   Arabic
-   Hebrew
-   Persian
-   Urdu
-   Pashto
-   Sindhi

For an RTL document:

``` html
<html lang="ar" dir="rtl">
```

Do not implement RTL by manually changing hundreds of `left` and `right`
declarations.

Use:

-   `dir`
-   CSS logical properties
-   appropriate bidirectional text handling

### Important

**Direction is not identical to language.**

Do not assume language alone is sufficient to determine text direction
in every situation.

------------------------------------------------------------------------

# 16. Localization (l10n)

Never concatenate sentences from independently translated fragments.

Bad:

``` text
"Hello " + username + ", you have " + count + " tasks."
```

Better:

``` text
"Hello {username}, you have {count} tasks."
```

Use an internationalization library/framework that supports:

-   pluralization
-   interpolation
-   gender/context where required
-   locale-aware formatting
-   translation fallback
-   date/time formatting

------------------------------------------------------------------------

# 17. Dates and Times

Never assume every user uses:

``` text
MM/DD/YYYY
```

or:

``` text
DD/MM/YYYY
```

Use locale-aware formatting.

Prefer the platform's internationalization APIs:

``` js
new Intl.DateTimeFormat(locale).format(date)
```

Store timestamps in a consistent machine-readable representation,
normally UTC, and convert for display according to user/application
locale and timezone.

------------------------------------------------------------------------

# 18. Numbers, Currency, and Units

Do not hard-code:

``` text
$1,000.00
```

for a global application.

Use locale-aware formatting.

``` js
new Intl.NumberFormat(locale, {
  style: "currency",
  currency: currencyCode
}).format(amount)
```

Support:

-   decimal separators
-   thousands separators
-   currency symbols
-   currency placement
-   localized digits where appropriate
-   metric/imperial units where product requirements demand them

------------------------------------------------------------------------

# 19. Text Expansion

Translated text can be significantly longer or shorter than the
original.

Therefore:

-   Buttons MUST tolerate text expansion.
-   Cards MUST tolerate longer titles.
-   Navigation MUST tolerate longer labels.
-   Avoid fixed-width text containers for important UI.
-   Do not rely on exact English word lengths.
-   Allow text wrapping where appropriate.

Bad:

``` css
button {
  width: 90px;
  white-space: nowrap;
}
```

unless the design has a specific justified reason.

------------------------------------------------------------------------

# 20. Typography

Choose fonts for:

-   readability
-   language coverage
-   performance
-   accessibility
-   consistent rendering

If multiple writing systems are supported, verify that the chosen font
actually contains the required glyphs.

### Recommended principles

-   Use a clear type hierarchy.
-   Use comfortable line height.
-   Avoid extremely thin body text.
-   Avoid excessive all-caps for long text.
-   Do not use decorative fonts for essential information.
-   Allow users to zoom without destroying the layout.

------------------------------------------------------------------------

# 21. Content Design

Use clear, concise, predictable language.

Prefer:

> Delete project?

instead of:

> Are you absolutely sure that you would like to proceed with the
> deletion of this project?

For destructive actions, however, clearly communicate consequences.

### Buttons

Use action-oriented labels:

``` text
Create project
Save changes
Delete task
Invite member
Download report
```

Avoid vague labels:

``` text
Click here
Submit
OK
Continue
```

when a more descriptive label is possible.

------------------------------------------------------------------------

# 22. Navigation

Navigation should be predictable and consistent.

A typical application may use:

``` text
Top Bar
 ├── Brand
 ├── Search
 ├── Notifications
 └── User Menu

Sidebar
 ├── Dashboard
 ├── Projects
 ├── Tasks
 ├── Calendar
 └── Settings

Main Content
```

But do not blindly copy this pattern. Navigation should reflect the
product's information architecture.

### Requirements

-   Current location should be visually identifiable.
-   Keyboard users must be able to navigate it.
-   Mobile navigation must remain usable.
-   Avoid hiding critical navigation behind unnecessarily complex
    interactions.

------------------------------------------------------------------------

# 23. Layout System

Use a consistent spacing system.

Example:

``` text
4px
8px
12px
16px
24px
32px
48px
64px
96px
```

Do not randomly invent spacing values throughout the application.

Use design tokens.

Example:

``` css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}
```

------------------------------------------------------------------------

# 24. Design Tokens

Centralize reusable design decisions.

Recommended token groups:

``` text
Colors
Typography
Spacing
Radius
Shadows
Borders
Z-index
Motion
Breakpoints
Component sizes
```

Example:

``` css
:root {
  --color-primary: ...;
  --color-background: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-muted: ...;
  --color-border: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --shadow-sm: ...;
  --shadow-md: ...;
}
```

Avoid scattering raw colors and spacing values throughout components.

------------------------------------------------------------------------

# 25. Dark Mode

If dark mode is supported:

-   Do not simply invert every color.
-   Check contrast independently.
-   Avoid pure black + pure white everywhere.
-   Maintain clear hierarchy.
-   Ensure images/icons remain visible.
-   Respect the user's system preference when appropriate.

Support:

``` css
@media (prefers-color-scheme: dark) {
  ...
}
```

if system-driven theme selection is desired.

------------------------------------------------------------------------

# 26. Motion and Animation

Animation should communicate:

-   state changes
-   hierarchy
-   continuity
-   feedback

Avoid animation merely for decoration when it harms usability.

Respect:

``` css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Do not use flashing content that can create seizure risk.

------------------------------------------------------------------------

# 27. Images and Media

Images MUST have meaningful alternatives when they convey information.

``` html
<img src="/avatar.jpg" alt="Aisha Khan">
```

Decorative images can use:

``` html
<img src="/decorative.svg" alt="">
```

Do not put filenames or meaningless descriptions into `alt`.

Bad:

``` html
<img alt="image123.png">
```

Good:

``` html
<img alt="Project dashboard showing task progress">
```

------------------------------------------------------------------------

# 28. Responsive Images

Use modern image techniques where useful:

-   WebP/AVIF where supported by the delivery pipeline.
-   Responsive `srcset`.
-   `sizes`.
-   Appropriate dimensions.
-   Lazy loading for below-the-fold images.

Example:

``` html
<img
  src="/image.webp"
  srcset="/image-480.webp 480w, /image-960.webp 960w"
  sizes="(max-width: 768px) 100vw, 50vw"
  width="960"
  height="640"
  loading="lazy"
  alt="..."
>
```

Do not lazy-load the main above-the-fold image when that harms LCP.

------------------------------------------------------------------------

# 29. Performance --- Core Web Vitals

Target good Core Web Vitals at the **75th percentile**.

Current practical targets:

  Metric      Target
  -------- ---------
  LCP         ≤ 2.5s
  INP        ≤ 200ms
  CLS          ≤ 0.1

### LCP

Optimize:

-   server response
-   critical CSS
-   hero images
-   font loading
-   render-blocking resources
-   unnecessary JavaScript

### INP

Optimize:

-   expensive event handlers
-   excessive JavaScript
-   large synchronous computations
-   unnecessary re-renders
-   long main-thread tasks

### CLS

Prevent:

-   images without dimensions
-   dynamically inserted content without reserved space
-   layout changes caused by fonts
-   late-loading UI elements

------------------------------------------------------------------------

# 30. Performance Rules for AI Coding

When generating code, the AI MUST NOT automatically add:

-   large libraries for trivial features
-   unnecessary animation packages
-   duplicate utility libraries
-   giant icon libraries when tree-shaking is unavailable
-   client-side JavaScript for purely static behavior
-   repeated API calls
-   expensive polling when event-driven updates are possible

Prefer the smallest reasonable implementation.

------------------------------------------------------------------------

# 31. Loading States

Every asynchronous operation should have a deliberate state.

Typical states:

``` text
Idle
Loading
Success
Empty
Error
Retrying
Disabled
```

Do not show a blank page while data loads.

Examples:

-   Skeleton for content-heavy layouts.
-   Spinner for short operations.
-   Progress indicator for long operations.
-   Disabled state during a mutation when duplicate submissions would be
    harmful.

------------------------------------------------------------------------

# 32. Empty States

Empty states should explain:

1.  What is empty.
2.  Why it may be empty.
3.  What the user can do next.

Bad:

> No data.

Good:

> No projects yet. Create your first project to start organizing your
> work.

------------------------------------------------------------------------

# 33. Error Handling

Errors should be:

-   understandable
-   actionable
-   localized
-   accessible
-   appropriately specific

Do not expose:

-   database stack traces
-   internal server paths
-   secret values
-   API keys
-   SQL queries
-   internal implementation details

Bad:

``` text
PostgresError: relation public.projects does not exist
```

User-facing:

``` text
We couldn't load your projects. Please try again.
```

Log technical details securely on the server.

------------------------------------------------------------------------

# 34. Security --- OWASP Top 10

Follow the current **OWASP Top 10** and framework-specific security
guidance.

The 2025 OWASP Top 10 includes:

1.  Broken Access Control
2.  Security Misconfiguration
3.  Software Supply Chain Failures
4.  Cryptographic Failures
5.  Injection
6.  Insecure Design
7.  Authentication Failures
8.  Software or Data Integrity Failures
9.  Security Logging & Alerting Failures
10. Mishandling of Exceptional Conditions

### AI coding rule

> Never assume AI-generated code is secure merely because it compiles or
> passes a happy-path test.

Every security-sensitive implementation must be reviewed.

------------------------------------------------------------------------

# 35. Authentication and Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Never confuse them.

For every protected resource, verify authorization server-side.

Do not rely on:

``` js
if (user.role === "admin") {
  // UI only
}
```

The UI can hide unavailable actions, but the server/database MUST
enforce permissions.

------------------------------------------------------------------------

# 36. Input Validation

Validate input at trust boundaries.

Examples:

-   browser
-   API
-   server
-   database
-   file upload
-   third-party webhook

Client validation improves UX.

Server validation provides security.

Do both when appropriate.

------------------------------------------------------------------------

# 37. Injection Prevention

Never build SQL or shell commands using unsafe string concatenation.

Prefer parameterized queries, prepared statements, and safe framework
APIs.

Treat all external input as untrusted.

This includes:

-   forms
-   URL parameters
-   cookies
-   headers
-   uploaded files
-   third-party API data
-   AI-generated content
-   database-derived content when it may contain user-controlled data

------------------------------------------------------------------------

# 38. Secrets

Never put secrets in frontend code.

Never commit:

``` text
API keys
private keys
database passwords
service-role credentials
JWT signing secrets
```

Use environment variables and secret-management systems.

A public browser application must never receive a credential that grants
server-level privileges.

------------------------------------------------------------------------

# 39. Dependency Security

Before adding a dependency, ask:

1.  Is it necessary?
2.  Is there a native/platform solution?
3.  Is it maintained?
4.  Is it reputable?
5.  Does it introduce unnecessary attack surface?
6.  Is its license compatible with the project?
7.  Does it significantly increase bundle size?

Keep dependencies updated and remove unused packages.

------------------------------------------------------------------------

# 40. Privacy

Collect only data that the product actually needs.

Provide appropriate:

-   privacy information
-   consent mechanisms where required
-   data deletion/export mechanisms where applicable
-   cookie controls where legally required
-   retention rules

Do not collect sensitive information merely because it might be useful
later.

------------------------------------------------------------------------

# 41. Progressive Enhancement

The application should provide the best possible experience without
making basic functionality unnecessarily dependent on JavaScript.

Where practical:

``` text
HTML → basic content/functionality
CSS → presentation
JavaScript → enhancement
```

For JavaScript-dependent applications, ensure failures are handled
gracefully and users receive useful feedback.

------------------------------------------------------------------------

# 42. Browser Compatibility

Test important functionality across current versions of major browsers:

-   Chrome/Chromium
-   Firefox
-   Safari
-   Edge

Also test:

-   mobile Safari
-   Android browsers
-   keyboard navigation
-   zoom
-   reduced motion
-   dark mode
-   RTL mode where supported

Do not use browser-specific hacks unless there is a documented reason.

------------------------------------------------------------------------

# 43. Mobile UX

Mobile is not a smaller desktop.

On small screens:

-   Prioritize primary actions.
-   Reduce visual clutter.
-   Use appropriate navigation patterns.
-   Avoid horizontal scrolling unless the content inherently requires
    it.
-   Tables may need responsive alternatives.
-   Keep forms easy to complete.
-   Avoid tiny controls.
-   Avoid hover-dependent interactions.

------------------------------------------------------------------------

# 44. Tables

Tables are for tabular data, not page layout.

Use:

``` html
<table>
  <thead>
  <tbody>
  <tfoot>
</table>
```

Provide meaningful headers.

For complex tables, consider:

-   responsive layout
-   horizontal scrolling
-   column prioritization
-   accessible labels
-   sorting/filtering controls
-   pagination

Do not force complex desktop tables into unreadable mobile cards without
considering the information structure.

------------------------------------------------------------------------

# 45. Dialogs and Modals

Use native `<dialog>` where appropriate.

A modal should:

-   have a clear title
-   have an accessible name
-   trap focus appropriately while open
-   return focus to the triggering element when closed
-   be dismissible using an appropriate mechanism
-   not hide critical information
-   work on mobile

Do not create arbitrary full-screen overlays for every interaction.

Prefer inline UI when a modal is unnecessary.

------------------------------------------------------------------------

# 46. Tooltips

Tooltips should supplement, not replace, essential information.

Do not hide critical instructions only inside hover tooltips because:

-   touch devices may not support hover
-   keyboard users may have difficulty discovering them
-   screen-reader users may not receive them

For icon-only controls, provide accessible names.

``` html
<button aria-label="Delete project">
  ...
</button>
```

------------------------------------------------------------------------

# 47. Search

Search interfaces should:

-   have a real form/control
-   have an accessible label
-   preserve the query when appropriate
-   clearly show loading
-   clearly show empty results
-   support keyboard operation
-   provide useful result summaries
-   handle no-result states

Example:

``` html
<form role="search">
  <label for="site-search">Search</label>
  <input id="site-search" name="q" type="search">
  <button type="submit">Search</button>
</form>
```

------------------------------------------------------------------------

# 48. URL and Navigation Design

Prefer readable URLs.

Good:

``` text
/projects/collabspace/tasks
```

Bad:

``` text
/page?id=92831&x=2
```

where a meaningful route can be used.

URLs should:

-   be stable
-   be shareable
-   use meaningful names
-   avoid leaking secrets
-   avoid exposing unnecessary internal database identifiers

------------------------------------------------------------------------

# 49. SEO Fundamentals

For public-facing pages:

-   Provide a unique `<title>`.
-   Provide useful metadata.
-   Use semantic headings.
-   Use descriptive links.
-   Provide canonical URLs where appropriate.
-   Provide appropriate Open Graph metadata.
-   Use structured data where genuinely applicable.
-   Ensure important content is crawlable.
-   Avoid duplicate pages where possible.
-   Provide meaningful text alternatives for images.

Do not sacrifice accessibility or usability merely to manipulate search
rankings.

------------------------------------------------------------------------

# 50. Forms and Autofill

Use correct autocomplete tokens.

Examples:

``` html
autocomplete="name"
autocomplete="email"
autocomplete="username"
autocomplete="current-password"
autocomplete="new-password"
autocomplete="street-address"
autocomplete="postal-code"
```

Correct autocomplete behavior improves usability and accessibility.

------------------------------------------------------------------------

# 51. Content Security

Do not inject arbitrary HTML from users.

Prefer safe text rendering.

If HTML must be rendered:

1.  sanitize it
2.  define an allowlist
3.  avoid unsafe script execution
4.  apply a suitable Content Security Policy where appropriate

Never use `dangerouslySetInnerHTML` or equivalent APIs casually.

------------------------------------------------------------------------

# 52. Data Fetching

Data fetching should have:

``` text
Loading
Success
Empty
Error
Retry
```

Avoid duplicate requests.

Use caching where appropriate.

Avoid fetching data merely because a component rendered if the data is
not needed.

------------------------------------------------------------------------

# 53. State Management

Keep state as local as possible.

Use global state only for genuinely shared state.

Examples of reasonable global state:

-   authenticated user
-   theme
-   locale
-   application-wide notifications
-   shared workspace context

Do not put every component's state into a global store.

------------------------------------------------------------------------

# 54. Component Architecture

Build reusable components around behavior and semantics.

Typical component hierarchy:

``` text
App
 ├── Layout
 │    ├── Header
 │    ├── Sidebar
 │    └── Main
 │
 ├── Page
 │    ├── PageHeader
 │    ├── Filters
 │    └── Content
 │
 └── Shared Components
      ├── Button
      ├── Input
      ├── Dialog
      ├── Dropdown
      ├── Table
      ├── Toast
      └── EmptyState
```

Avoid both extremes:

-   one giant component containing the entire application
-   hundreds of meaningless one-line components

------------------------------------------------------------------------

# 55. Component API Design

Components should expose meaningful properties.

Bad:

``` tsx
<Card x y z a b c />
```

Better:

``` tsx
<ProjectCard
  title="CollabSpace"
  status="active"
  progress={72}
/>
```

Use explicit names.

------------------------------------------------------------------------

# 56. UI Consistency

The same action should look and behave consistently throughout the
application.

Examples:

-   Primary actions use the same visual language.
-   Destructive actions use a consistent treatment.
-   Form fields have consistent spacing.
-   Error states behave consistently.
-   Toasts have consistent placement.
-   Dialogs share consistent structure.

Create reusable primitives instead of repeatedly recreating them.

------------------------------------------------------------------------

# 57. Microcopy

UI text is part of the interface.

Use:

-   direct language
-   active voice
-   consistent terminology
-   sentence case where appropriate
-   short labels
-   meaningful error messages

Maintain a product vocabulary.

For example, do not alternate between:

``` text
Workspace
Team Space
Project Space
Organization
```

if they mean the same thing.

Choose one term and use it consistently.

------------------------------------------------------------------------

# 58. Icons

Icons should support understanding, not create ambiguity.

Rules:

-   Use recognizable icons.
-   Provide accessible names for icon-only controls.
-   Do not use emoji as functional UI icons unless intentionally
    designed and tested.
-   Keep icon sizes consistent.
-   Do not mix incompatible visual styles.

Example:

``` html
<button aria-label="Settings">
  <SettingsIcon aria-hidden="true" />
</button>
```

------------------------------------------------------------------------

# 59. Toasts and Notifications

Notifications should not interrupt users unnecessarily.

Provide:

-   clear message
-   appropriate severity
-   readable duration
-   accessible announcement
-   action where useful

Example:

``` text
Project saved successfully.
[Undo]
```

Avoid:

``` text
SUCCESS!!!
```

------------------------------------------------------------------------

# 60. Destructive Actions

For irreversible actions:

-   Clearly label the action.
-   Explain consequences.
-   Avoid accidental activation.
-   Require confirmation where appropriate.
-   Provide undo when feasible.

Example:

``` text
Delete project?

This will permanently remove the project and its tasks.

[Cancel] [Delete project]
```

------------------------------------------------------------------------

# 61. AI/Vibecoding Rules

This section is specifically for AI-generated code.

## AI MUST

-   Read existing project conventions before changing code.
-   Reuse existing components and design tokens.
-   Inspect related components before creating new ones.
-   Preserve existing behavior unless a change is requested.
-   Use semantic HTML.
-   Implement accessibility from the beginning.
-   Consider mobile and desktop layouts.
-   Consider loading, empty, error, and success states.
-   Consider localization.
-   Validate authorization server-side.
-   Avoid introducing unnecessary dependencies.
-   Explain risky architectural changes.
-   Keep code understandable by humans.
-   Test generated code.

## AI MUST NOT

-   Invent APIs.
-   Invent database columns.
-   Invent authentication behavior.
-   Invent environment variables.
-   expose secrets
-   remove accessibility features to simplify implementation
-   disable TypeScript errors just to make code compile
-   use `any` everywhere to suppress type errors
-   remove tests instead of fixing failures
-   hide errors instead of handling them
-   duplicate existing components unnecessarily
-   create arbitrary CSS values without checking the design system
-   assume English is the only language
-   assume desktop is the primary device
-   trust user input
-   trust AI-generated code automatically

------------------------------------------------------------------------

# 62. Vibe Coding Safety Rule

AI-generated code must be treated as **untrusted implementation until
reviewed and tested**.

Before accepting generated code, verify:

``` text
[ ] I understand what the code does.
[ ] It does not expose secrets.
[ ] It does not bypass authorization.
[ ] It validates untrusted input.
[ ] It does not introduce unsafe HTML injection.
[ ] It does not add unnecessary dependencies.
[ ] It does not break accessibility.
[ ] It works on mobile.
[ ] It handles loading/error/empty states.
[ ] It does not create obvious performance problems.
[ ] It does not break existing functionality.
```

------------------------------------------------------------------------

# 63. Recommended Definition of Done

A UI feature is not complete until:

## Visual

-   [ ] Design matches the intended visual system.
-   [ ] Spacing is consistent.
-   [ ] Typography is consistent.
-   [ ] Responsive layouts work.
-   [ ] Dark mode works if supported.
-   [ ] Loading state exists.
-   [ ] Empty state exists.
-   [ ] Error state exists.
-   [ ] Success state exists.

## Accessibility

-   [ ] Keyboard navigation works.
-   [ ] Focus is visible.
-   [ ] Semantic HTML is used.
-   [ ] Labels exist for form controls.
-   [ ] Images have appropriate alternatives.
-   [ ] Color is not the only information channel.
-   [ ] Contrast is acceptable.
-   [ ] Screen-reader semantics are sensible.
-   [ ] Reduced-motion behavior is considered.

## Internationalization

-   [ ] UTF-8 is used.
-   [ ] Language metadata exists.
-   [ ] Text can be translated.
-   [ ] Text expansion is supported.
-   [ ] Dates use locale-aware formatting.
-   [ ] Numbers/currency use locale-aware formatting.
-   [ ] RTL has been considered.
-   [ ] CSS logical properties are used where appropriate.

## Performance

-   [ ] Images are optimized.
-   [ ] Unnecessary JavaScript is avoided.
-   [ ] Layout shifts are minimized.
-   [ ] Large computations are avoided on the main thread.
-   [ ] Core Web Vitals are considered.
-   [ ] Network requests are not duplicated unnecessarily.

## Security

-   [ ] Server-side authorization exists.
-   [ ] Inputs are validated.
-   [ ] Injection risks are addressed.
-   [ ] Secrets are protected.
-   [ ] Dependencies are justified.
-   [ ] User-controlled HTML is sanitized or avoided.
-   [ ] Errors do not expose internal information.

## Code Quality

-   [ ] Existing components were reused where appropriate.
-   [ ] No unnecessary duplication.
-   [ ] Types are correct.
-   [ ] Naming is clear.
-   [ ] No debug code remains.
-   [ ] No unnecessary `TODO` placeholders remain.
-   [ ] Tests were added or updated where appropriate.

------------------------------------------------------------------------

# 64. AI Prompt Template

Use this prompt when asking an AI coding agent to implement a feature:

``` text
Implement this feature according to the project's existing architecture and design system.

Follow these web standards:

1. WCAG 2.2 Level AA
2. Semantic HTML
3. Keyboard accessibility
4. Visible focus states
5. Responsive mobile-first design
6. Internationalization and UTF-8
7. RTL compatibility where applicable
8. CSS logical properties
9. Locale-aware dates/numbers/currency
10. Core Web Vitals performance practices
11. OWASP security practices
12. Server-side authorization
13. Input validation
14. Safe handling of user-generated content
15. Existing project design tokens and components

Before coding:
- Inspect related existing components.
- Identify reusable components.
- Identify existing design tokens.
- Identify existing API/data patterns.
- Identify existing authentication/authorization rules.
- Do not invent missing architecture.

Implementation requirements:
- Use semantic HTML.
- Do not use divs as buttons.
- Do not remove focus indicators.
- Do not hard-code text that should be translatable.
- Do not hard-code locale-specific date/number/currency formatting.
- Do not use fixed desktop-only dimensions.
- Handle loading, empty, success, and error states.
- Ensure keyboard and screen-reader accessibility.
- Ensure mobile usability.
- Avoid unnecessary dependencies.
- Never expose secrets.
- Validate authorization on the server.

After implementation:
- Check desktop layout.
- Check mobile layout.
- Check keyboard navigation.
- Check focus behavior.
- Check accessibility semantics.
- Check loading/error/empty states.
- Check RTL implications.
- Check performance implications.
- Check security implications.
- Check that existing functionality was not broken.

Do not consider the task complete until these requirements are satisfied.
```

------------------------------------------------------------------------

# 65. Project-Level AI Constitution

For a large project, put the following rules into the project's AI
instructions file, such as:

``` text
AGENTS.md
CLAUDE.md
.cursor/rules/
.github/copilot-instructions.md
```

Recommended core instruction:

``` text
You are working on a production-quality web application.

Treat accessibility, responsive design, internationalization, security, performance, and maintainability as first-class requirements.

Default standards:
- WCAG 2.2 AA
- Semantic HTML
- UTF-8
- Mobile-first responsive design
- RTL-ready architecture
- Locale-aware formatting
- Core Web Vitals awareness
- OWASP Top 10 security practices

Never sacrifice accessibility, security, or correctness merely to make the UI look visually impressive.

Before modifying code, inspect the existing architecture and reuse existing components, utilities, types, design tokens, and patterns.

Never invent APIs, database fields, permissions, secrets, or application behavior.

Every new UI feature must account for:
- loading
- success
- empty
- error
- disabled
- keyboard
- mobile
- accessibility
- localization

Every protected operation must enforce authorization on the server/database layer.

Every external input is untrusted.

AI-generated code must be understandable, reviewable, testable, and secure.
```

------------------------------------------------------------------------

# 66. Quick Reference --- Non-Negotiable Rules

``` text
MUST:
✓ Use semantic HTML
✓ Target WCAG 2.2 AA
✓ Support keyboard navigation
✓ Preserve visible focus
✓ Use accessible form labels
✓ Use meaningful image alternatives
✓ Use responsive layouts
✓ Use UTF-8
✓ Support localization architecture
✓ Use locale-aware dates/numbers/currency
✓ Use CSS logical properties for international layouts
✓ Validate input
✓ Enforce authorization server-side
✓ Protect secrets
✓ Prevent injection
✓ Handle loading/error/empty states
✓ Optimize images
✓ Consider Core Web Vitals
✓ Reuse existing project components
✓ Test generated code

MUST NOT:
✗ Use divs as buttons
✗ Remove focus outlines without replacement
✗ Depend on hover for essential functionality
✗ Use color as the only status indicator
✗ Hard-code locale-specific formatting
✗ Assume English is the only language
✗ Assume LTR is the only direction
✗ Trust client-side authorization
✗ Expose secrets
✗ Build SQL with unsafe string concatenation
✗ Render unsanitized user HTML
✗ Add unnecessary dependencies
✗ Ignore mobile
✗ Ignore keyboard accessibility
✗ Disable type checking to hide problems
✗ Delete tests to make CI pass
✗ Treat AI-generated code as automatically safe
```

------------------------------------------------------------------------

# 67. Final Standard

The goal is not to make every website look the same.

The goal is to make websites that are:

> **Accessible + usable + responsive + international + secure + fast +
> maintainable + understandable.**

Use standards to establish the foundation. Use product design to
establish personality.

A beautiful interface is good.

A beautiful interface that works for people across devices, languages,
abilities, network conditions, and interaction methods is **professional
web design**.

------------------------------------------------------------------------

## Official References

1.  W3C Web Standards --- https://www.w3.org/standards/
2.  W3C WCAG 2.2 --- https://www.w3.org/TR/WCAG22/
3.  W3C WCAG Overview ---
    https://www.w3.org/WAI/standards-guidelines/wcag/
4.  W3C Internationalization Quick Tips ---
    https://www.w3.org/International/quicktips/
5.  W3C Internationalization Best Practices ---
    https://www.w3.org/TR/international-specs/
6.  WHATWG HTML Living Standard --- https://html.spec.whatwg.org/
7.  Core Web Vitals --- https://web.dev/articles/vitals
8.  OWASP Top 10:2025 --- https://owasp.org/www-project-top-ten/

## Important Note

This document is a practical engineering guide, not a substitute for
legal advice, a formal accessibility audit, a penetration test, or a
complete standards conformance assessment.

Standards and browser capabilities evolve. For compliance-sensitive
projects, verify the current normative specification and applicable
local/regional requirements before release.
