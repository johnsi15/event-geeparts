import type { APIRoute } from 'astro'

const res = (
  body: {
    message: string
    data?: Record<string, unknown>
  },
  { status, statusText, headers }: { status?: number; statusText?: string; headers?: Record<string, string> }
) => {
  if (status === 204 || status === 304) {
    // 204 No Content y 304 Not Modified no pueden tener body
    return new Response(null, { status, statusText, headers })
  }

  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  })
}

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

interface DataUpdateContact {
  attributes: {
    SMS: string | undefined
    NOMBRE: string
    APELLIDOS: string
    TYPE_PERSON: string
  }
}

const BASE_URL = 'https://api.brevo.com/v3'
const API_KEY = import.meta.env.API_KEY

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('Content-Type') === 'application/json') {
    const formData: FormData = await request.json()
    const { email, first_name, last_name, phone, motorcycle, type_person, city, listId } = formData

    if (!email) {
      return res({ message: 'Email is required' }, { status: 400 })
    }

    const phoneValidation = validateAndFormatPhoneNumber(phone)

    if (!phoneValidation.isValid) {
      return res({ message: 'Error number phone' }, { status: 400 })
    }

    const contact = await getContact(email)
    const { cleanedPhone } = phoneValidation

    if (contact) {
      // console.log({ contact })
      const data = {
        attributes: {
          SMS: cleanedPhone,
          NOMBRE: first_name,
          APELLIDOS: last_name,
          TYPE_PERSON: type_person,
          WHATSAPP: cleanedPhone,
          ...(motorcycle && { MOTORCYCLE: motorcycle }),
          ...(city && { CITY: city }),
        },
      }
      const { message, status, error, metadata } = await updateContact(email, data)

      if (status === 400) {
        return res({ message, data: { error, metadata } }, { status: 400 })
      }

      return res({ message: 'Contact update' }, { status: 204 })
    }

    const dataRegister = {
      email,
      attributes: {
        SMS: cleanedPhone,
        NOMBRE: first_name,
        APELLIDOS: last_name,
        TYPE_PERSON: type_person,
        ...(motorcycle && { MOTORCYCLE: motorcycle }),
        PHONE: cleanedPhone,
        ...(city && { CITY: city }),
        WHATSAPP: cleanedPhone,
      },
      listIds: listId ? [Number(listId)] : [4],
      emailBlacklisted: false,
      smsBlacklisted: false,
      updateEnabled: true,
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(dataRegister),
    }

    try {
      const response = await fetch(`${BASE_URL}/contacts`, options)

      if (!response.ok) {
        const { code, message, metadata } = await response.json()

        if (response.status === 401) {
          return res({ message: 'Unauthorized' }, { status: 401, statusText: response.statusText })
        }

        return res({ message, data: { error: code, metadata } }, { status: 400, statusText: response.statusText })
      }

      if (response.status === 204) {
        return new Response(null, {
          status: 204,
          statusText: response.statusText,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()

      return res({ message: 'Contact created', data }, { status: 201, headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error('Error:', error)
      res({ message: 'Error create a contact brevo email' }, { status: 500 })
    }

    return res({ message: 'ok' }, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return res({ message: 'Error request' }, { status: 400, headers: { 'Content-Type': 'application/json' } })
}

async function getContact(identifier: string) {
  const response = await fetch(`${BASE_URL}/contacts/${encodeURIComponent(identifier)}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'api-key': API_KEY,
    },
  })

  if (response.status === 404) {
    return null // No existe
  }

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Error al consultar contacto: ${errorData.message}`)
  }

  const data = await response.json()
  return data
}

async function updateContact(email: string, dataToUpdate: DataUpdateContact) {
  const options = {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'api-key': API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dataToUpdate),
  }

  const response = await fetch(`${BASE_URL}/contacts/${encodeURIComponent(email)}`, options)

  if (!response.ok) {
    const errorData = await response.json()
    // throw new Error(`Error al actualizar contacto: ${errorData.message}`)
    return { message: errorData.message, error: errorData.code, metadata: errorData.metadata, status: response.status }
  }

  if (response.status === 204) {
    return { message: 'Contacto actualizado exitosamente (sin contenido).' }
  }

  return await response.json()
}

function validateAndFormatPhoneNumber(phoneInput: string) {
  const cleaned = phoneInput.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+')) {
    // Verificar que el número tenga un formato válido (código de país + número)
    const phoneRegex = /^\+\d{1,3}\d{8,15}$/
    // 919788824675
    // 575553428400

    if (phoneRegex.test(cleaned)) {
      return {
        isValid: true,
        originalPhone: phoneInput,
        cleanedPhone: cleaned.replaceAll('+', ''),
      }
    } else {
      return {
        isValid: false,
        originalPhone: phoneInput,
        error: 'El número no tiene un formato internacional válido',
      }
    }
  } else {
    // Asumimos que los primeros 1-3 dígitos pueden ser el código de país
    // Ejemplo: 575553428400 -> +57 5553428400
    if (cleaned.length >= 10) {
      let countryCode
      let nationalNumber

      if (cleaned.length === 10) {
        // Posiblemente tiene un código de 2 dígitos
        countryCode = '57' // cleaned.substring(0, 2);
        nationalNumber = cleaned // cleaned.substring(2);
      } else if (cleaned.length >= 12) {
        countryCode = cleaned.substring(0, 3)
        nationalNumber = cleaned.substring(3)
      } else {
        countryCode = cleaned.substring(0, 2)
        nationalNumber = cleaned.substring(2)
      }

      const formattedPhone = `${countryCode}${nationalNumber}`

      return {
        isValid: true,
        originalPhone: phoneInput,
        cleanedPhone: formattedPhone,
        note: 'Se ha agregado el símbolo "+" y se ha detectado un posible código de país',
      }
    } else {
      return {
        isValid: false,
        originalPhone: phoneInput,
        error: 'El número no tiene suficientes dígitos para ser un número internacional válido',
      }
    }
  }
}
