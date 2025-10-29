import { Router } from 'express';
// import { TextToSpeechService } from '#services/text-to-speech.service';
// import { VideoStreamingService } from '#services/video-streaming.service';
import { addTranslationJob } from '#queues/media.queue';
import { t } from '#libs/i18n';
import { getLocaleFromRequest } from '#libs/i18n/middleware';

const router = Router();

// ==========================================
// TRANSLATION ENDPOINTS (Queue-based)
// ==========================================

/**
 * POST /api/media/translate/post
 * Add post translation to queue
 */
router.post('/translate/post', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const { postId, targetLanguage } = req.body;

    if (!postId || !targetLanguage) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        message: 'postId and targetLanguage are required',
      });
    }

    if (!['en', 'vi'].includes(targetLanguage)) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        message: 'targetLanguage must be "en" or "vi"',
      });
    }

    // Add to translation queue
    const job = await addTranslationJob({
      type: 'post',
      id: postId,
      targetLanguage: targetLanguage as 'en' | 'vi',
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Translation job added to queue',
      status: 'queued',
    });
  } catch (error) {
    console.error('Translation queue error:', error);
    res.status(500).json({
      error: 'Failed to queue translation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/media/translate/category
 * Add category translation to queue
 */
router.post('/translate/category', async (req, res) => {
  try {
    const { categoryId, targetLanguage } = req.body;

    if (!categoryId || !targetLanguage) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'categoryId and targetLanguage are required',
      });
    }

    const job = await addTranslationJob({
      type: 'category',
      id: categoryId,
      targetLanguage: targetLanguage as 'en' | 'vi',
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Category translation queued',
      status: 'queued',
    });
  } catch (error) {
    console.error('Category translation queue error:', error);
    res.status(500).json({
      error: 'Failed to queue translation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/media/translate/tag
 * Add tag translation to queue
 */
router.post('/translate/tag', async (req, res) => {
  try {
    const { tagId, targetLanguage } = req.body;

    if (!tagId || !targetLanguage) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'tagId and targetLanguage are required',
      });
    }

    const job = await addTranslationJob({
      type: 'tag',
      id: tagId,
      targetLanguage: targetLanguage as 'en' | 'vi',
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Tag translation queued',
      status: 'queued',
    });
  } catch (error) {
    console.error('Tag translation queue error:', error);
    res.status(500).json({
      error: 'Failed to queue translation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/media/translate/batch
 * Add multiple translations to queue
 */
router.post('/translate/batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'items must be a non-empty array',
      });
    }

    const jobs = await Promise.all(
      items.map((item) =>
        addTranslationJob({
          type: item.type,
          id: item.id,
          targetLanguage: item.targetLanguage,
        })
      )
    );

    res.json({
      success: true,
      count: jobs.length,
      jobIds: jobs.map((j) => j.id),
      message: `${jobs.length} translation jobs queued`,
    });
  } catch (error) {
    console.error('Batch translation queue error:', error);
    res.status(500).json({
      error: 'Failed to queue translations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/media/translate/status/:jobId
 * Check translation job status
 */
router.get('/translate/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { translationQueue } = await import('#queues/media.queue');

    const job = await translationQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Translation job ${jobId} not found`,
      });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    res.json({
      success: true,
      jobId: job.id,
      status: state,
      progress,
      result,
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// // ==========================================
// // TEXT-TO-SPEECH ENDPOINTS
// // ==========================================

// /**
//  * GET /api/media/audio/:postId
//  * Get audio for post (cached or generates new)
//  */
// router.get('/audio/:postId', async (req, res) => {
//   try {
//     const { postId } = req.params;
//     const { lang = 'vi', translation = 'false' } = req.query;

//     const language = lang as 'vi' | 'en';
//     const isTranslation = translation === 'true';

//     const audio = await TextToSpeechService.getPostAudio(postId, language, isTranslation);

//     res.json({
//       success: true,
//       audio: {
//         url: audio.audioUrl,
//         duration: audio.duration,
//         language,
//         isTranslation,
//       },
//     });
//   } catch (error) {
//     console.error('Audio generation error:', error);
//     res.status(500).json({
//       error: 'Audio generation failed',
//       message: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });

// /**
//  * POST /api/media/audio/generate
//  * Queue audio generation job
//  */
// router.post('/audio/generate', async (req, res) => {
//   try {
//     const { postId, language = 'vi', isTranslation = false } = req.body;

//     if (!postId) {
//       return res.status(400).json({
//         error: 'Invalid request',
//         message: 'postId is required',
//       });
//     }

//     const job = await addTTSJob({
//       postId,
//       language: language as 'vi' | 'en',
//       isTranslation,
//     });

//     res.json({
//       success: true,
//       jobId: job.id,
//       message: 'Audio generation queued',
//       status: 'queued',
//     });
//   } catch (error) {
//     console.error('Audio queue error:', error);
//     res.status(500).json({
//       error: 'Failed to queue audio generation',
//       message: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });

// // ==========================================
// // VIDEO STREAMING ENDPOINTS
// // ==========================================

// /**
//  * GET /api/media/video/:videoId/stream
//  * Get streaming manifest URL
//  */
// router.get('/video/:videoId/stream', async (req, res) => {
//   try {
//     const { videoId } = req.params;

//     const result = await VideoStreamingService.getStreamingUrl(videoId);

//     res.json({
//       success: true,
//       ...result,
//     });
//   } catch (error) {
//     console.error('Streaming URL error:', error);
//     res.status(500).json({
//       error: 'Failed to get streaming URL',
//       message: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });

// /**
//  * POST /api/media/video/process
//  * Queue video processing job
//  */
// router.post('/video/process', async (req, res) => {
//   try {
//     const { videoId, sourceUrl } = req.body;

//     if (!videoId || !sourceUrl) {
//       return res.status(400).json({
//         error: 'Invalid request',
//         message: 'videoId and sourceUrl are required',
//       });
//     }

//     const job = await addVideoJob({
//       videoId,
//       sourceUrl,
//       action: 'process',
//     });

//     res.json({
//       success: true,
//       jobId: job.id,
//       message: 'Video processing queued',
//       status: 'queued',
//       videoId,
//     });
//   } catch (error) {
//     console.error('Video queue error:', error);
//     res.status(500).json({
//       error: 'Failed to queue video processing',
//       message: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });

// /**
//  * POST /api/media/video/thumbnail
//  * Queue thumbnail generation
//  */
// router.post('/video/thumbnail', async (req, res) => {
//   try {
//     const { videoId, sourceUrl } = req.body;

//     if (!videoId || !sourceUrl) {
//       return res.status(400).json({
//         error: 'Invalid request',
//         message: 'videoId and sourceUrl are required',
//       });
//     }

//     const job = await addVideoJob({
//       videoId,
//       sourceUrl,
//       action: 'thumbnail',
//     });

//     res.json({
//       success: true,
//       jobId: job.id,
//       message: 'Thumbnail generation queued',
//       status: 'queued',
//     });
//   } catch (error) {
//     console.error('Thumbnail queue error:', error);
//     res.status(500).json({
//       error: 'Failed to queue thumbnail generation',
//       message: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });

export default router;
