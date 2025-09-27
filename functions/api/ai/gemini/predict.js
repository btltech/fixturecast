// Cloudflare Pages Function: Gemini prediction proxy
// Accepts POST with match + optional context, returns structured prediction JSON
// Uses server-side GEMINI_API_KEY secret; never expose key to client.

export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Id'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  if (!env.GEMINI_API_KEY) {
    // Helpful diagnostic message so we can see at a glance why proxy failed
    console.warn('[Gemini Proxy] Missing GEMINI_API_KEY binding in Pages env');
    return new Response(
      JSON.stringify({
        error: 'Gemini not configured',
        hint: 'Add secret via: wrangler pages secret put GEMINI_API_KEY --project-name fixturecast',
        docs: 'Ensure GEMINI_API_KEY is set as a Pages project secret (NOT a VITE_ client var).'
      }),
      { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body'}), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
  }

  const { match, context: matchContext, accuracyStats } = body || {};
  if (!match || !match.homeTeam || !match.awayTeam) {
    return new Response(JSON.stringify({ error: 'match object with homeTeam & awayTeam required'}), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
  }

  const start = Date.now();

  try {
    const prompt = buildPrompt(match, matchContext);
    const schema = buildResponseSchema();

    const upstreamResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // We rely on textual JSON output then parse; structured mode sometimes unstable in Workers
      })
    });

    if (!upstreamResp.ok) {
      const text = await upstreamResp.text();
      return new Response(JSON.stringify({ error: 'Gemini request failed', status: upstreamResp.status, details: text.slice(0,500) }), { status: upstreamResp.status, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    const data = await upstreamResp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to parse model JSON', raw: raw.slice(0,500) }), { status: 502, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    // Guarantee keyFactors is always present (never undefined)
    if (!Array.isArray(parsed.keyFactors)) {
      parsed.keyFactors = [
        {
          category: 'Uncertainty',
          points: ['Key Factors Analysis was limited or missing in model output. This may be due to token budget, missing context, or degraded model response.']
        }
      ];
    }

    normalizeProbabilities(parsed);
    const duration = Date.now() - start;

    return new Response(JSON.stringify({ prediction: parsed, meta: { model: 'gemini-2.5-flash', durationMs: duration, server: 'pages-fn' }}), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
}

function buildPrompt(match, ctx) {
  const base = `You are an advanced football prediction engine using state-of-the-art modeling techniques. Generate comprehensive predictions with detailed analysis.

MATCH DETAILS
- League: ${match.league || 'Unknown'}
- Home Team: ${match.homeTeam}
- Away Team: ${match.awayTeam}
- Date: ${match.date}

${ctx ? `CONTEXT DATA:\n${Object.entries(ctx).map(([k,v])=>`- ${k}: ${typeof v==='string'?v:JSON.stringify(v)}`).join('\n')}\n` : ''}

ADVANCED MODELING APPROACH
Apply these sophisticated techniques in your analysis:
- ELO rating system with dynamic adjustments for recent form
- Monte Carlo simulation for scoreline probabilities (consider 1000+ scenarios)
- Temporal analysis with exponential decay weighting (recent matches weighted higher)
- Bayesian inference for uncertainty quantification
- Market efficiency principles (if this were a betting market, what would be fair odds?)
- Weather/conditions impact on gameplay style
- Referee tendencies and their impact on match flow
- Psychological factors (pressure situations, rivalry intensity)
- Squad rotation and fatigue modeling
- Tactical matchup analysis (style compatibility)

ENHANCED FEATURE ANALYSIS
Consider these advanced metrics:
- Attack/Defense efficiency rates adjusted for opposition quality  
- xG trends over last 10 matches with opponent adjustment
- Home advantage quantified by league and specific venue
- Form momentum (not just W/L/D but performance quality trends)
- Set-piece effectiveness (corners, free kicks conversion rates)
- Discipline patterns (cards per game, impact on team shape)
- Injury impact weighted by player importance (minutes played, key player index)
- Fixture congestion effects on performance

OUTPUT FORMAT REQUIREMENTS
Return a JSON object with ALL required fields:
- homeWinProbability: integer 0-100 (based on sophisticated modeling, not gut feeling)
- drawProbability: integer 0-100  
- awayWinProbability: integer 0-100
- predictedScoreline: string (most likely outcome from Monte Carlo analysis)
- confidence: string ("High", "Medium", or "Low" based on data quality and model agreement)
- keyFactors: MANDATORY detailed array with categories like "Form Analysis", "Tactical Matchup", "Key Players", "Historical Trends", "Conditions", etc.
- goalLine: object with "line" (typically 2.5), "overProbability", "underProbability"
- btts: object with "yesProbability", "noProbability" based on attack/defense rates

Apply rigorous statistical thinking. Consider base rates, regression to the mean, sample sizes, and uncertainty. Provide probabilities that reflect genuine analytical confidence, not artificial precision.

Return ONLY the JSON object, no other text.`;
  
  return base;
}

function buildResponseSchema() { return {}; }

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return text.slice(start, end+1);
}

function normalizeProbabilities(p) {
  const total = (p.homeWinProbability||0)+(p.drawProbability||0)+(p.awayWinProbability||0);
  if (total>0) {
    p.homeWinProbability = Math.round(p.homeWinProbability/total*100);
    p.awayWinProbability = Math.round(p.awayWinProbability/total*100);
    p.drawProbability = 100 - p.homeWinProbability - p.awayWinProbability;
  }
  if (p.btts) {
    const t = (p.btts.yesProbability||0)+(p.btts.noProbability||0);
    if (t>0) {
      p.btts.yesProbability = Math.round(p.btts.yesProbability/t*100);
      p.btts.noProbability = 100 - p.btts.yesProbability;
    }
  }
  if (p.goalLine) {
    const t = (p.goalLine.overProbability||0)+(p.goalLine.underProbability||0);
    if (t>0) {
      p.goalLine.overProbability = Math.round(p.goalLine.overProbability/t*100);
      p.goalLine.underProbability = 100 - p.goalLine.overProbability;
    }
  }
}
