import type { APIRoute } from 'astro'

const res = (
  body: {
    message: string
    data?: Record<string, unknown>
  },
  { status, statusText, headers }: { status?: number; statusText?: string; headers?: Record<string, string> }
) => new Response(JSON.stringify(body), { status, statusText, headers })

interface FormData {
  email: string
  first_name: string
  last_name: string
  phone: string
  motorcycle: string
  type_person: string
  city: string
  listId: string
}

export const POST: APIRoute = async ({ request }) => {
  const url = 'https://api.brevo.com/v3/contacts'
  const apiKey = import.meta.env.API_KEY

  if (request.headers.get('Content-Type') === 'application/json') {
    const formData: FormData = await request.json()
    const { email, first_name, last_name, phone, motorcycle, type_person, city, listId } = formData

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
      listIds: [Number(listId)],
      emailBlacklisted: false,
      smsBlacklisted: false,
      updateEnabled: true,
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

      if (response.status === 204) {
        return res(
          { message: 'Contact update' },
          { status: 204, statusText: response.statusText, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      // console.log('Respuesta:', data)
      // if (data?.code === 'duplicate_parameter') return res({ message: data.code.message }, { status: 400 })

      return res({ message: 'Contact created', data }, { status: 201, headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error('Error:', error)
      res({ message: 'Error create a contact brevo email' }, { status: 500 })
    }

    return res({ message: 'ok' }, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return res({ message: 'Error request' }, { status: 400, headers: { 'Content-Type': 'application/json' } })
}
