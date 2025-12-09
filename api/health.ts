// Minimal health check handler - doesn't import app.ts to avoid initialization chain
// Uses Node.js standard types, compatible with Vercel's auto-detection
export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({ status: 'ok' });
}

