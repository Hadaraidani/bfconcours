import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nom, email, note } = await req.json()

    // 1. Validation basique
    if (!nom || !email || note === undefined) {
      throw new Error('Paramètres manquants: nom, email ou note')
    }

    // 2. Récupération des secrets d'environnement
    const CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')
    const REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN')

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Configuration Gmail API manquante dans les secrets')
    }

    // 3. Obtenir un nouvel access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error(`Erreur récupération access token: ${tokenData.error_description || tokenData.error}`)
    }
    const accessToken = tokenData.access_token

    // 4. Préparation de l'email
    const subject = "Résultat examen"
    const message = `Bonjour ${nom},\n\nVotre note est : ${note}/20\n\nCordialement.`
    
    // Le format de l'e-mail doit être en base64url
    const rawEmail = `To: ${email}
Subject: =?utf-8?B?${btoa(encodeURIComponent(subject)).replace(/=+$/, '')}?=
Content-Type: text/plain; charset="UTF-8"

${message}`
    
    // Conversion en base64url compatible RFC 4648
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 5. Envoi de l'email via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64EncodedEmail
      })
    })

    const sendData = await sendResponse.json()
    
    if (!sendResponse.ok) {
      throw new Error(`Erreur envoi Gmail: ${sendData.error?.message || 'Erreur inconnue'}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé avec succès', id: sendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
