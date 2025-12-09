/**
 * Validators Index File
 * 
 * Validators ensure that incoming request data meets the required format and rules.
 * They are used as middleware in routes to validate request bodies, query params, etc.
 * 
 * Common validation tasks:
 * - Check required fields are present
 * - Validate data types (string, number, email, etc.)
 * - Enforce business rules (e.g., email format, phone number format)
 * - Sanitize input data
 * 
 * Example validator:
 * export const validateLead = (req: Request, res: Response, next: NextFunction) => {
 *   const { name, email } = req.body;
 *   if (!name) {
 *     return res.status(400).json({ error: 'Name is required' });
 *   }
 *   if (email && !isValidEmail(email)) {
 *     return res.status(400).json({ error: 'Invalid email format' });
 *   }
 *   next(); // Pass to next middleware/controller
 * };
 */

// Export validators here as they are created
// Example:
// export * from './leadsValidator';
// export * from './tasksValidator';

