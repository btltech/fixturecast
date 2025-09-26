/**
 * DEPRECATED: /api/update-results
 * Accuracy & results handled by cron Worker. This stub returns 410.
 */
export async function onRequestPost() {
  return new Response(JSON.stringify({
    deprecated: true,
    status: 'gone',
    message: 'update-results deprecated. Use Worker /accuracy/today',
    replacement: '/accuracy/today'
  }), { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }});
}