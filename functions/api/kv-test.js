export async function onRequest({ env }) {
  // Attempt to resolve the KV binding (prefer PREDICTIONS_KV, fall back to first KV-like binding)
  const resolveKv = (envObj) => {
    if (envObj.PREDICTIONS_KV) return { kv: envObj.PREDICTIONS_KV, name: 'PREDICTIONS_KV' };
    for (const [key, value] of Object.entries(envObj)) {
      if (value && typeof value.get === 'function' && typeof value.put === 'function') {
        return { kv: value, name: key };
      }
    }
    return { kv: null, name: null };
  };

  const { kv, name } = resolveKv(env);
  if (!kv) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'KV not bound',
      hint: 'Bind PREDICTIONS_KV in Pages → Settings → Functions',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const key = `kv-test:${Date.now()}`;
  try {
    await kv.put(key, 'VALUE');
    const value = await kv.get(key);
    const list = await kv.list({ prefix: 'kv-test:' });
    await kv.delete(key);

    return new Response(JSON.stringify({
      ok: true,
      kvVar: name,
      wroteKey: key,
      readValue: value,
      listedCount: list.keys?.length || 0
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e.message || String(e)
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
