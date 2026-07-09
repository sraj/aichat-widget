import type { Citation } from '@aichat-widget/shared';
import { sanitizeUrl } from '@aichat-widget/shared';

interface CitationCardProps {
  citation: Citation;
}

/**
 * Compact source citation card shown under assistant responses.
 */
export function CitationCard({ citation }: CitationCardProps) {
  const safeUrl = citation.url ? sanitizeUrl(citation.url) : '';

  return (
    <div
      class="rounded-md border p-2 text-xs"
      style={{
        borderColor: 'rgba(0, 0, 0, 0.12)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
      }}
    >
      <div class="font-medium text-slate-700">{citation.title}</div>
      {typeof citation.score === 'number' && (
        <div class="text-slate-500 mt-0.5">Score: {citation.score.toFixed(3)}</div>
      )}
      {citation.snippet && <div class="text-slate-600 mt-1 break-words">{citation.snippet}</div>}
      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block mt-1 text-blue-600 hover:underline"
        >
          Open source
        </a>
      )}
    </div>
  );
}
