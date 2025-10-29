import { Locale, Translations, TranslationParams } from './types';
import { translations } from './translations';

/**
 * Get translation for a key with optional interpolation
 *
 * @example
 * t('verification.greeting', 'vi', { name: 'John' })
 * // Returns: "Xin chào John,"
 */
export function t(key: string, locale: Locale = 'vi', params?: TranslationParams): string {
  const translation = translations[key];

  if (!translation) {
    console.warn(`⚠️ Translation missing for key: ${key}`);
    return key;
  }

  let text = translation[locale] || translation.vi;

  // Interpolate parameters
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }

  return text;
}

/**
 * Get all translations for a namespace
 *
 * @example
 * getNamespace('email', 'vi')
 * // Returns: { verification: { subject: '...' }, ... }
 */
export function getNamespace(namespace: string, locale: Locale = 'vi'): Record<string, string> {
  const result: Record<string, string> = {};
  const prefix = `${namespace}.`;

  Object.entries(translations).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      const shortKey = key.substring(prefix.length);
      result[shortKey] = value[locale] || value.vi;
    }
  });

  return result;
}

/**
 * Add new translations dynamically
 * Useful for plugins/modules
 */
export function addTranslations(newTranslations: Translations): void {
  Object.assign(translations, newTranslations);
}

/**
 * Check if translation key exists
 */
export function hasTranslation(key: string): boolean {
  return key in translations;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
  return ['vi', 'en'];
}

// Re-export types
export type { Locale, Translations, TranslationParams };
export { translations };
