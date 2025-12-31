# The Art Institute of the Internet

A museum-inspired web experience: upload an artwork, predict its style, then explore a curated “exhibit” carousel of related works.

## Highlights

- **Fast style prediction uploads**: the frontend compresses images to **≤300KB** before sending them to the prediction API, while keeping the **full-quality image** for the on-page preview/gallery experience.
- **Museum-style exhibit page**: style title + description + sources, followed by a wheel carousel.
- **Mobile-friendly navigation**: swipe/tap to browse the carousel, plus on-screen previous/next controls for touch devices.
- **Credible descriptions**: style descriptions and citations are loaded from `wikiart_style_descriptions.json` and rendered in the UI with links.

## Tech Stack

- **React 19** + **Vite**
- **Vanilla CSS** (custom design system + museum theme)
- Browser APIs: **Canvas** (client-side image compression), `fetch` + `FormData`

## How It Works (High Level)

1. You upload an image.
2. The app creates a full-quality preview for the UI.
3. For prediction, the app generates a JPEG under 300KB (scale + quality steps) and posts it to the API.
4. The API returns a predicted style, and the frontend fetches a gallery of artworks for that style.
5. The exhibit header shows the style description + sources from `wikiart_style_descriptions.json`.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Build and preview production output:

```bash
npm run build
npm run preview
```

## Configuration

This project expects a backend API that exposes:

- `POST /predict-style?top_k=...` (multipart upload field name: `file`)
- `GET /gallery?style=...&limit=...`

Set the API base URL via:

- `VITE_API_URL` (see `.env.example`)

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Set `VITE_API_URL` in Vercel Environment Variables (Production + Preview).
3. Use:
   - Build command: `npm run build`
   - Output directory: `dist`

Note: your API must allow CORS from your Vercel domain(s), or requests will fail in the browser.

## Data Sources

Style descriptions and citations are stored in `wikiart_style_descriptions.json` and displayed in the exhibit view. Sources include institutions like Tate, MoMA, Encyclopaedia Britannica, and others (see the JSON for the full list).
