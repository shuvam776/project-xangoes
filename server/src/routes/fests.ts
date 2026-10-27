import { Hono } from 'hono';

import { adminController } from '@/controllers/admin';
import {
    asyncHandler,
    authenticate,
    requireAdmin,
    requireFestAdmin,
    validateRequest,
} from '@/middlewares';
import { festIdParamsSchema } from '@/middlewares/validators';

const festsRouter = new Hono();

festsRouter.use('*', authenticate);

// GET /fests/:festId/access - What the caller may do in this fest
festsRouter.get(
    '/:festId/access',
    requireAdmin,
    validateRequest(festIdParamsSchema, 'params'),
    asyncHandler(adminController.getFestAccess)
);

// GET /fests/:festId/admins - Admins of a fest; fest admins only see their own fest
festsRouter.get(
    '/:festId/admins',
    validateRequest(festIdParamsSchema, 'params'),
    requireFestAdmin('festId'),
    asyncHandler(adminController.listByFest)
);

export { festsRouter };
