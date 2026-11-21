import type { UiLanguage } from '@/types';

/** Map UI language → Tesseract traineddata codes (primary + eng fallback). */
function tesseractLangs(uiLang?: UiLanguage): string {
  switch (uiLang) {
    case 'it':
      return 'ita+eng';
    case 'es':
      return 'spa+eng';
    case 'ca':
      // Catalan traineddata is optional; Spanish covers most supermarket labels
      return 'spa+eng';
    case 'fr':
      return 'fra+eng';
    case 'de':
      return 'deu+eng';
    case 'pt':
      return 'por+eng';
    case 'ru':
      return 'rus+eng';
    case 'ar':
      return 'ara+eng';
    case 'en':
    default:
      return 'eng';
  }
}

function cleanupOcrText(raw: string): string {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[|]/g, 'I')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * Extract ingredient-list text from a local image URI (camera / gallery).
 * Runs entirely in the browser/device via Tesseract — no backend.
 */
export async function extractIngredientsFromImage(
  imageUri: string,
  uiLang?: UiLanguage,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const langs = tesseractLangs(uiLang);
  const worker = await createWorker(langs, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(imageUri);
    const cleaned = cleanupOcrText(text);
    if (cleaned.length < 3) {
      throw new Error('OCR_EMPTY');
    }
    return cleaned;
  } finally {
    await worker.terminate();
  }
}
