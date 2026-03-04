# Guide de Configuration EmailJS - QCM Concours Burkina Faso

> **MISE À JOUR** : Ce guide utilise la nouvelle architecture Supabase.
> Les liens de correction sont maintenant courts et stables (UUID uniquement).

## Nouveau Format de l'URL de correction

L'URL de correction a maintenant le format suivant :
```
https://votre-site.com?correction=550e8400-e29b-41d4-a716-446655440000
```

**Avantages :**
- Liens courts (~80 caractères au lieu de 2000-5000)
- 100% compatible avec tous les clients email
- Fonctionne sur tous les appareils (mobile, tablette, PC)
- Pas de problèmes de caractères spéciaux

---

## Configuration actuelle

Les identifiants sont déjà configurés dans `src/config/emailjs.ts` :

```typescript
serviceId: 'service_qcm_bf'
templateId: 'template_qcm_resultats'
publicKey: '14Pv9yeoz6o6okvPo'
adminEmail: 'idanihadara48@gmail.com'
```

---

## Étape 1 : Connexion à EmailJS

1. Allez sur [https://www.emailjs.com/](https://www.emailjs.com/)
2. Connectez-vous avec votre compte

---

## Étape 2 : Vérifier le Service Email

1. Cliquez sur **"Email Services"** dans le menu
2. Vérifiez qu'un service Gmail existe avec l'ID `service_qcm_bf`
3. Si non, cliquez sur **"Add New Service"** :
   - Choisissez **Gmail**
   - Service ID : `service_qcm_bf`
   - Connectez votre compte Gmail
   - Cliquez sur **"Create Service"**

---

## Étape 3 : Créer le Template Email

1. Cliquez sur **"Email Templates"** dans le menu
2. Cliquez sur **"Create New Template"**
3. **Paramètres du template** :
   - Template Name : `Résultats QCM`
   - Template ID : `template_qcm_resultats`

---

## Étape 4 : Configurer le Template

### Onglet "Content"

**To Email :**
```
{{to_email}}
```

**Subject :**
```
[QCM Concours BF] Nouvelle soumission - {{candidate_name}}
```

**Content (HTML) :**

Copiez et collez le code HTML ci-dessous :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                QCM Concours Burkina Faso
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                Nouvelle soumission de QCM
              </p>
            </td>
          </tr>
          
          <!-- Informations du candidat -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                Informations du candidat
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Nom complet</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <strong style="color: #111827; font-size: 14px;">{{candidate_name}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Téléphone</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <strong style="color: #111827; font-size: 14px;">{{candidate_phone}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Concours</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <strong style="color: #111827; font-size: 14px;">{{concours_name}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Date de soumission</span>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <strong style="color: #111827; font-size: 14px;">{{submission_date}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Score - BIEN CENTRÉ -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <p style="color: #166534; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Score obtenu
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; text-align: center;">
                            <span style="font-size: 72px; font-weight: 800; color: #166534; line-height: 1;">{{score}}</span>
                            <span style="font-size: 36px; font-weight: 400; color: #22c55e;">/ {{total_questions}}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Bouton Correction détaillée -->
          <tr>
            <td style="padding: 10px 40px 30px 40px; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">
                Cliquez ci-dessous pour voir le détail des réponses du candidat
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 10px;">
                    <a href="{{correction_url}}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                      Voir la correction détaillée
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 11px;">
                Ce lien est unique et sécurisé. Il fonctionnera sur n'importe quel appareil.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Ce message a été envoyé automatiquement par le système QCM Concours Burkina Faso.
              </p>
              <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
                Ne répondez pas à cet email.
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

## Étape 5 : Sauvegarder

1. Cliquez sur **"Save"** en haut à droite
2. Le template est maintenant prêt

---

## Variables du Template

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{to_email}}` | Email admin | idanihadara48@gmail.com |
| `{{candidate_name}}` | Nom complet | Jean DUPONT |
| `{{candidate_phone}}` | Téléphone | +226 70 00 00 00 |
| `{{concours_name}}` | Nom concours | ENAM - Administration |
| `{{submission_date}}` | Date/heure | 15 janvier 2025 à 14:30 |
| `{{score}}` | Note obtenue | 35 |
| `{{total_questions}}` | Total questions | 56 |
| `{{correction_url}}` | Lien correction | https://site.com?correction=UUID |

---

## Aperçu de l'email

L'email que l'administrateur recevra contiendra :

```
+------------------------------------------+
|                                          |
|     QCM CONCOURS BURKINA FASO            |
|     Nouvelle soumission de QCM           |
|                                          |
+------------------------------------------+
|                                          |
|  INFORMATIONS DU CANDIDAT                |
|  ─────────────────────────               |
|  Nom complet       Jean DUPONT           |
|  Téléphone         +226 70 00 00 00      |
|  Concours          ENAM - Administration |
|  Date              15/01/2025 14:30      |
|                                          |
+------------------------------------------+
|                                          |
|           SCORE OBTENU                   |
|                                          |
|              35 / 56                     |
|                                          |
+------------------------------------------+
|                                          |
|   [ VOIR LA CORRECTION DÉTAILLÉE ]       |
|                                          |
|   Ce lien est unique et sécurisé.        |
|   Il fonctionnera sur n'importe          |
|   quel appareil.                         |
|                                          |
+------------------------------------------+
|  Message automatique - Ne pas répondre   |
+------------------------------------------+
```

---

## Test du Template

1. Dans EmailJS, cliquez sur **"Test It"** (bouton en haut)
2. Remplissez les champs de test :
   - `to_email` : votre email
   - `candidate_name` : Test Candidat
   - `candidate_phone` : +226 70 00 00 00
   - `concours_name` : ENAM - Test
   - `submission_date` : 15 janvier 2025 à 14:30
   - `score` : 35
   - `total_questions` : 56
   - `correction_url` : https://votre-site.com?correction=test-uuid
3. Cliquez sur **"Send Test Email"**
4. Vérifiez votre boîte mail

---

## Dépannage

### L'email n'arrive pas
- Vérifiez le dossier spam
- Vérifiez que le service Gmail est connecté
- Vérifiez les quotas EmailJS (200 emails/mois gratuit)

### Le lien de correction ne fonctionne pas
1. **Vérifiez que Supabase est configuré** :
   - Variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
2. **Vérifiez que la table `attempts` existe** dans Supabase
3. **Vérifiez l'URL du site** : Variable `VITE_SITE_URL`

### Message "Tentative introuvable"
- La tentative n'existe pas dans la base de données
- Vérifiez dans Supabase > Table Editor > attempts

---

## Comparaison Ancienne vs Nouvelle Architecture

| Aspect | Ancienne (Base64) | Nouvelle (Supabase) |
|--------|-------------------|---------------------|
| Longueur URL | 2000-5000 chars | ~80 chars |
| Compatibilité | Problèmes fréquents | 100% |
| Sécurité | Données visibles | Données cachées |
| Mobile | Parfois tronqué | Toujours OK |
| Fiabilité | Instable | Très stable |

---

## Prérequis Supabase

Pour que le système fonctionne, vous devez :

1. **Créer un projet Supabase** : [supabase.com](https://supabase.com)
2. **Créer la table `attempts`** : Voir `docs/GUIDE_SUPABASE_CORRECTION.md`
3. **Configurer les variables d'environnement** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`

---

## Support

En cas de problème, consultez :
- Guide Supabase : `docs/GUIDE_SUPABASE_CORRECTION.md`
- Email : idanihadara48@gmail.com
- Documentation EmailJS : https://www.emailjs.com/docs/
