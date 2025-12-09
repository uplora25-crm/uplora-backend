/**
 * Cache Control Middleware
 * 
 * Adds appropriate Cache-Control headers for read-heavy endpoints.
 * This improves performance by allowing browsers and CDNs to cache responses.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Cache-Control options for different endpoint types
 */
export const cacheOptions = {
  // Short cache for frequently changing data (dashboard, lists)
  short: 'public, max-age=30, s-maxage=60', // 30s browser, 60s CDN
  
  // Medium cache for relatively stable data (pipeline, deals)
  medium: 'public, max-age=60, s-maxage=120', // 1min browser, 2min CDN
  
  // Long cache for static/rarely changing data (pricing plans)
  long: 'public, max-age=300, s-maxage=600', // 5min browser, 10min CDN
  
  // No cache for dynamic/user-specific data
  none: 'no-cache, no-store, must-revalidate',
};

/**
 * Middleware to set cache headers
 * @param maxAge - Cache duration option (short, medium, long, none)
 */
export const setCacheHeaders = (maxAge: keyof typeof cacheOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', cacheOptions[maxAge]);
    res.setHeader('Vary', 'Accept-Encoding'); // Vary by compression
    next();
  };
};

/**
 * Conditional cache middleware - only caches GET requests
 * POST/PUT/DELETE requests bypass cache
 */
export const conditionalCache = (maxAge: keyof typeof cacheOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', cacheOptions[maxAge]);
      res.setHeader('Vary', 'Accept-Encoding');
    } else {
      res.setHeader('Cache-Control', cacheOptions.none);
    }
    next();
  };
};

