# Configuration du Système d'Envoi Gmail (API)

Ce guide contient tout le code nécessaire pour envoyer gratuitement les notes aux candidats via votre Dashboard React, en utilisant une Edge Function Supabase et l'API Gmail (OAuth2).

## 1. Code Edge Function (`send-result`)

Créez le fichier `supabase/functions/send-result/index.ts` avec le code suivant :

```typescript
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

    if (!nom || !email || note === undefined) {
      throw new Error('Paramètres manquants: nom, email ou note')
    }

    const CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')
    const REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN')

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Configuration Gmail API manquante dans les variables d\\'environnement')
    }

    // 1. Obtenir un nouvel access_token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error(`Erreur token: ${tokenData.error_description || tokenData.error}`)
    }
    const accessToken = tokenData.access_token

    // 2. Préparation de l'email
    const subject = "Résultat examen"
    const message = `Bonjour ${nom},\n\nVotre note est : ${note}/20\n\nCordialement.`
    
    // Le format d'email doit être en Base64url (RFC 4648)
    const rawEmail = `To: ${email}\nSubject: =?utf-8?B?${btoa(encodeURIComponent(subject)).replace(/=+$/, '')}?=\nContent-Type: text/plain; charset="UTF-8"\n\n${message}`
    
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // 3. Envoi via l'API Gmail
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64EncodedEmail })
    })

    const sendData = await sendResponse.json()
    
    if (!sendResponse.ok) {
      throw new Error(`Erreur envoi Gmail: ${sendData.error?.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

## 2. Configuration API Gmail (Google Cloud Console)
Pour récupérer `CLIENT_ID`, `CLIENT_SECRET` et `REFRESH_TOKEN` :
1. Allez sur **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Créez un nouveau projet et activez **Gmail API**.
3. Dans **API & Services > Écran de consentement OAuth**, configurez en mode "Externe" (Test), ajoutez l'autorisation `https://mail.google.com/` (ou `gmail.send`). Ajoutez votre adresse e-mail dans les "Test users".
4. Dans **Identifiants**, créez des identifiants **ID client OAuth** (Application Web). Copiez le `CLIENT_ID` et `CLIENT_SECRET`.
5. Utilisez **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)** pour générer votre `REFRESH_TOKEN` :
   - Cliquez sur l'engrenage (en haut à droite), cochez "Use your own OAuth credentials", entrez ID/Secret.
   - Sélectionnez l'API Gmail v1 `https://mail.google.com/` et cliquez "Authorize APIs".
   - Cliquez "Exchange authorization code for tokens" -> copiez le **Refresh token**.
6. Dans Supabase (Settings > Edge Functions > Secrets), ajoutez :
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`

*(N'oubliez pas de déployer la fonction en local avec `npx supabase functions deploy send-result`)*

## 3. Code React (Boutons pour AdminDashboard)

Voici le code à insérer ou adapter dans votre `AdminDashboard.tsx` pour itérer sur `quiz_attempts` et piloter les envois avec l'Edge Function.

```tsx
import { useState } from 'react';
import { supabase } from '../config/supabase';

export function MailManagementSection({ quizAttempts, setQuizAttempts }) {
  const [isLoading, setIsLoading] = useState(false);

  // Fonction d'envoi individuel
  const handleSendEmail = async (attempt) => {
    setIsLoading(true);
    try {
      // 1. Appel de l'Edge Function
      const { data, error } = await supabase.functions.invoke('send-result', {
        body: { 
          nom: attempt.candidate_name, 
          email: attempt.candidate_email, 
          note: attempt.score 
        }
      });

      if (error || !data?.success) throw new Error("Erreur d'envoi");

      // 2. Mise à jour Supabase du statut
      const { error: updateError } = await supabase
        .from('quiz_attempts') // Remplacez par le vrai nom de votre table
        .update({ status: 'sent' })
        .eq('id', attempt.id);

      if (updateError) throw updateError;

      // 3. Mise à jour de l'état React
      setQuizAttempts(prev => prev.map(a => a.id === attempt.id ? { ...a, status: 'sent' } : a));
      alert("Email envoyé avec succès !");

    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction "Envoyer à tous"
  const handleSendAll = async () => {
    const pendings = quizAttempts.filter(a => a.status === 'pending');
    if (pendings.length === 0) return alert("Aucun envoi en attente");
    if (!window.confirm(`Voulez-vous envoyer ${pendings.length} email(s) ?`)) return;

    for (const attempt of pendings) {
      await handleSendEmail(attempt);
    }
    alert("Tous les emails ont été traités !");
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Envoi des résultats via Gmail API</h2>
        <button 
          onClick={handleSendAll}
          disabled={isLoading || quizAttempts.filter(a => a.status === 'pending').length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Envoyer à tous
        </button>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th>Candidat</th>
            <th>Email</th>
            <th>Note</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {quizAttempts.map(attempt => (
            <tr key={attempt.id} className="border-b">
              <td className="py-2">{attempt.candidate_name}</td>
              <td className="py-2">{attempt.candidate_email}</td>
              <td className="py-2">{attempt.score}/20</td>
              <td className="py-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  attempt.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {attempt.status === 'sent' ? 'Envoyé' : 'En attente'}
                </span>
              </td>
              <td className="py-2">
                <button
                  onClick={() => handleSendEmail(attempt)}
                  disabled={isLoading || attempt.status === 'sent'}
                  className="bg-emerald-500 hover:bg-emerald-600 font-medium text-white px-3 py-1 rounded disabled:opacity-50 disabled:bg-gray-400"
                >
                  Envoyer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Étapes de test recommandées
1. Configurez bien vos variables d'environnement (secrets Supabase).
2. Lancez `supabase start` avec Docker (si développement local).
3. Adaptez le composant React au nom exact de votre tableau global dans `AdminDashboard.tsx`.
