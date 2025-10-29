import { Queue, Worker } from 'bullmq';
import { redis } from '#libs/redis';
import { TranslationService } from '#services/translation.service';
// import { TextToSpeechService } from '#services/text-to-speech.service';
// import { VideoStreamingService } from '#services/video-streaming.service';
import { prisma } from '#libs/prisma';

// ==========================================
// TRANSLATION QUEUE
// ==========================================

interface TranslationJobData {
  type: 'post' | 'category' | 'tag';
  id: string;
  targetLanguage: 'en' | 'vi';
}

export const translationQueue = new Queue<TranslationJobData>('translation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

export const translationWorker = new Worker<TranslationJobData>(
  'translation',
  async (job) => {
    const { type, id, targetLanguage } = job.data;

    console.log(`[Translation Worker] Processing ${type} ${id} → ${targetLanguage}`);

    try {
      switch (type) {
        case 'post': {
          const content = await TranslationService.translatePost(id, targetLanguage);
          const translation = await TranslationService.saveTranslation(id, targetLanguage, content);

          console.log(`✅ Translation completed: post ${id} (${translation.id})`);

          // After translation completes, queue TTS generation for translated content
          console.log(`[Translation Worker] Checking for pending TTS jobs for post ${id}...`);

          // Retry any failed TTS jobs for this translation
          //   const ttsPendingJobs = await ttsQueue.getJobs(['waiting', 'delayed', 'failed']);
          //   const relatedTTSJobs = ttsPendingJobs.filter(
          //     (j) => j.data.postId === id && j.data.language === targetLanguage && j.data.isTranslation
          //   );

          //   for (const ttsJob of relatedTTSJobs) {
          //     if ((await ttsJob.getState()) === 'failed') {
          //       await ttsJob.retry();
          //       console.log(`🔊 Retrying TTS job ${ttsJob.id} after translation completion`);
          //     }
          //   }

          return {
            success: true,
            type,
            id,
            targetLanguage,
            translationId: translation.id,
            slug: translation.slug,
          };
        }
        case 'category': {
          const result = await TranslationService.translateCategory(id, targetLanguage);
          console.log(`✅ Category translated: ${id}`);
          return { success: true, type, id, targetLanguage, ...result };
        }
        // case 'tag': {
        //   const result = await TranslationService.translateTag(id, targetLanguage);
        //   console.log(`✅ Tag translated: ${id}`);
        //   return { success: true, type, id, targetLanguage, ...result };
        // }
      }
    } catch (error) {
      console.error(`❌ Translation failed: ${type} ${id}`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// // ==========================================
// // TEXT-TO-SPEECH QUEUE
// // ==========================================

// interface TTSJobData {
//   postId: string;
//   language: 'en' | 'vi';
//   isTranslation: boolean;
// }

// export const ttsQueue = new Queue<TTSJobData>('text-to-speech', {
//   connection: redis,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: {
//       type: 'exponential',
//       delay: 10000,
//     },
//     removeOnComplete: {
//       age: 24 * 3600,
//       count: 50,
//     },
//   },
// });

// export const ttsWorker = new Worker<TTSJobData>(
//   'text-to-speech',
//   async (job) => {
//     const { postId, language, isTranslation } = job.data;

//     console.log(`[TTS Worker] Generating audio: post ${postId} (${language}, translation: ${isTranslation})`);

//     try {
//       // If translation audio requested, check if translation exists
//       if (isTranslation) {
//         const translation = await prisma.postTranslation.findUnique({
//           where: {
//             postId_language: { postId, language },
//           },
//         });

//         if (!translation) {
//           console.warn(`⚠️ Translation not found for post ${postId} (${language}), will retry later`);
//           throw new Error(`Translation not ready for post ${postId} (${language})`);
//         }
//       }

//       let result;
//       if (isTranslation) {
//         result = await TextToSpeechService.generateTranslationAudio(postId, language);
//       } else {
//         result = await TextToSpeechService.generatePostAudio(postId, language);
//       }

//       console.log(`✅ Audio generated: ${result.audioUrl}`);
//       return { success: true, audioUrl: result.audioUrl, duration: result.duration };
//     } catch (error) {
//       console.error(`❌ Audio generation failed: ${postId}`, error);
//       throw error;
//     }
//   },
//   {
//     connection: redis,
//     concurrency: 3,
//   }
// );

// // ==========================================
// // VIDEO PROCESSING QUEUE
// // ==========================================

// interface VideoJobData {
//   videoId: string;
//   sourceUrl: string;
//   action: 'process' | 'thumbnail';
// }

// export const videoQueue = new Queue<VideoJobData>('video-processing', {
//   connection: redis,
//   defaultJobOptions: {
//     attempts: 1,
//     timeout: 3600000,
//     removeOnComplete: {
//       age: 24 * 3600,
//       count: 20,
//     },
//   },
// });

// export const videoWorker = new Worker<VideoJobData>(
//   'video-processing',
//   async (job) => {
//     const { videoId, sourceUrl, action } = job.data;

//     console.log(`[Video Worker] Processing: ${action} for ${videoId}`);

//     try {
//       if (action === 'thumbnail') {
//         const thumbnailUrl = await VideoStreamingService.generateThumbnail(videoId, sourceUrl);
//         console.log(`✅ Thumbnail generated: ${thumbnailUrl}`);
//         return { success: true, thumbnailUrl };
//       } else {
//         const result = await VideoStreamingService.processVideoComplete(videoId, sourceUrl);
//         console.log(`✅ Video processed: ${result.manifestUrl}`);
//         return { success: true, ...result };
//       }
//     } catch (error) {
//       console.error(`❌ Video processing failed: ${videoId}`, error);
//       throw error;
//     }
//   },
//   {
//     connection: redis,
//     concurrency: 2,
//   }
// );

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export async function addTranslationJob(data: TranslationJobData) {
  return await translationQueue.add('translate', data, {
    priority: data.type === 'post' ? 5 : 10,
    jobId: `translation-${data.type}-${data.id}-${data.targetLanguage}`, // Prevent duplicates
  });
}

// export async function addTTSJob(data: TTSJobData) {
//   return await ttsQueue.add('generate-audio', data, {
//     jobId: `tts-${data.postId}-${data.language}-${data.isTranslation}`, // Prevent duplicates
//   });
// }

// export async function addVideoJob(data: VideoJobData) {
//   return await videoQueue.add('process-video', data, {
//     priority: data.action === 'thumbnail' ? 5 : 10,
//     jobId: `video-${data.action}-${data.videoId}`, // Prevent duplicates
//   });
// }

// ==========================================
// EVENT LISTENERS
// ==========================================

translationWorker.on('completed', (job) => {
  console.log(`✅ [Translation Queue] Job ${job.id} completed`);
});

translationWorker.on('failed', (job, error) => {
  console.error(`❌ [Translation Queue] Job ${job?.id} failed:`, error.message);
});

// ttsWorker.on('completed', (job) => {
//   console.log(`✅ [TTS Queue] Job ${job.id} completed`);
// });

// ttsWorker.on('failed', (job, error) => {
//   console.error(`❌ [TTS Queue] Job ${job?.id} failed:`, error.message);
// });

// videoWorker.on('completed', (job) => {
//   console.log(`✅ [Video Queue] Job ${job.id} completed`);
// });

// videoWorker.on('failed', (job, error) => {
//   console.error(`❌ [Video Queue] Job ${job?.id} failed:`, error.message);
// });
