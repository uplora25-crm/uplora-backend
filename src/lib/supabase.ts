/**
 * Supabase Database Connection (Singleton Pattern)
 * 
 * This file creates and exports a singleton Supabase client instance.
 * The client is initialized once at module load and reused across all requests,
 * which is crucial for serverless functions to avoid cold-start overhead.
 * 
 * In Vercel serverless functions:
 * - Module-level code runs once per container (not per request)
 * - This singleton pattern ensures the client is reused across requests
 * - Reduces initialization overhead on warm containers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Singleton instance - created once at module load
// This is reused across all requests in the same container
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client singleton
 * This ensures the client is initialized only once and reused
 */
function getSupabaseClient(): SupabaseClient | null {
  // Return existing instance if already created (warm container)
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Create new instance only if configuration is available
  if (supabaseUrl && supabaseServiceKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false, // Not needed for service role key
        persistSession: false,   // Don't persist sessions in serverless
      },
      // Optimize for serverless: disable realtime and auto-token refresh
      realtime: {
        params: {
          eventsPerSecond: 2, // Lower event rate for serverless
        },
      },
    });
    return supabaseInstance;
  } else {
    console.warn('⚠️  Supabase configuration missing. User creation via Supabase Auth will not work.');
    console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    return null;
  }
}

// Initialize the singleton immediately at module load
// This happens once per container, reducing cold-start time
const supabase = getSupabaseClient();

export { supabase };
export type { SupabaseClient };

