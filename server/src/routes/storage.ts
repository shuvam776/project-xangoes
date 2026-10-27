import { Hono } from 'hono';
import { storageController } from '@/controllers/storage';
import { asyncHandler, authenticate, requireParticipant, validateRequest } from '@/middlewares';
import { signedUploadUrlSchema } from '@/middlewares/validators/storage';

const storageRouter = new Hono();

// Uploads and file lookups require a signed-in participant
storageRouter.use('*', authenticate, requireParticipant);

// POST /storage/upload-url - Generate signed upload URL
storageRouter.post(
    '/upload-url',
    validateRequest(signedUploadUrlSchema, 'body'),
    asyncHandler(storageController.getSignedUploadUrl)
);

// GET /storage/url/* - Get public URL for key (handles multi-segment paths like id_card/file.png)
storageRouter.get(
    '/url/*',
    asyncHandler(storageController.getFileUrl)
);

export { storageRouter };

