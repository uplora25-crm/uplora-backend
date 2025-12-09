/**
 * Services Index File
 * 
 * Services contain the core business logic and data access layer.
 * They are called by controllers and handle:
 * - Database operations
 * - External API calls
 * - Data validation and transformation
 * - Complex business rules
 * 
 * Best practices:
 * - Services should be independent of HTTP request/response objects
 * - Services return plain data objects, not HTTP responses
 * - Services handle errors and throw appropriate exceptions
 * 
 * Example service:
 * export const leadsService = {
 *   async getAllLeads() {
 *     // Database query logic here
 *     return leads;
 *   },
 *   async createLead(leadData) {
 *     // Validation and creation logic here
 *     return newLead;
 *   }
 * };
 */

// Export services here as they are created
// Example:
// export * from './leadsService';
// export * from './tasksService';

