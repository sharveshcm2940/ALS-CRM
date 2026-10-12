# Stillwater Residences

A bespoke real-estate demonstration built with Next.js App Router, React, TypeScript, Tailwind CSS, GSAP/ScrollTrigger, Motion, Lenis and Swiper.

## Run

Use the existing `/workspace/Saranya-dad` checkout; cloud tasks already have isolated environments. Node 24 and npm 11 were used for validation.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

For production, run `npm run build`, then `npm run start`. Run `npm run typecheck` to check TypeScript. No credentials, database, or external services are required to run the site. Images and fonts are local.

## Reference interpretation

The supplied 32-second video shows a filmed laptop rather than a clean screen recording. Its visual sequence includes a full-width architectural hero, an ivory search strip, an editorial “daily rituals” section, property hero presentations, asymmetric specifications and highlights, and a mosaic gallery. Thin navigation, serif headlines, small sans-serif labels, generous ivory margins and minimal black pills define its hierarchy. The implementation carries these proportions and material contrasts through a complete homepage and five dedicated property pages. Photography and branding are original selections rather than extracted video imagery.

## Working interactions

- Search filters the structured property dataset by city, residence type and maximum price in INR crore; includes an empty state and reset.
- Five statically generated property routes with page-specific metadata, specifications, galleries, floor-plan tabs, and neighbourhood map links.
- Featured-property crossfades, Swiper amenity thumbnails, fullscreen native-dialog gallery with arrows and keyboard navigation, mobile menu and anchor navigation.
- Route-scoped GSAP heading masks, photographic image reveals, staggered cards/specifications and parallax; Lenis scrolling; Motion hero/page/gallery transitions and reduced-motion support. Animation triggers refresh after fonts/images load and register newly filtered cards.
- Enquiry validation is performed in both the browser and the server endpoint. The endpoint returns an explicitly labelled development response. **It neither sends nor stores enquiry data.** Integrate an email provider or CRM and appropriate consent, server-side rate limiting and spam protection before accepting live enquiries.

## Content and licences

All developments, specifications, availability dates and prices are fictional demonstration content. Photographs are illustrative, not photographs of the named developments. Floor plans are illustrative and not for construction. The location link points to the named neighbourhood, not an actual project.

Photographs: Unsplash License, source URLs in `public/images/CREDITS.txt`. Local fonts: Cormorant Garamond and Inter, SIL Open Font License files in `public/fonts`. No runtime dependence on external image/font hosts.

## Main files

- `lib/data.ts`: property and amenity data
- `components/Home.tsx`: editorial homepage and filtering
- `components/PropertyPage.tsx`: property presentation
- `components/UI.tsx`: imagery, amenity slider, accessible lightbox and enquiry form
- `components/Shell.tsx`: navigation, footer and smooth scrolling
- `components/MotionSystem.tsx`: route-scoped mask reveals, staggered sequences and parallax
- `app/api/enquiries/route.ts`: development-mode enquiry validation
- `app/globals.css`: responsive design system

## Deployment

Deploy to a Next.js-compatible Node host. Run a production build and serve via `npm run start`. `PORT` can select the listening port. Connect a real enquiry delivery service and replace demonstration property facts before launching a commercial site. SEO titles and descriptions are included; set your canonical domain and social preview assets when one is available.

## Verification

With the production server running on port 3000, `npm run test:smoke` runs browser-based checks for search/reset, amenity selection, gallery keyboard controls, validation responses, all property pages, floor plans, mobile navigation and horizontal overflow. Screenshots are written to ignored `test-results/`. The cloud machine has `/usr/bin/chromium`; elsewhere install a compatible browser with `npx playwright install chromium`.
