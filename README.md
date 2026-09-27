# Arias Landscaping — website

Static site (plain HTML/CSS/JS, no build step). Hosted on Vercel.

## Files
- `index.html` — the whole page (nav, hero, services, why-us, gallery, service area, request form, CTA, footer)
- `styles.css` — all styling; brand colors are the variables at the top of the file
- `script.js` — mobile menu, gallery/lightbox, before-after slider, form validation + submission
- `gallery-data.js` — **edit this to add real project photos** (instructions inside)
- `images/` — favicon, social share image, gallery photos (`images/gallery/`)

## Common edits
- **Add project photos:** drop photos into `images/gallery/`, then edit `gallery-data.js`.
- **Hero photo:** add `images/hero.jpg` and set `--hero-image: url("images/hero.jpg");` on the `.hero` rule in `styles.css`.
- **Form email:** submissions go through Formspree to ariaslandscaping912@gmail.com. The form ID is `FORM_ENDPOINT` at the top of `script.js`; the destination email is managed in the Formspree dashboard.
- **Site URL:** if the domain changes, update the `canonical`, `og:url`, `og:image` and JSON-LD `url` values in `index.html`.
