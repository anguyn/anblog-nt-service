export type Locale = 'vi' | 'en';

export interface Translations {
  [key: string]: {
    vi: string;
    en: string;
  };
}

export interface TranslationParams {
  [key: string]: string | number;
}
