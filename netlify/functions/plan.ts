// netlify/functions/plan.ts
// Dependency-free (uses native fetch). HTML-only output with safe fallback.
export const config = { path: "/.netlify/functions/plan" };

type Event = { httpMethod: string; body: string | null };

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export default async (event: Event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(), body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return { statusCode: 500, headers: cors(), body: "Missing OPENAI_API_KEY" };

    const { planType, form, filesText = [], customInstructions = "" } = JSON.parse(event.body || "{}") as {
      planType: "daily" | "weekly" | "unit";
      form: any;
      filesText?: Array<{ name: string; text: string }>;
      customInstructions?: string;
    };

    if (!planType || !form) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Missing planType or form" }) };
    }

    const fileSnippets =
      (filesText || [])
        .filter((f:any) => f?.text?.trim())
        .map((f:any) => `\n[${f.name}]\n${(f.text || "").slice(0, 5000)}`)
        .join("\n\n") || "(no file text)";

    const system = `You are an instructional designer for K–12. Output MUST be a SINGLE HTML SNIPPET ONLY (no <html> or <body>), starting with <h1>.
Use only <h1-3>, <p>, <ul>, <ol>, and <table>. Use tables for structure. No Markdown.
- Keep language concise; don't invent standard codes.
- Include “Why this matters / transfer” where appropriate.
- Weekly plans: one horizontal chart with columns EXACTLY: Day, Date, Topic, Key Activities, Assessment/Exit, Materials, Notes, Attachments.
- Unit plans: include Essential Questions, Overview, Outcomes (Know/Do), Assignments/Assessments, Vocab (Tier 2 & Tier 3), ELL Supports, Learning Progression, Common Misconceptions, and a Pacing Guide (Week squares).
${customInstructions ? `- Extra user directives:\n${customInstructions}` : ""}`;

    const user = `Plan type: ${String(planType).toUpperCase()}
Form (JSON):\n${JSON.stringify(form, null, 2)}

filesText (may be empty):\n${fileSnippets}

Return ONLY the HTML snippet.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2500,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: resp.status, headers: cors(), body: text || "OpenAI API error" };
    }

    const data = await resp.json();
    let html: string = data?.choices?.[0]?.message?.content || "";

    // Fallback: if model returned plain text (no "<"), wrap it so the UI renders nicely
    if (!html.includes("<")) {
      const safe = escapeHtml(html).replace(/\n/g, "<br/>");
      html = `<h1>Generated Plan</h1><div>${safe}</div>`;
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json", ...cors() }, body: JSON.stringify({ html }) };
  } catch (err: any) {
    return { statusCode: 500, headers: cors(), body: String(err?.message || err) };
  }
};

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
