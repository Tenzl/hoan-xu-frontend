# Typewriter integration

The app uses Next.js 16, React 19, TypeScript, Lucide, and CSS tokens. Shared UI components already live in `src/components/ui`, resolved as `@/components/ui`; styles live in `src/styles` and are imported by `src/app/layout.tsx`. Keeping this folder makes reusable primitives discoverable and preserves shadcn-compatible imports. There is no need for a second root-level `components/ui` folder.

`src/components/ui/typewriter-text.tsx` uses React hooks only, with no additional dependencies or providers. It supports the supplied `text`, `speed`, `cursor`, `loop`, `deleteSpeed`, `delay`, and `className` props. Optional `textClassNames` styles each phrase and its static `prefix` and `suffix`. `prefix` can be a string or a string array matching the phrases. `onComplete` fires once after a non-looping sequence or for reduced motion. `repeatDelay` holds the final phrase before deleting it and repeating the sequence; `startWithLastText` initially shows that phrase in full. Erasing the last character advances the phrase and its color in the same render. Arrays advance even without looping. Input changes restart the sequence, timers are cleaned up, and reduced motion displays the final phrase immediately. Cursor and demo styles live in `src/styles/link-result.css`.

`src/components/ui/typewriter-demo.tsx` exports the supplied `DemoVariant1` example. It is not mounted in the customer flow. The live integration is the result section in `SavedLink`: it initially shows the green `<current-host>/shopee/` segment with the protocol and affiliate code, holds for 3 seconds, then deletes only that segment. Erasing its last character turns the entire displayed URL red, including the protocol and unchanged code, and types `s.shopee.vn/`. After a 1500ms hold it erases that segment, turns the entire URL green at the final deletion, and types the share segment again. The protocol is always visible, using `https://` for Shopee and the current site's protocol for the share URL. Copying includes the full URL. The integration runs 20% faster than the defaults: 100 / 1.2 (about 83ms) per typed character and 50 / 1.2 (about 42ms) per deleted character. Hold durations remain unchanged.

The text is not focusable or selectable. A transparent overlay intercepts pointer interaction over the display while leaving the adjacent copy button available. Clicking the display or copying does not interrupt animation. The full URL remains accessible to screen readers. If clipboard access fails in the result, an error notification leaves the display locked and the copy button available to retry; saved-list manual-selection fallback remains available. Copying uses the branded website URL. QR images encode the original Shopee affiliate URL directly, including any tracking parameters, and the shopping button opens that same affiliate URL. The layout stacks at 600px and uses existing light/dark tokens. This utility needs no stock photos.

## Optional Tailwind/shadcn CLI setup

TypeScript and the shared component folder are already set up. Tailwind is not installed: existing shadcn-style primitives intentionally map to the app's CSS. The component is integrated with that stack, so no styling migration is required.

If adopting Tailwind and the shadcn CLI later, run these from `frontend`:

```powershell
npm install -D tailwindcss @tailwindcss/postcss postcss
```

Add `postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Add a stylesheet containing `@import "tailwindcss";` and import it in `src/app/layout.tsx`. Tailwind Preflight affects existing global styles; review the current app before enabling it. Then run:

```powershell
npx shadcn@latest init
```

Use `@/components/ui` for UI components and `@/lib/utils` for utilities; configure the stylesheet path to match the file you added. Preserve the existing components and tokens when the CLI asks to overwrite files.

Setup references: [Tailwind's Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs) and [shadcn's Next.js installation](https://ui.shadcn.com/docs/installation/next).
