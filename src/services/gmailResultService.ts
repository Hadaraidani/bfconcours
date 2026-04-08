import { supabase } from '../config/supabase';

/**
 * Appel à la Supabase Edge Function "send-result" pour envoyer un email via l'API Gmail
 */
export async function sendResultViaGmail(
  nom: string,
  email: string,
  note: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-result', {
      body: { nom, email, note },
    });

    if (error) {
      console.error('Erreur appel Edge Function send-result:', error);
      return { success: false, message: error.message };
    }

    if (!data.success) {
      return { success: false, message: data.error || 'Erreur lors de l\'envoi' };
    }

    return { success: true, message: 'Résultat envoyé avec succès par Gmail API' };
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}
