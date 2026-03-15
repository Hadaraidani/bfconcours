import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// ==========================================
// EXPORTS: MathRenderer et QuestionImage
// ==========================================

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Normalise les backslashes pour KaTeX
 * Supabase stocke les formules avec des doubles backslashes (\\frac)
 * KaTeX a besoin de simples backslashes (\frac)
 */
function normalizeLatex(text: string): string {
  if (!text) return '';
  
  // Méthode générale : remplacer tous les doubles backslashes par des simples
  // \\frac -> \frac, \\infty -> \infty, etc.
  let normalized = text;
  
  // Remplacer les doubles backslashes devant les lettres (commandes LaTeX)
  // \\frac -> \frac
  normalized = normalized.replace(/\\\\([a-zA-Z])/g, '\\$1');
  
  // Remplacer les doubles backslashes devant les accolades
  // \\{ -> \{
  normalized = normalized.replace(/\\\\([{}])/g, '\\$1');
  
  // Nettoyer les apostrophes échappées
  normalized = normalized.replace(/\\'/g, "'");
  
  return normalized;
}

/**
 * Détecte si une chaîne contient du LaTeX
 */
function containsLatex(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.includes('$');
}

/**
 * Parse le texte et sépare les parties LaTeX des parties texte
 */
function parseLatexParts(text: string): Array<{ type: 'text' | 'inline' | 'display'; content: string }> {
  const parts: Array<{ type: 'text' | 'inline' | 'display'; content: string }> = [];
  
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: String(text || '') }];
  }
  
  let remaining = text;
  
  while (remaining.length > 0) {
    // Check for display mode first ($$...$$)
    const displayMatch = remaining.match(/^\$\$([^$]+)\$\$/);
    if (displayMatch) {
      parts.push({ type: 'display', content: normalizeLatex(displayMatch[1]) });
      remaining = remaining.slice(displayMatch[0].length);
      continue;
    }
    
    // Check for inline mode ($...$)
    const inlineMatch = remaining.match(/^\$([^$]+)\$/);
    if (inlineMatch) {
      parts.push({ type: 'inline', content: normalizeLatex(inlineMatch[1]) });
      remaining = remaining.slice(inlineMatch[0].length);
      continue;
    }
    
    // Find next $ sign or end of string
    const nextDollar = remaining.indexOf('$');
    if (nextDollar === -1) {
      parts.push({ type: 'text', content: remaining });
      break;
    } else if (nextDollar > 0) {
      parts.push({ type: 'text', content: remaining.slice(0, nextDollar) });
      remaining = remaining.slice(nextDollar);
    } else {
      // Single $ at the start that wasn't matched - just include it
      parts.push({ type: 'text', content: '$' });
      remaining = remaining.slice(1);
    }
  }
  
  return parts;
}

/**
 * Composant MathRenderer - Rendu LaTeX avec react-katex
 * Gère automatiquement les données de Supabase (doubles backslashes)
 */
export function MathRenderer({ text, className = '' }: MathRendererProps) {
  // Mémoriser le parsing pour éviter les recalculs
  const parts = useMemo(() => {
    if (!containsLatex(text)) {
      return null; // Pas de LaTeX, on affiche le texte brut
    }
    return parseLatexParts(text);
  }, [text]);
  
  // Pas de LaTeX - affichage simple
  if (!parts) {
    return <span className={className}>{text}</span>;
  }
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }
        
        if (part.type === 'display') {
          return (
            <span key={index} className="block my-2 text-center">
              <BlockMath math={part.content} errorColor="#ef4444" />
            </span>
          );
        }
        
        // inline
        return (
          <span key={index} className="inline-flex items-center">
            <InlineMath math={part.content} errorColor="#ef4444" />
          </span>
        );
      })}
    </span>
  );
}

interface QuestionImageProps {
  src: string;
  alt?: string;
  position?: 'above' | 'below' | 'inline';
}

/**
 * Composant QuestionImage - Affiche les images des questions
 */
export function QuestionImage({ src, alt = 'Image de la question', position = 'below' }: QuestionImageProps) {
  const positionClasses = {
    above: 'mb-4',
    below: 'mt-4',
    inline: 'my-2',
  };

  return (
    <div className={`${positionClasses[position]} flex justify-center`}>
      <div className="relative max-w-full overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white p-2">
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto max-h-64 sm:max-h-80 object-contain"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                <rect fill="#f3f4f6" width="200" height="150"/>
                <text x="100" y="75" text-anchor="middle" fill="#9ca3af" font-size="14">Image non disponible</text>
              </svg>
            `);
          }}
        />
        {alt && alt !== 'Image de la question' && (
          <p className="text-xs text-gray-500 text-center mt-2 italic">{alt}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Hook pour détecter si un texte contient du LaTeX
 */
export function useHasLatex(text: string): boolean {
  return useMemo(() => containsLatex(text), [text]);
}

/**
 * Fonction utilitaire exportée pour normaliser le LaTeX
 */
export { normalizeLatex, containsLatex };
