# Shreyash Tripathy — Portfolio

Personal portfolio of Shreyash Tripathy, an AI engineer and applied ML developer. It is an
interactive 3D site built with React, TypeScript, Vite, Three.js, React Three Fiber and GSAP.

![Portfolio preview](public/og-image.png)

## What was customised

- **Content:** hero, about, skills, experience timeline, projects, contact and metadata
  (`src/components/`, `src/data/links.ts`, `index.html`).
- **Projects:** the work carousel leads with CHITRADARSHI (PruTech internship) and CrowdShield,
  and presents each project as problem, contribution, stack and documented outcome, with fact
  panels in place of screenshots. Smaller ML projects are listed compactly below it. Projects
  with public source code link to their GitHub repositories.
- **Honors, experience and skills:** an Honors & achievements list, leadership roles in the
  timeline and grouped skills, all taken from the owner's resume and LinkedIn profile.
- **Typography:** headings use [Archivo](https://fonts.google.com/specimen/Archivo) (Omnibus-Type)
  at a condensed width; body text uses [Geist](https://fonts.google.com/specimen/Geist)
  (Vercel). Both are SIL Open Font License 1.1 and load from Google Fonts.
- **Tech-stack spheres:** new textures generated from [Simple Icons](https://simpleicons.org/)
  marks (CC0).
- **3D character:** the original model (`public/models/character.enc`) is unchanged. Clothing
  colours and skin tone are adjusted at runtime. A new hair top and a painted beard are layered
  on as two small assets bound to the existing head bone. See
  [tools/character/README.md](tools/character/README.md).
- **Reliability and accessibility:** the site loads even if the 3D model fails, listeners and
  animation loops are cleaned up, `prefers-reduced-motion` is respected, focus is visible for
  keyboard users, and the heavy physics bundle is loaded after the intro.

## Development

Requires Node.js 18+.

```bash
npm ci
npm run dev      # http://localhost:5173
npm run lint
npm run build    # type-checks, then builds to dist/
npm run preview  # serves the production build
```

### Testing on a phone

The phone and the computer must be on the same Wi-Fi network. Vite prints the address to open
under `Network:` when it starts (`https://<computer's LAN IP>:5173/`); no IP is configured in
the project.

The 3D character is decrypted with the browser's Web Crypto API, which browsers only allow on
HTTPS or `localhost`. Over plain `http://<LAN IP>` (e.g. `npm run dev`) the page falls back to a
slightly slower built-in JS decryption, so the character still loads, but Chrome blocks file
downloads (such as **My Resume**) from plain-HTTP sites other than `localhost`, unless that
address is added under `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on the phone.
The HTTPS scripts test the
phone in a secure context, as on the deployed site. They need a local self-signed certificate,
created once (from Git Bash on Windows; `MSYS_NO_PATHCONV=1` stops Git Bash rewriting `/CN=...`):

```bash
mkdir -p .cert
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost" \
  -keyout .cert/dev-key.pem -out .cert/dev-cert.pem
```

`.cert/` is git-ignored; never commit it.

```bash
npm run dev:https                   # dev server on the LAN: https://<LAN IP>:5173/
npm run build && npm run preview:https   # production build on the LAN: https://<LAN IP>:4173/
```

The phone shows a certificate warning the first time, because the certificate is self-signed.
Continue past it (Chrome: **Advanced → Proceed**; Safari: **Show Details → visit this
website**). `npm run dev` also listens on the LAN, over plain HTTP. If the phone cannot connect
at all, allow Node.js through the Windows firewall for the network profile in use.

## Deployment (Vercel)

The project is a static Vite single-page site. No environment variables are required.

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

## Resume

The hero's **My Resume** button downloads `public/Shreyash_Tripathy_CV.pdf`, set by
`RESUME_URL` in `src/data/links.ts` (`null` hides the button). Only publish a version that does
not include a phone number.

## License

MIT, see [LICENSE](LICENSE). The original copyright notice is retained.

## Credits

Built on the open-source 3D portfolio template by Rajesh Chityal (MIT, see [LICENSE](LICENSE)).
