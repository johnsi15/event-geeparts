import type { APIRoute } from 'astro'
// import SibApiV3Sdk from '@getbrevo/brevo'

const res = (
  body: {
    message: string
    data?: Record<string, unknown>
  },
  { status, statusText, headers }: { status?: number; statusText?: string; headers?: Record<string, string> }
) => new Response(JSON.stringify(body), { status, statusText, headers })

export const POST: APIRoute = async ({ request }) => {
  const url = 'https://api.brevo.com/v3/contacts'
  const apiKey = import.meta.env.API_KEY // Reemplaza 'TU_API_KEY' con tu clave de API

  if (request.headers.get('Content-Type') === 'application/json') {
    const formData = await request.json()
    const { email, first_name, last_name, phone, motorcycle, type_person, city } = formData

    if (!email) {
      return res({ message: 'Email is required' }, { status: 400 })
    }

    const dataRegister = {
      email,
      attributes: {
        SMS: `+57${phone}`,
        NOMBRE: first_name,
        APELLIDOS: last_name,
        TYPE_PERSON: type_person,
        ...(motorcycle && { MOTORCYCLE: motorcycle }),
        PHONE: `+57${phone}`,
        ...(city && { CITY: city }),
        WHATSAPP: `+57${phone}`,
      },
      listIds: [4],
      emailBlacklisted: false,
      smsBlacklisted: false,
      updateEnabled: false,
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(dataRegister),
    }

    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        // throw new Error('Error try request: ' + response.statusText);
        res({ message: 'Bad request' }, { status: 400, statusText: response.statusText })
      }
      const data = await response.json()
      console.log('Respuesta:', data)
      return res({ message: 'Contact created', data }, { status: 201, headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error('Error:', error)
      res({ message: 'Error create a contact brevo email' }, { status: 500 })
    }
  }

  return res({ message: 'Error request' }, { status: 400, headers: { 'Content-Type': 'application/json' } })
}
