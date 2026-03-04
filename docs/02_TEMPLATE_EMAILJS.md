# Template EmailJS - QCM Concours BF

## Instructions

1. Allez sur [emailjs.com](https://www.emailjs.com/)
2. Connectez-vous à votre compte
3. Allez dans **Email Templates**
4. Ouvrez ou créez le template `template_qcm_resultats`
5. Collez le code HTML ci-dessous
6. Cliquez **Save**

---

## Code HTML du template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau résultat QCM</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                QCM Concours Burkina Faso
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">
                Nouvelle soumission de QCM
              </p>
            </td>
          </tr>

          <!-- Informations du candidat -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                Informations du candidat
              </h2>
              
              <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="color: #6b7280; font-size: 14px; width: 40%;">Nom complet</td>
                  <td style="color: #111827; font-size: 14px; font-weight: 600;">{{candidate_name}}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Téléphone</td>
                  <td style="color: #111827; font-size: 14px; font-weight: 600;">{{candidate_phone}}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Concours</td>
                  <td style="color: #111827; font-size: 14px; font-weight: 600;">{{concours_name}}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Date de soumission</td>
                  <td style="color: #111827; font-size: 14px; font-weight: 600;">{{submission_date}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Score principal -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 30px; text-align: center; border: 1px solid #a7f3d0;">
                <p style="color: #065f46; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  Score obtenu
                </p>
                <p style="color: #059669; margin: 0; font-size: 48px; font-weight: 800;">
                  {{score}} <span style="font-size: 24px; color: #6b7280;">/ {{total_questions}}</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Statistiques détaillées -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="10">
                <tr>
                  <td style="background-color: #ecfdf5; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
                    <p style="color: #059669; margin: 0; font-size: 24px; font-weight: 700;">{{correct_count}}</p>
                    <p style="color: #065f46; margin: 5px 0 0 0; font-size: 12px;">Correctes</p>
                  </td>
                  <td style="background-color: #fef2f2; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
                    <p style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 700;">{{wrong_count}}</p>
                    <p style="color: #991b1b; margin: 5px 0 0 0; font-size: 12px;">Incorrectes</p>
                  </td>
                  <td style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
                    <p style="color: #6b7280; margin: 0; font-size: 24px; font-weight: 700;">{{unanswered_count}}</p>
                    <p style="color: #4b5563; margin: 5px 0 0 0; font-size: 12px;">Sans réponse</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bouton correction -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="{{correction_url}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                Voir la correction détaillée
              </a>
              <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 12px;">
                Ce lien vous permet de voir toutes les réponses du candidat avec les corrections.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Cet email a été envoyé automatiquement par la plateforme QCM Concours Burkina Faso.
              </p>
              <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
                © 2025 QCM Concours BF - Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Variables utilisées

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{candidate_name}}` | Nom complet du candidat | Jean DUPONT |
| `{{candidate_phone}}` | Téléphone du candidat | +226 70 00 00 00 |
| `{{concours_name}}` | Nom du concours | ENAM - Administration Générale |
| `{{submission_date}}` | Date et heure de soumission | 15/01/2025 14:30 |
| `{{score}}` | Score obtenu | 35 |
| `{{total_questions}}` | Nombre total de questions | 50 |
| `{{correct_count}}` | Nombre de bonnes réponses | 38 |
| `{{wrong_count}}` | Nombre de mauvaises réponses | 7 |
| `{{unanswered_count}}` | Nombre de questions sans réponse | 5 |
| `{{correction_url}}` | Lien vers la correction détaillée | https://site.com?correction=UUID |

---

## Configuration EmailJS

### Subject (Objet de l'email)
```
[QCM Concours BF] Nouveau résultat - {{candidate_name}} - {{concours_name}}
```

### To Email (Email destinataire)
```
{{to_email}}
```

### From Name (Nom de l'expéditeur)
```
QCM Concours Burkina Faso
```

---

## Test

Pour tester le template :

1. Passez un QCM complet sur votre site
2. Soumettez vos réponses
3. Vérifiez que vous recevez l'email avec :
   - Les informations du candidat
   - Le score correct
   - Les statistiques (correctes/incorrectes/sans réponse)
   - Le bouton "Voir la correction détaillée" qui fonctionne

---

## Aperçu

L'email ressemblera à ceci :

```
┌─────────────────────────────────────────┐
│    QCM Concours Burkina Faso            │
│    Nouvelle soumission de QCM           │
├─────────────────────────────────────────┤
│                                         │
│  INFORMATIONS DU CANDIDAT               │
│  ─────────────────────────              │
│  Nom complet ........ Jean DUPONT       │
│  Téléphone .......... +226 70 00 00 00  │
│  Concours ........... ENAM              │
│  Date ............... 15/01/2025 14:30  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              SCORE OBTENU               │
│                                         │
│               35 / 50                   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   ✅ 38       ❌ 7        ⬜ 5          │
│  Correctes  Incorrectes  Sans réponse   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    [ VOIR LA CORRECTION DÉTAILLÉE ]     │
│                                         │
└─────────────────────────────────────────┘
```
