import { Router, Request, Response, NextFunction } from 'express';
import { categoryRepository, tokenManagementService } from '../container';
import { createAuthenticateMiddleware } from '../middleware';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

// All category routes require authentication
router.use(authenticate);

// GET /categories (all authenticated users)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryRepository.listAll();
    res.json(categories.map(c => c.toJSON()));
  } catch (error) {
    next(error);
  }
});

export default router;
