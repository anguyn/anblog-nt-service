import { translate } from '@vitalets/google-translate-api';
import { prisma } from '#libs/prisma';

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

export class TranslationService {
  /**
   * Translate text with fallback providers
   * Priority: Google Translate -> LibreTranslate -> Lingva -> MyMemory
   */
  private static async translateText(
    text: string,
    targetLang: 'en' | 'vi',
    options: { preserveFormatting?: boolean } = {}
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const chunks = this.splitTextIntoChunks(text, 4000);
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

    return translatedChunks.join('\n\n');
  }

  /**
   * LibreTranslate API
   */
  private static async translateWithLibre(text: string, targetLang: string): Promise<string> {
    const apiUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate';

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

    const textContent = this.extractTextFromContent(post.content, post.contentFormat);

    const [title, excerpt, content, metaTitle, metaDescription] = await Promise.all([
      this.translateText(post.title, targetLanguage),
      post.excerpt ? this.translateText(post.excerpt, targetLanguage) : Promise.resolve(null),
      this.translateText(textContent, targetLanguage, { preserveFormatting: true }),
      post.metaTitle ? this.translateText(post.metaTitle, targetLanguage) : Promise.resolve(null),
      post.metaDescription ? this.translateText(post.metaDescription, targetLanguage) : Promise.resolve(null),
    ]);

    const translatedContent = this.reconstructContent(content, post.content, post.contentFormat);

    return {
      title,
      excerpt,
      content: translatedContent,
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

  private static extractTextFromContent(content: string, format: string): string {
    if (format === 'MARKDOWN') {
      return content
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    } else if (format === 'HTML') {
      return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return content;
  }

  private static reconstructContent(translatedText: string, originalContent: string, format: string): string {
    if (format === 'MARKDOWN') {
      const lines = originalContent.split('\n');
      const translatedLines = translatedText.split('\n');

      return lines
        .map((line, i) => {
          const translatedLine = translatedLines[i] || '';
          const headerMatch = line.match(/^(#{1,6})\s+/);
          if (headerMatch) {
            return `${headerMatch[1]} ${translatedLine}`;
          }
          if (line.match(/^[\-\*]\s+/)) {
            return `- ${translatedLine}`;
          }
          return translatedLine;
        })
        .join('\n');
    }

    return translatedText;
  }

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
