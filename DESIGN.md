# DESIGN.md — Project One

Every UI decision must obey this file. If a choice is not covered here, ask before inventing one.

The visual reference image in the project root is the source of truth for *feel*. This file translates it into tokens and rules. Where the two disagree, this file wins.

---

## Why this file exists

Models are trained toward the average, so unguided UI output clusters around the same safe defaults, and the result is recognisable on sight. Left alone you will produce: a purple-to-blue gradient on white, Inter everywhere, a centred hero with three rounded feature cards, `rounded-2xl` + `shadow-lg` + `backdrop-blur` on everything, and an untouched zinc palette.

The reference is not that. It is a confident, high-contrast product site with a specific colour identity, generous whitespace, and real UI screenshots doing the selling. Match that level of intent.

---

## The committed direction

**Confident clinical.** Bright, clean, generous with space. A strong cornflower blue carries identity, near-black panels create rhythm and contrast, and a sharp lime accent appears rarely enough to mean something. Type is large, tight, and geometric. Nothing glassy, nothing gradient, nothing soft-focus.

Applied to physiotherapy rather than general practice: the imagery is movement, recovery, and hands-on treatment, never stock doctors in white coats.

---

## Banned outright

**Colour**
- `indigo-*`, `violet-*`, `purple-*` in any role
- Multi-stop gradients of any kind. The reference uses flat colour blocks. Keep it that way.
- Default Tailwind named palettes used raw (`blue-600`, `slate-900`, `emerald-500`). Use the tokens below only.
- Glassmorphism, `backdrop-blur`, neon glow

**Type**
- Inter or Roboto
- A single face doing every job with no weight contrast

**Layout**
- Centred hero → three equal feature cards → FAQ accordion → footer, as a default reflex
- `rounded-2xl` + `shadow-lg` on every surface uniformly

**Copy**
- "Elevate your…", "Seamlessly…", "Transform your…"
- Emoji as section icons
- Arrow glyphs decorating headings

---

## Colour tokens

Define in `tailwind.config.ts`. Never reference a default Tailwind colour name in a component.

```ts
colors: {
  azure: {
    DEFAULT: '#4B7BF5',   // primary identity blue — buttons, filled panels, selected slot
    hover:   '#3A66DC',
    soft:    '#E8EEFE',   // tinted section grounds, hover states
    ring:    '#B9CCFB',
  },
  lime: {
    DEFAULT: '#D6F24B',   // accent only — stat figures, one CTA per page
    ink:     '#1F2A0A',   // text on lime
  },
  carbon: {
    DEFAULT: '#101215',   // dark feature panels
    raised:  '#1C1F24',   // cards inside dark panels
    line:    '#2C3037',
  },
  paper: {
    DEFAULT: '#FFFFFF',
    tint:    '#F4F7FE',   // alternating section ground
    sunk:    '#EDF1F7',   // disabled surfaces
  },
  ink: {
    DEFAULT: '#0E1116',
    soft:    '#4A515C',
    muted:   '#8A929E',
  },
  line: { DEFAULT: '#E3E8F0', strong: '#CBD3E0' },
  state: {
    ok:     '#2E7D52',  okSoft:     '#E3F2EA',   // confirmed
    warn:   '#B0791B',  warnSoft:   '#FBF0DA',   // rescheduled
    danger: '#C23434',  dangerSoft: '#FBE4E3',   // cancelled
  },
}
```

**Discipline on lime.** It is an accent, not a secondary colour. At most one lime element per viewport — a stat figure, or the single confirm button on the booking summary. The moment it appears twice it stops working.

**Dark mode:** `carbon.DEFAULT` becomes the ground, `paper` inverts, azure lightens to `#6E95F7`. Re-check every contrast pair rather than inverting mechanically.

---

## Type

Two weights of one geometric sans, loaded via `next/font`:

- **Primary:** `Plus Jakarta Sans` — headings at 700, UI at 500/600, body at 400. Not Inter.
- **Numerals in the slot grid and admin table:** `font-variant-numeric: tabular-nums`. Non-negotiable. Times and dates must align in columns.

Headings are **large and tight**, matching the reference:

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Hero | 44/48 mobile, 60/62 desktop | 700 | -0.03em |
| Section heading | 32/38 | 700 | -0.025em |
| Stat figure | 56/56 | 700 | -0.02em |
| Card title | 18/24 | 600 | -0.01em |
| Body | 15/24 | 400 | 0 |
| Slot button | 15/20 tabular | 500 | 0 |
| Meta / label | 12/16 uppercase | 600 | 0.06em |

Hero and section headings are **two lines, centred, with a hard break** — as in the reference. Write the break into the markup; do not let it wrap arbitrarily.

---

## Shape and depth

- **Radius:** `10px` on buttons, inputs, and slot chips. `16px` on cards and panels. `24px` on the large full-bleed feature blocks. Never `rounded-full` except on avatars and pill CTAs.
- **Depth comes from flat colour blocks and borders, not shadows.** The reference gets its structure from alternating white / tint / carbon sections. One shadow token only — `0 2px 8px rgba(14,17,22,0.06)` — for genuinely floating elements (dropdowns, dialogs).
- **Spacing:** 4px base. Sections breathe at 96px desktop, 56px mobile. Be generous; cramped is the fastest way to lose the reference's feel.

---

## Layout

- **Sections alternate ground colour**: white → tint → carbon → white. This rhythm is the single most characteristic thing about the reference. Use it.
- **Hero is centred**; everything below it is left-aligned within its container.
- **Feature panels use an asymmetric 2-up grid** — a dark text card beside a blue image card, then reversed on the next row. Not three equal columns.
- **The slot grid is the hero of this app.** The reference dedicates a whole section to it and so do we. Horizontal day strip across the top (Mon–Sun with dates), time chips in a dense grid below, a summary bar pinned at the bottom showing the chosen date and time with the confirm button on the right.
- **The admin table is a table on desktop.** A receptionist scanning forty rows needs rows, not cards. Collapse to stacked cards below 768px only.
- Max content width `1120px`.

---

## Component rules

**Day strip** (top of the picker)
- Each day is a vertical chip: weekday label above, date numeral below
- Selected: `azure` fill, white text, `10px` radius
- Unavailable: `paper.sunk`, `ink.muted`, not clickable
- Scrolls horizontally on mobile, snapping per day

**Slot chip** — the most important component in the app
- Available: `paper.tint` ground, no border, `ink` text
- Hover: `azure.soft` ground
- Selected: `azure` fill, white text
- Unavailable: `paper.sunk` ground, `ink.muted` at 50%, strikethrough, `aria-disabled="true"`, kept in the DOM
- Minimum 44×44px tap target, always
- 4 columns mobile, 6 tablet, 8 desktop

**Summary bar**
- Full-width strip below the grid, `lime.soft` tint ground, `10px` radius
- Left: `9 November 2026 · 09:30 · 45 min`
- Right: primary confirm button
- This is the one place lime is allowed on the booking screen

**Buttons**
- Primary: `azure` fill, white, `10px` radius, 44px tall
- Pill CTA (hero only): `azure` fill, fully rounded, 44px tall
- Secondary: white fill, `line.strong` border, `ink` text
- Accent: `lime` fill, `lime.ink` text — maximum one per page
- Destructive: `state.danger` text on transparent
- Never two primary buttons in one view

**Status badges** — text plus a 6px dot, never colour alone:
`Confirmed` ok · `Rescheduled` warn · `Cancelled` danger · `Completed` ink.muted · `No-show` danger outline

**Stat block** (dashboard and landing) — large lime or azure numeral, small uppercase label beneath, on a tint or carbon ground.

**Empty states** — one sentence in `ink.soft`, one action. No illustration, no emoji, no apology.

---

## Imagery

- Physiotherapy-specific: treatment rooms, exercise, hands-on work, recovery. **Never** a stock doctor in a white coat with a stethoscope.
- Product screenshots on the landing page are real screenshots of this app, taken once it exists. Do not fabricate a mockup image — build the screen, then capture it.
- Physiotherapist portraits: square, `16px` radius, consistent crop, neutral background.

---

## Motion

Restrained. This is a medical tool.

- Colour and border transitions: `160ms ease-out`
- Slot grid loading: skeleton in `paper.sunk`, no shimmer sweep
- Dialogs: 140ms fade plus 6px rise. No scale, no bounce, no spring
- Section reveals on scroll: fade plus 12px rise, once only, never repeating
- Respect `prefers-reduced-motion: reduce` — disable all transitions

---

## Copy voice

Plain, direct, human. Short declarative headlines, as in the reference.

| Write this | Not this |
|---|---|
| "Book an appointment" | "Get Started" |
| "Need physio? You're in the right place." | "Elevate your recovery journey" |
| "Booking takes a few clicks." | "Seamless scheduling experience" |
| "That time was just taken. Pick another." | "An error occurred" |
| "No times available on this day." | "Oops! Nothing here 😔" |
| "Your appointment is confirmed." | "You're all set! 🎉" |

Dates read as `Tue 14 Oct`, times as `09:30` — 24-hour, matching Namibian convention. Never "2:30 PM".

---

## Accessibility (blocking, not optional)

- WCAG AA on every pair. Check `azure` on white and `lime.ink` on `lime` specifically — lime on white fails and must never be used as text on a light ground.
- Availability never conveyed by colour alone; always paired with text or strikethrough.
- Slot chips carry `aria-label="09:30 to 10:15, available"`.
- Full keyboard path through the day strip and slot grid, with a visible 2px `azure.ring` focus ring.
- Dialogs trap focus and restore it on close.

---

## Self-audit before declaring any UI chunk done

If any answer is yes, fix it before moving on.

- [ ] Any indigo, violet, or purple in the file?
- [ ] Any multi-stop gradient?
- [ ] Is Inter or Roboto loaded?
- [ ] Any `shadow-lg`, `shadow-xl`, or `backdrop-blur`?
- [ ] Does any default Tailwind colour name appear in a `className`?
- [ ] Is lime used more than once in a single viewport?
- [ ] Three equal cards sitting in a centred row?
- [ ] Any button saying "Get Started"?
- [ ] Any emoji in the UI?
- [ ] Is lime being used as text on a light ground?
- [ ] Could this screen be swapped into any other SaaS product without anyone noticing?

That last one is the real test.
