import { prisma } from '#libs/prisma';
import { addEmailJob, EmailPriority } from '#queues/email.queue';
import { addNotificationJob } from '#queues/notification.queue';
import { addTranslationJob } from '#queues/media.queue';
import type { PostWithRelations, SubscriberWithUser, DigestSubscriber, AuthorWithPosts } from '#types/post.types';

export class PostService {
  /**
   * Publish scheduled posts that are due
   */
  static async publishScheduledPosts() {
    try {
      const now = new Date();

      const scheduledPosts = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              language: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (scheduledPosts.length === 0) {
        console.log('No scheduled posts to publish');
        return { published: 0 };
      }

      console.log(`Found ${scheduledPosts.length} scheduled posts to publish`);

      const results = await Promise.allSettled(
        scheduledPosts.map(async (post: PostWithRelations) => {
          try {
            await prisma.post.update({
              where: { id: post.id },
              data: {
                status: 'PUBLISHED',
                publishedAt: now,
                scheduledFor: null,
              },
            });

            console.log(`✅ Published post: ${post.title} (${post.id})`);

            // Notify subscribers
            await this.notifySubscribers(post);

            // Auto-translate to other language
            await this.autoTranslatePost(post);

            // Generate audio for both languages
            // await this.generateAudioForPost(post);

            return { success: true, postId: post.id };
          } catch (error) {
            console.error(`❌ Failed to publish post ${post.id}:`, error);
            return { success: false, postId: post.id, error };
          }
        })
      );

      const published = results.filter((r) => r.status === 'fulfilled').length;

      console.log(`Published ${published}/${scheduledPosts.length} posts`);

      return { published, total: scheduledPosts.length, results };
    } catch (error) {
      console.error('Error in publishScheduledPosts:', error);
      throw error;
    }
  }

  /**
   * Auto-translate post to other language
   */
  /**
   * Auto-translate post to other languages
   */
  private static async autoTranslatePost(post: PostWithRelations) {
    try {
      const sourceLanguage = post.language; // Post's language (vi or en)
      const allLanguages = ['vi', 'en'];
      const targetLanguages = allLanguages.filter((lang) => lang !== sourceLanguage) as ('vi' | 'en')[];

      console.log(`Auto-translating post ${post.id} from ${sourceLanguage} to: ${targetLanguages.join(', ')}`);

      // Check existing translations and queue missing ones
      for (const targetLanguage of targetLanguages) {
        const existingTranslation = await prisma.postTranslation.findUnique({
          where: {
            postId_language: {
              postId: post.id,
              language: targetLanguage,
            },
          },
        });

        if (existingTranslation) {
          console.log(`Translation already exists for post ${post.id} (${targetLanguage})`);
          continue;
        }

        // Add translation to queue
        await addTranslationJob({
          type: 'post',
          id: post.id,
          targetLanguage,
        });

        console.log(`🌍 Queued translation for post ${post.id} (${sourceLanguage} → ${targetLanguage})`);
      }
    } catch (error) {
      console.error('Error auto-translating post:', error);
    }
  }

  /**
   * Generate audio for post in both languages
   */
  // private static async generateAudioForPost(post: PostWithRelations) {
  //   try {
  //     const sourceLanguage = (post.author.language || 'vi') as 'vi' | 'en';
  //     const targetLanguage = sourceLanguage === 'vi' ? 'en' : 'vi';

  //     // Queue audio generation for source language
  //     await addTTSJob({
  //       postId: post.id,
  //       language: sourceLanguage,
  //       isTranslation: false,
  //     });

  //     // Queue audio generation for translation (will wait for translation to complete)
  //     await addTTSJob({
  //       postId: post.id,
  //       language: targetLanguage,
  //       isTranslation: true,
  //     });

  //     console.log(`🔊 Queued audio generation for post ${post.id} (${sourceLanguage} & ${targetLanguage})`);
  //   } catch (error) {
  //     console.error('Error queuing audio generation:', error);
  //   }
  // }

  /**
   * Notify subscribers when a new post is published
   */
  static async notifySubscribers(post: PostWithRelations) {
    try {
      const subscribers = await prisma.emailSubscription.findMany({
        where: {
          authorId: post.authorId,
          isActive: true,
          frequency: 'IMMEDIATE',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              language: true,
            },
          },
        },
      });

      if (subscribers.length === 0) {
        console.log(`No subscribers for author ${post.authorId}`);
        return;
      }

      console.log(`Notifying ${subscribers.length} subscribers about new post`);

      await Promise.allSettled(
        subscribers.map(async (subscriber: SubscriberWithUser) => {
          const locale = subscriber.user?.language || 'vi';
          const postUrl = `${process.env.MAIN_APP_URL}/posts/${post.slug}`;
          const unsubscribeUrl = `${process.env.MAIN_APP_URL}/unsubscribe/${subscriber.token}`;

          await addEmailJob(
            {
              to: subscriber.email,
              template: 'new-post-notification',
              templateData: {
                subscriberName: subscriber.user?.name || subscriber.email,
                authorName: post.author.name || post.author.username,
                postTitle: post.title,
                postExcerpt: post.excerpt || post.content.substring(0, 200),
                postUrl,
                unsubscribeUrl,
              },
              locale: locale as 'vi' | 'en',
              emailType: 'notification',
            },
            EmailPriority.NORMAL
          );

          if (subscriber.userId) {
            await addNotificationJob({
              userId: subscriber.userId,
              type: 'NEW_POST',
              title: `New post from ${post.author.name}`,
              message: post.title,
              link: postUrl,
              data: {
                postId: post.id,
                authorId: post.authorId,
              },
            });
          }
        })
      );

      console.log(`✅ Queued notifications for ${subscribers.length} subscribers`);
    } catch (error) {
      console.error('Error notifying subscribers:', error);
      throw error;
    }
  }

  /**
   * Send newsletter digest (daily/weekly/monthly)
   */
  static async sendNewsletterDigest(frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
    try {
      console.log(`Sending ${frequency} newsletter digest...`);

      const dateRange = this.getDateRange(frequency);

      const authors: AuthorWithPosts[] = await prisma.user.findMany({
        where: {
          posts: {
            some: {
              status: 'PUBLISHED',
              publishedAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            },
          },
        },
        include: {
          posts: {
            where: {
              status: 'PUBLISHED',
              publishedAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            },
            orderBy: {
              publishedAt: 'desc',
            },
            take: 5,
            include: {
              category: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      });

      console.log(`Found ${authors.length} authors with new posts`);

      for (const author of authors) {
        if (author.posts.length === 0) continue;

        const subscribers = await prisma.emailSubscription.findMany({
          where: {
            authorId: author.id,
            isActive: true,
            frequency: frequency,
          },
          include: {
            user: {
              select: {
                name: true,
                language: true,
              },
            },
          },
        });

        if (subscribers.length === 0) continue;

        console.log(`Sending ${frequency} digest to ${subscribers.length} subscribers of ${author.name}`);

        const digestHtml = this.generateDigestHtml(author, author.posts, frequency);

        await Promise.allSettled(
          subscribers.map((subscriber: DigestSubscriber) => {
            const locale = subscriber.user?.language || 'vi';

            return addEmailJob(
              {
                to: subscriber.email,
                template: 'newsletter',
                templateData: {
                  title: `${frequency} Digest from ${author.name}`,
                  content: digestHtml,
                  authorName: author.name,
                  postCount: author.posts.length,
                  unsubscribeUrl: `${process.env.MAIN_APP_URL}/unsubscribe/${subscriber.token}`,
                },
                locale: locale as 'vi' | 'en',
                emailType: 'newsletter',
              },
              EmailPriority.LOW
            );
          })
        );
      }

      console.log(`✅ Newsletter digest sent`);
    } catch (error) {
      console.error('Error sending newsletter digest:', error);
      throw error;
    }
  }

  private static getDateRange(frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
    const to = new Date();
    const from = new Date();

    switch (frequency) {
      case 'DAILY':
        from.setDate(from.getDate() - 1);
        break;
      case 'WEEKLY':
        from.setDate(from.getDate() - 7);
        break;
      case 'MONTHLY':
        from.setMonth(from.getMonth() - 1);
        break;
    }

    return { from, to };
  }

  private static generateDigestHtml(
    author: AuthorWithPosts,
    posts: AuthorWithPosts['posts'],
    frequency: string
  ): string {
    return `
      <div style="padding: 20px 0;">
        <h2 style="color: #111827; margin-bottom: 10px;">
          ${frequency} Digest from ${author.name}
        </h2>
        <p style="color: #6b7280; margin-bottom: 30px;">
          Here are the latest ${posts.length} posts from ${author.name}
        </p>

        ${posts
          .map(
            (post) => `
          <div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #e5e7eb;">
            ${
              post.featuredImage
                ? `
              <img 
                src="${post.featuredImage}" 
                alt="${post.title}"
                style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;"
              >
            `
                : ''
            }
            
            <h3 style="margin: 0 0 10px 0; color: #111827;">
              <a href="${process.env.MAIN_APP_URL}/posts/${post.slug}" 
                 style="color: #111827; text-decoration: none;">
                ${post.title}
              </a>
            </h3>
            
            ${
              post.excerpt
                ? `
              <p style="color: #6b7280; margin: 10px 0;">
                ${post.excerpt}
              </p>
            `
                : ''
            }
            
            <div style="margin-top: 15px;">
              <a href="${process.env.MAIN_APP_URL}/posts/${post.slug}" 
                 style="color: #667eea; text-decoration: none; font-weight: 600;">
                Read more →
              </a>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Auto-translate posts in queue
   */
  static async processTranslationQueue() {
    try {
      const queueItems = await prisma.translationQueue.findMany({
        where: {
          status: 'PENDING',
          attempts: {
            lt: 3,
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 10,
      });

      if (queueItems.length === 0) {
        console.log('No translations in queue');
        return;
      }

      console.log(`Processing ${queueItems.length} translation tasks`);

      await Promise.allSettled(
        queueItems.map(async (item) => {
          try {
            const post = await prisma.post.findUnique({
              where: { id: item.postId },
              select: {
                id: true,
                title: true,
                excerpt: true,
                content: true,
                slug: true,
              },
            });

            if (!post) {
              console.error(`❌ Post ${item.postId} not found`);
              return;
            }

            await prisma.translationQueue.update({
              where: { id: item.id },
              data: {
                status: 'PROCESSING',
                attempts: item.attempts + 1,
              },
            });

            // TODO: Call AI translation service here
            // const translated = await translateContent(post, item.language);

            await prisma.translationQueue.update({
              where: { id: item.id },
              data: {
                status: 'COMPLETED',
                processedAt: new Date(),
              },
            });

            console.log(`✅ Translated post ${item.postId} to ${item.language}`);
          } catch (error) {
            console.error(`❌ Translation failed for ${item.id}:`, error);

            await prisma.translationQueue.update({
              where: { id: item.id },
              data: {
                status: item.attempts >= 2 ? 'FAILED' : 'PENDING',
                error: String(error),
              },
            });
          }
        })
      );
    } catch (error) {
      console.error('Error processing translation queue:', error);
    }
  }

  /**
   * Clean up old activity logs based on retention policy
   */
  static async cleanupActivityLogs() {
    try {
      const result = await prisma.activityLog.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`✅ Cleaned up ${result.count} expired activity logs`);
      return result;
    } catch (error) {
      console.error('Error cleaning up activity logs:', error);
      throw error;
    }
  }
}
