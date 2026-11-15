// On youngturings.com, serve the Young Turings home page at "/" instead of the old Mindhop landing page.
export const config = { matcher: '/' };
export default function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  if (host === 'youngturings.com') {
    return new Response(null, { headers: { 'x-middleware-rewrite': new URL('/yt-home', request.url).toString() } });
  }
}
