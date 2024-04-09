import type { APIRoute } from 'astro'

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ greeting: 'Hello world' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
