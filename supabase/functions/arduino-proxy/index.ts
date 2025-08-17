import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface AuthRequest {
  client_id: string;
  client_secret: string;
}

interface SyncRequest {
  access_token: string;
  thing_id: string;
  property_name: string;
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/arduino-proxy/auth') {
      return await handleAuth(req)
    } else if (path === '/arduino-proxy/sync') {
      return await handleSync(req)
    } else if (path === '/arduino-proxy/thing-status') {
      return await handleThingStatus(req)
    } else {
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }
  } catch (error) {
    console.error('Arduino proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handleAuth(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  const { client_id, client_secret }: AuthRequest = await req.json()

  if (!client_id || !client_secret) {
    return new Response(
      JSON.stringify({ error: 'Missing client_id or client_secret' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const authResponse = await fetch('https://api2.arduino.cc/iot/v1/clients/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
        audience: 'https://api2.arduino.cc/iot',
      }),
    })

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authData 
        }),
        {
          status: authResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify(authData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Network error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleSync(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  const { access_token, thing_id, property_name, data }: SyncRequest = await req.json()

  if (!access_token || !thing_id || !property_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const syncResponse = await fetch(
      `https://api2.arduino.cc/iot/v2/things/${thing_id}/properties/${property_name}/publish`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ value: data }),
      }
    )

    const syncData = await syncResponse.text()

    return new Response(
      JSON.stringify({ 
        success: syncResponse.ok,
        status: syncResponse.status,
        data: syncData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleThingStatus(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  const { access_token, thing_id } = await req.json()

  if (!access_token || !thing_id) {
    return new Response(
      JSON.stringify({ error: 'Missing access_token or thing_id' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const statusResponse = await fetch(
      `https://api2.arduino.cc/iot/v2/things/${thing_id}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      }
    )

    const statusData = await statusResponse.json()

    return new Response(JSON.stringify(statusData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get thing status',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}