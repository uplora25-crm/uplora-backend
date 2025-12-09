/**
 * Controllers Index File
 * 
 * Controllers handle the business logic for each route.
 * They receive requests, process data, and send responses.
 * 
 * Structure:
 * - Controllers should be organized by feature (e.g., leadsController, tasksController)
 * - Each controller exports functions that handle specific HTTP methods
 * - Controllers call services to perform business logic
 * 
 * Example controller function:
 * export const getLeads = async (req: Request, res: Response) => {
 *   try {
 *     const leads = await leadsService.getAllLeads();
 *     res.json(leads);
 *   } catch (error) {
 *     res.status(500).json({ error: 'Failed to fetch leads' });
 *   }
 * };
 */

// Export controllers here as they are created
// Example:
// export * from './leadsController';
// export * from './tasksController';

