import { prisma } from '#libs/prisma';
import type { Post, User, Category, Tag, PostTag, EmailSubscription, TranslationQueue } from '@prisma/client';

// Helper để lấy type từ Prisma query result
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Post với relations đầy đủ
const _postWithRelations = async () =>
  await prisma.post.findFirst({
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

export type PostWithRelations = NonNullable<Awaited<ReturnType<typeof _postWithRelations>>>;

// Subscriber với user info - match exact query trong service
const _subscriberWithUser = async () =>
  await prisma.emailSubscription.findFirst({
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

export type SubscriberWithUser = NonNullable<Awaited<ReturnType<typeof _subscriberWithUser>>>;

// Subscriber cho digest - khác với subscriber thường
const _digestSubscriber = async () =>
  await prisma.emailSubscription.findFirst({
    include: {
      user: {
        select: {
          name: true,
          language: true,
        },
      },
    },
  });

export type DigestSubscriber = NonNullable<Awaited<ReturnType<typeof _digestSubscriber>>>;

// Translation queue item - không có relation post trong schema, dùng manual type
export type TranslationQueueItem = TranslationQueue & {
  post: Pick<Post, 'id' | 'title' | 'excerpt' | 'content' | 'slug'> | null;
};

// Author với posts cho digest
const _authorWithPosts = async () =>
  await prisma.user.findFirst({
    include: {
      posts: {
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

export type AuthorWithPosts = NonNullable<Awaited<ReturnType<typeof _authorWithPosts>>>;
