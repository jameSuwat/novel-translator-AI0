// Vercel serverless function: POST /api/gemini
// Keeps the real Gemini API key on the server. The browser never sees it —
// it only ever calls this same-origin endpoint, which forwards the request
// body straight through to Google's Generative Language API.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: { message: "Server misconfigured: GEMINI_API_KEY environment variable is not set" },
    });
    return;
  }

  const model = "gemini-3.5-flash";

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(req.body),
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err?.message || "Proxy request to Gemini failed" } });
  }
}
