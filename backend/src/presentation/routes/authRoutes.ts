import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { getAuthUser, validateRequest } from '../middleware';
import {
  loginWithCredentialsUseCase,
  loginWithGoogleOAuthUseCase,
  logoutUseCase,
  refreshTokenUseCase,
  tokenManagementService,
} from '../container';
import { createAuthenticateMiddleware } from '../middleware';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// POST /auth/login
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginWithCredentialsUseCase.execute({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
    });
    res.json({
      token: result.token,
      user: result.user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/oauth/google - Initiate Google OAuth
router.get('/oauth/google', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /auth/oauth/callback - OAuth callback handler
router.get('/oauth/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req: Request, res: Response, next: NextFunction) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const oauthUser = req.user as any;
      if (!oauthUser) {
        res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent('OAuth authentication failed')}`);
        return;
      }

      let token: string;
      let userJson: object;

      if (oauthUser.token && oauthUser.user) {
        // Passport provisioned the user but generateJWT doesn't create a DB session.
        // Create a proper session so validateToken works on subsequent requests.
        const { token: sessionToken } = await tokenManagementService.createSession(oauthUser.user);
        token = sessionToken;
        userJson = oauthUser.user.toJSON ? oauthUser.user.toJSON() : oauthUser.user;
      } else {
        const result = await loginWithGoogleOAuthUseCase.execute({
          email: oauthUser.email || oauthUser.emails?.[0]?.value,
          displayName: oauthUser.displayName || '',
          googleId: oauthUser.id || oauthUser.googleId || '',
          ipAddress: req.ip,
        });
        token = result.token;
        userJson = result.user.toJSON();
      }

      const params = new URLSearchParams({
        token,
        user: encodeURIComponent(JSON.stringify(userJson)),
      });
      res.redirect(`${frontendUrl}/auth/callback?${params}`);
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/logout
const authenticate = createAuthenticateMiddleware(tokenManagementService);
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getAuthUser(req);
    const token = req.headers.authorization?.slice(7) || '';
    await logoutUseCase.execute({
      token,
      userId: user.userId,
      ipAddress: req.ip,
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /auth/refresh
router.post('/refresh', validateRequest(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await refreshTokenUseCase.execute({ token: req.body.token });
    res.json({
      token: result.token,
      user: result.user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
