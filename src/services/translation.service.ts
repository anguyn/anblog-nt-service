import { translate } from '@vitalets/google-translate-api';
import { prisma } from '#libs/prisma';
import Groq from 'groq-sdk';

export interface TranslationContent {
  title: string;
  excerpt?: string | null;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

interface LibreTranslateResponse {
  translatedText: string | string[] | string[][];
  detectedLanguage?: { confidence: number; language: string } | Array<{ confidence: number; language: string }>;
  alternatives?: string[] | string[][];
}

interface LingvaResponse {
  translation: string;
  info?: {
    detectedSource?: string;
    confidence?: number;
  };
}

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
  };
  responseStatus: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

interface GroqConfig {
  model: string;
  requestsUsed: number;
  lastReset: number;
  dailyLimit: number;
}

export class TranslationService {
  // Groq models configuration với daily limits
  private static groqModels: GroqConfig[] = [
    { model: 'llama-3.3-70b-versatile', requestsUsed: 0, lastReset: Date.now(), dailyLimit: 14400 },
    { model: 'llama-3.1-70b-versatile', requestsUsed: 0, lastReset: Date.now(), dailyLimit: 14400 },
    { model: 'mixtral-8x7b-32768', requestsUsed: 0, lastReset: Date.now(), dailyLimit: 14400 },
  ];

  private static groqClient: Groq | null = null;
  private static geminiApiKey: string | null = null;

  /**
   * Initialize AI clients
   */
  private static initializeAI() {
    if (!this.groqClient && process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    if (!this.geminiApiKey && process.env.GOOGLE_AI_KEY) {
      this.geminiApiKey = process.env.GOOGLE_AI_KEY;
    }
  }

  /**
   * Get available Groq model (rotate to avoid rate limits)
   */
  private static getAvailableGroqModel(): GroqConfig | null {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Reset counters if 24h passed
    this.groqModels.forEach((config) => {
      if (now - config.lastReset > oneDayMs) {
        config.requestsUsed = 0;
        config.lastReset = now;
      }
    });

    // Find model with available quota
    return this.groqModels.find((config) => config.requestsUsed < config.dailyLimit) || null;
  }

  /**
   * Extract and protect code blocks, scripts, styles from HTML
   */
  private static extractProtectedContent(html: string): {
    cleanHtml: string;
    protectedBlocks: Map<string, string>;
  } {
    const protectedBlocks = new Map<string, string>();
    let counter = 0;

    const patterns = [
      // Code blocks (pre, code)
      { regex: /<pre[^>]*>[\s\S]*?<\/pre>/gi, type: 'PRE' },
      { regex: /<code[^>]*>[\s\S]*?<\/code>/gi, type: 'CODE' },

      // Scripts and styles
      { regex: /<script\b[^>]*>[\s\S]*?<\/script>/gi, type: 'SCRIPT' },
      { regex: /<style\b[^>]*>[\s\S]*?<\/style>/gi, type: 'STYLE' },

      // Inline code
      { regex: /<code[^>]*>[^<]+<\/code>/gi, type: 'INLINE_CODE' },

      // HTML attributes (class, id, data-*, style)
      { regex: /\s(class|id|data-[\w-]+|style|href|src)="[^"]*"/gi, type: 'ATTR' },
      { regex: /\s(class|id|data-[\w-]+|style|href|src)='[^']*'/gi, type: 'ATTR' },

      // URLs
      { regex: /https?:\/\/[^\s<>"]+/gi, type: 'URL' },

      // HTML entities
      { regex: /&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/gi, type: 'ENTITY' },

      // Mathematical expressions (if wrapped in specific tags)
      { regex: /<math[^>]*>[\s\S]*?<\/math>/gi, type: 'MATH' },

      // SVG content
      { regex: /<svg[^>]*>[\s\S]*?<\/svg>/gi, type: 'SVG' },
    ];

    let cleanHtml = html;

    patterns.forEach(({ regex, type }) => {
      cleanHtml = cleanHtml.replace(regex, (match) => {
        const placeholder = `__PROTECTED_${type}_${counter}__`;
        protectedBlocks.set(placeholder, match);
        counter++;
        return placeholder;
      });
    });

    return { cleanHtml, protectedBlocks };
  }

  /**
   * Restore protected content
   */
  private static restoreProtectedContent(translatedHtml: string, protectedBlocks: Map<string, string>): string {
    let restored = translatedHtml;

    protectedBlocks.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });

    return restored;
  }

  /**
   * Extract only translatable text from HTML (for AI translation)
   */
  private static extractTranslatableText(html: string): string[] {
    // Remove protected content first
    const { cleanHtml } = this.extractProtectedContent(html);

    // Extract text from HTML tags
    const textNodes: string[] = [];
    const tempDiv = cleanHtml.replace(
      /<(p|h[1-6]|li|td|th|div|span|a|strong|em|b|i)[^>]*>([^<]+)<\/\1>/gi,
      (match, tag, text) => {
        const cleaned = text.trim();
        if (cleaned && cleaned.length > 0) {
          textNodes.push(cleaned);
        }
        return match;
      }
    );

    return textNodes.filter((text) => text.length > 0);
  }

  /**
   * Translate with Groq AI (Primary method)
   */
  private static async translateWithGroq(text: string, targetLang: 'en' | 'vi'): Promise<string> {
    this.initializeAI();

    if (!this.groqClient) {
      throw new Error('Groq API key not configured');
    }

    const modelConfig = this.getAvailableGroqModel();
    if (!modelConfig) {
      throw new Error('All Groq models reached daily limit');
    }

    const systemPrompt = `You are a professional translator specializing in blog content translation.

CRITICAL RULES:
1. Translate ONLY the text content, preserve ALL HTML tags, attributes, and structure
2. DO NOT translate: code blocks, CSS classes, IDs, data attributes, URLs, HTML entities
3. Maintain the same formatting, line breaks, and HTML structure
4. Keep technical terms, brand names, and proper nouns as-is when appropriate
5. Translate naturally to ${targetLang === 'vi' ? 'Vietnamese' : 'English'}, maintaining the original tone

Return ONLY the translated HTML, no explanations.`;

    try {
      const response = await this.groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate this HTML to ${targetLang}:\n\n${text}` },
        ],
        model: modelConfig.model,
        temperature: 0.3,
        max_tokens: 8000,
      });

      modelConfig.requestsUsed++;
      console.log(
        `✅ Translated with Groq (${modelConfig.model}) - ${modelConfig.requestsUsed}/${modelConfig.dailyLimit}`
      );

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error(`Groq translation failed:`, error);
      throw error;
    }
  }

  /**
   * Translate with Google Gemini (Fallback AI)
   */
  private static async translateWithGemini(text: string, targetLang: 'en' | 'vi'): Promise<string> {
    this.initializeAI();

    if (!this.geminiApiKey) {
      throw new Error('Google AI key not configured');
    }

    const prompt = `Translate this HTML content to ${targetLang === 'vi' ? 'Vietnamese' : 'English'}. 
Rules: Preserve ALL HTML tags, attributes, code blocks, and structure. Translate ONLY the text content. Do NOT translate CSS classes, IDs, URLs, or code.

${text}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      const translated = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

      console.log('✅ Translated with Google Gemini');
      return translated;
    } catch (error) {
      console.error('Gemini translation failed:', error);
      throw error;
    }
  }

  /**
   * Translate HTML content with AI (with smart protection)
   */
  private static async translateHTMLWithAI(html: string, targetLang: 'en' | 'vi'): Promise<string> {
    // Step 1: Extract and protect non-translatable content
    const { cleanHtml, protectedBlocks } = this.extractProtectedContent(html);

    // Step 2: Try AI translation
    let translatedClean: string;

    try {
      // Primary: Groq
      translatedClean = await this.translateWithGroq(cleanHtml, targetLang);
    } catch (groqError) {
      console.warn('Groq failed, trying Gemini...');

      try {
        // Fallback: Gemini
        translatedClean = await this.translateWithGemini(cleanHtml, targetLang);
      } catch (geminiError) {
        console.error('All AI translation failed, falling back to manual extraction');
        throw new Error('AI_TRANSLATION_FAILED');
      }
    }

    // Step 3: Restore protected content
    const finalTranslated = this.restoreProtectedContent(translatedClean, protectedBlocks);

    return finalTranslated;
  }

  /**
   * Translate text with fallback providers
   * Priority: AI (Groq/Gemini) -> Manual extraction + Traditional APIs
   */
  private static async translateText(
    text: string,
    targetLang: 'en' | 'vi',
    options: { preserveFormatting?: boolean; isHTML?: boolean } = {}
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Strategy 1: If HTML and has AI keys, use AI translation
    if (options.isHTML && (process.env.GROQ_API_KEY || process.env.GOOGLE_AI_KEY)) {
      try {
        return await this.translateHTMLWithAI(text, targetLang);
      } catch (error) {
        if ((error as Error).message === 'AI_TRANSLATION_FAILED') {
          console.log('⚠️ AI failed, falling back to manual extraction + traditional APIs');
        } else {
          throw error;
        }
      }
    }

    // Strategy 2: Manual extraction + traditional translation APIs
    return await this.translateWithManualExtraction(text, targetLang, options);
  }

  /**
   * Manual extraction and translation (fallback method)
   */
  private static async translateWithManualExtraction(
    text: string,
    targetLang: 'en' | 'vi',
    options: { preserveFormatting?: boolean; isHTML?: boolean } = {}
  ): Promise<string> {
    // Extract and protect content
    const { cleanHtml, protectedBlocks } = this.extractProtectedContent(text);

    // Split into chunks and translate
    const chunks = this.splitTextIntoChunks(cleanHtml, 4000);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      let translated: string | null = null;

      // Try 1: Google Translate (free, unofficial)
      try {
        const result = await translate(chunk, { to: targetLang });
        translated = result.text;
        console.log('✅ Translated with Google Translate');
      } catch (error) {
        console.warn('Google Translate failed, trying fallback...');
      }

      // Try 2: LibreTranslate (free, self-hosted or public API)
      if (!translated) {
        try {
          translated = await this.translateWithLibre(chunk, targetLang);
          console.log('✅ Translated with LibreTranslate');
        } catch (error) {
          console.warn('LibreTranslate failed, trying fallback...');
        }
      }

      // Try 3: Lingva Translate
      if (!translated) {
        try {
          translated = await this.translateWithLingva(chunk, targetLang);
          console.log('✅ Translated with Lingva');
        } catch (error) {
          console.warn('Lingva failed, trying fallback...');
        }
      }

      // Try 4: MyMemory (free, 10k chars/day)
      if (!translated) {
        try {
          translated = await this.translateWithMyMemory(chunk, targetLang);
          console.log('✅ Translated with MyMemory');
        } catch (error) {
          console.warn('MyMemory failed');
        }
      }

      // Fallback: return original if all failed
      translatedChunks.push(translated || chunk);

      // Delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const translatedClean = translatedChunks.join('\n\n');

    // Restore protected content
    return this.restoreProtectedContent(translatedClean, protectedBlocks);
  }

  /**
   * LibreTranslate API
   */
  private static async translateWithLibre(text: string, targetLang: string): Promise<string> {
    const apiUrl = 'https://libretranslate.com/translate';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.statusText}`);
    }

    const data = (await response.json()) as LibreTranslateResponse;

    let translated = data.translatedText;
    if (Array.isArray(translated)) {
      translated = translated.flat().join(' ');
    }

    return typeof translated === 'string' ? translated : String(translated);
  }

  /**
   * Lingva Translate API
   */
  private static async translateWithLingva(text: string, targetLang: string): Promise<string> {
    const sourceLang = 'auto'; // Lingva hỗ trợ auto-detect
    const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Lingva error: ${response.statusText}`);
    }

    const data = (await response.json()) as LingvaResponse;
    return data.translation;
  }

  /**
   * MyMemory Translation API
   */
  private static async translateWithMyMemory(text: string, targetLang: string): Promise<string> {
    const sourceLang = targetLang === 'vi' ? 'en' : 'vi';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MyMemory error: ${response.statusText}`);
    }

    const data = (await response.json()) as MyMemoryResponse;

    if (data.responseStatus !== 200) {
      throw new Error('MyMemory translation failed');
    }

    return data.responseData.translatedText;
  }

  /**
   * Translate post content
   */
  static async translatePost(postId: string, targetLanguage: 'en' | 'vi'): Promise<TranslationContent> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        title: true,
        excerpt: true,
        content: true,
        metaTitle: true,
        metaDescription: true,
        contentFormat: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const isHTML = post.contentFormat === 'HTML';

    const [title, excerpt, content, metaTitle, metaDescription] = await Promise.all([
      this.translateText(post.title, targetLanguage),
      post.excerpt ? this.translateText(post.excerpt, targetLanguage) : Promise.resolve(null),
      this.translateText(post.content, targetLanguage, { preserveFormatting: true, isHTML }),
      post.metaTitle ? this.translateText(post.metaTitle, targetLanguage) : Promise.resolve(null),
      post.metaDescription ? this.translateText(post.metaDescription, targetLanguage) : Promise.resolve(null),
    ]);

    return {
      title,
      excerpt,
      content,
      metaTitle,
      metaDescription,
    };
  }

  /**
   * Translate category
   */
  static async translateCategory(categoryId: string, targetLanguage: 'en' | 'vi') {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true, description: true },
    });

    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const [name, description] = await Promise.all([
      this.translateText(category.name, targetLanguage),
      category.description ? this.translateText(category.description, targetLanguage) : Promise.resolve(null),
    ]);

    await prisma.categoryTranslation.upsert({
      where: {
        categoryId_language: {
          categoryId,
          language: targetLanguage,
        },
      },
      create: {
        categoryId,
        language: targetLanguage,
        name,
        description,
      },
      update: {
        name,
        description,
      },
    });

    return { name, description };
  }

  /**
   * Translate tag
   */
  // static async translateTag(tagId: string, targetLanguage: 'en' | 'vi') {
  //   const tag = await prisma.tag.findUnique({
  //     where: { id: tagId },
  //     select: { name: true },
  //   });

  //   if (!tag) {
  //     throw new Error(`Tag ${tagId} not found`);
  //   }

  //   const name = await this.translateText(tag.name, targetLanguage);

  //   await prisma.tagTranslation.upsert({
  //     where: {
  //       tagId_language: {
  //         tagId,
  //         language: targetLanguage,
  //       },
  //     },
  //     create: {
  //       tagId,
  //       language: targetLanguage,
  //       name,
  //     },
  //     update: {
  //       name,
  //     },
  //   });

  //   return { name };
  // }

  private static splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');

    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        if (para.length > chunkSize) {
          const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length > chunkSize) {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
        } else {
          currentChunk = para;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  static async saveTranslation(postId: string, language: 'en' | 'vi', translatedContent: TranslationContent) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { slug: true },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const translatedSlug = `${post.slug}-${language}`;

    return await prisma.postTranslation.upsert({
      where: {
        postId_language: {
          postId,
          language,
        },
      },
      create: {
        postId,
        language,
        slug: translatedSlug,
        title: translatedContent.title,
        excerpt: translatedContent.excerpt ?? null,
        content: translatedContent.content,
        metaTitle: translatedContent.metaTitle ?? null,
        metaDescription: translatedContent.metaDescription ?? null,
        isAITranslated: true,
        quality: 0.85,
      },
      update: {
        title: translatedContent.title,
        excerpt: translatedContent.excerpt ?? null,
        content: translatedContent.content,
        metaTitle: translatedContent.metaTitle ?? null,
        metaDescription: translatedContent.metaDescription ?? null,
        translatedAt: new Date(),
      },
    });
  }
}
