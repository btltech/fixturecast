// DEPRECATED: /api/update-results (handled by Worker)
export async function POST() {
  return new Response(JSON.stringify({
    deprecated: true,
    status: 'gone',
    message: 'update-results deprecated. Use Worker /accuracy/today',
    replacement: '/accuracy/today'
  }), { status: 410, headers: { 'Content-Type': 'application/json' }});
}