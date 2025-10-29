import { Request } from 'express';
import { Locale } from './types';

/**
 * Get locale from request headers or query params
 * Priority: query > header > default (vi)
 */
export function getLocaleFromRequest(req: Request): Locale {
  // Check query param: ?lang=en
  const queryLang = req.query.lang as string;
  if (queryLang === 'en' || queryLang === 'vi') {
    return queryLang;
  }

  // Check header: Accept-Language or X-Language
  const headerLang = req.headers['x-language'] || req.headers['accept-language'];
  if (typeof headerLang === 'string') {
    if (headerLang.includes('en')) return 'en';
    if (headerLang.includes('vi')) return 'vi';
  }

  // Default to Vietnamese
  return 'en';
}
