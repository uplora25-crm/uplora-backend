/**
 * Team Service
 *
 * This service handles database operations for team members (users).
 */

import pool from '../lib/db';
import { supabase } from '../lib/supabase';

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapTeamMemberRow(row: any): TeamMember {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    is_active: row.is_active,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

/**
 * List all team members
 * Fetches users from Supabase Auth and syncs with database
 */
export async function getAllTeamMembers(): Promise<TeamMember[]> {
  // First, get all users from database
  const dbQuery = `
    SELECT *
    FROM users
    ORDER BY created_at DESC
  `;
  const dbResult = await pool.query(dbQuery);
  const dbUsers: TeamMember[] = dbResult.rows.map(mapTeamMemberRow);
  const dbUsersByEmail = new Map<string, TeamMember>(dbUsers.map(u => [u.email.toLowerCase(), u]));

  // If Supabase is configured, fetch users from Supabase Auth and sync
  if (supabase) {
    try {
      const adminAuth = (supabase.auth as any).admin;
      if (adminAuth) {
        // Fetch all users from Supabase Auth (with pagination)
        // Note: listUsers might be on adminAuth directly or accessed differently
        let page = 1;
        let hasMore = true;
        const supabaseUsers: any[] = [];

        while (hasMore) {
          // Use listUsers method from Supabase admin API
          const { data, error } = await adminAuth.listUsers({
            page,
            perPage: 1000, // Max per page
          });

          if (error) {
            console.error('Error fetching users from Supabase Auth:', error);
            break;
          }

          if (data && data.users) {
            supabaseUsers.push(...data.users);
            hasMore = data.users.length === 1000; // If we got max, there might be more
            page++;
          } else {
            hasMore = false;
          }
        }

        // Sync Supabase Auth users with database
        for (const authUser of supabaseUsers) {
          const email = authUser.email?.toLowerCase();
          if (!email) continue;

          const existingDbUser = dbUsersByEmail.get(email);
          
          if (!existingDbUser) {
            // User exists in Supabase Auth but not in database - create it
            try {
              const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
              const role = authUser.user_metadata?.role || 'user';
              
              const insertQuery = `
                INSERT INTO users (email, name, role, password_hash, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
              `;
              
              const insertResult = await pool.query(insertQuery, [
                authUser.email,
                name,
                role,
                null, // password_hash - not needed since we use Supabase Auth
                true, // is_active
                new Date(authUser.created_at || Date.now()).toISOString(),
                new Date(authUser.updated_at || Date.now()).toISOString(),
              ]);

              const newUser = mapTeamMemberRow(insertResult.rows[0]);
              dbUsers.push(newUser);
              dbUsersByEmail.set(email, newUser);
            } catch (insertError: any) {
              // If insert fails (e.g., duplicate email), try to update existing
              console.error(`Failed to insert user ${email}:`, insertError.message);
              
              // Try to update if user exists but wasn't in our initial query
              try {
                const updateQuery = `
                  UPDATE users
                  SET name = COALESCE($1, name),
                      role = COALESCE($2, role),
                      updated_at = NOW()
                  WHERE email = $3
                  RETURNING *
                `;
                const updateResult = await pool.query(updateQuery, [
                  authUser.user_metadata?.name || null,
                  authUser.user_metadata?.role || null,
                  authUser.email,
                ]);
                
                if (updateResult.rows.length > 0) {
                  const updatedUser = mapTeamMemberRow(updateResult.rows[0]);
                  const index = dbUsers.findIndex(u => u.email.toLowerCase() === email);
                  if (index >= 0) {
                    dbUsers[index] = updatedUser;
                  } else {
                    dbUsers.push(updatedUser);
                  }
                  dbUsersByEmail.set(email, updatedUser);
                }
              } catch (updateError) {
                console.error(`Failed to update user ${email}:`, updateError);
              }
            }
          } else {
            // User exists in both - update metadata if needed
            const authName = authUser.user_metadata?.name;
            const authRole = authUser.user_metadata?.role;
            
            if (authName && authName !== existingDbUser.name) {
              try {
                const updateQuery = `
                  UPDATE users
                  SET name = $1, updated_at = NOW()
                  WHERE email = $2
                  RETURNING *
                `;
                const updateResult = await pool.query(updateQuery, [authName, authUser.email]);
                if (updateResult.rows.length > 0) {
                  const updatedUser = mapTeamMemberRow(updateResult.rows[0]);
                  const index = dbUsers.findIndex(u => u.id === existingDbUser.id);
                  if (index >= 0) {
                    dbUsers[index] = updatedUser;
                  }
                }
              } catch (updateError) {
                console.error(`Failed to update name for user ${email}:`, updateError);
              }
            }
            
            if (authRole && authRole !== existingDbUser.role) {
              try {
                const updateQuery = `
                  UPDATE users
                  SET role = $1, updated_at = NOW()
                  WHERE email = $2
                  RETURNING *
                `;
                const updateResult = await pool.query(updateQuery, [authRole, authUser.email]);
                if (updateResult.rows.length > 0) {
                  const updatedUser = mapTeamMemberRow(updateResult.rows[0]);
                  const index = dbUsers.findIndex(u => u.id === existingDbUser.id);
                  if (index >= 0) {
                    dbUsers[index] = updatedUser;
                  }
                }
              } catch (updateError) {
                console.error(`Failed to update role for user ${email}:`, updateError);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error syncing Supabase Auth users:', error);
      // Continue with database users even if Supabase sync fails
    }
  }

  // Return all users sorted by created_at
  return dbUsers.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Get a single team member by ID
 */
export async function getTeamMemberById(id: number): Promise<TeamMember | null> {
  const query = `SELECT * FROM users WHERE id = $1`;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapTeamMemberRow(result.rows[0]);
}

/**
 * Get a team member by email
 */
export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const query = `SELECT * FROM users WHERE email = $1`;

  const result = await pool.query(query, [email]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapTeamMemberRow(result.rows[0]);
}

/**
 * Create a new team member
 * Creates user in Supabase Auth and then in database
 */
export async function createTeamMember(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
  is_active?: boolean;
}): Promise<TeamMember> {
  // First, create user in Supabase Auth with email and password
  // Using admin API which is available with service role key
  if (!supabase) {
    throw new Error(
      'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file to create users.'
    );
  }

  try {
    // Access admin API - available when using service role key
    // The admin API is available on the auth object when using service role key
    const adminAuth = (supabase as any).auth.admin;
    
    if (!adminAuth || typeof adminAuth.createUser !== 'function') {
      console.error('Admin API check:', {
        hasAdmin: !!adminAuth,
        hasCreateUser: adminAuth && typeof adminAuth.createUser === 'function',
        supabaseAuth: !!supabase.auth,
      });
      throw new Error('Supabase Admin API is not available. Please ensure you are using the service role key (not anon key).');
    }

    const { data: authUser, error: authError } = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email so user can login immediately
      user_metadata: {
        name: data.name,
        role: data.role || 'user', // Store in user_metadata so frontend can access it
      },
    });

    if (authError) {
      console.error('Supabase Auth Error Details:', {
        message: authError.message,
        status: authError.status,
        error: authError,
      });
      throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
    }

    if (!authUser || !authUser.user) {
      console.error('No user returned from Supabase:', { authUser });
      throw new Error('Failed to create user in Supabase Auth: No user returned');
    }

    console.log('✅ User created in Supabase Auth:', authUser.user.id);
  } catch (error: any) {
    console.error('Error in Supabase user creation:', {
      message: error.message,
      stack: error.stack,
      error: error,
    });
    throw error;
  }

  // Then create user record in database
  // Note: password_hash is not needed since we're using Supabase Auth
  // The column is now nullable, so we can set it to NULL
  const query = `
    INSERT INTO users (email, name, role, password_hash, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.email,
    data.name,
    data.role || 'user',
    null, // password_hash - not needed since we use Supabase Auth
    data.is_active !== undefined ? data.is_active : true,
  ]);

  return mapTeamMemberRow(result.rows[0]);
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  id: number,
  data: {
    name?: string;
    role?: string;
    is_active?: boolean;
  }
): Promise<TeamMember | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(data.role);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(data.is_active);
  }

  if (updates.length === 0) {
    return getTeamMemberById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  await pool.query(query, values);
  return getTeamMemberById(id);
}

/**
 * Delete a team member
 * Deletes from both Supabase Auth and database
 */
export async function deleteTeamMember(id: number): Promise<boolean> {
  // First, get the user's email from database
  const getUserQuery = `SELECT email FROM users WHERE id = $1`;
  const getUserResult = await pool.query(getUserQuery, [id]);
  
  if (getUserResult.rows.length === 0) {
    return false; // User not found
  }

  const userEmail = getUserResult.rows[0].email;

  // Delete from Supabase Auth if configured
  if (supabase && userEmail) {
    try {
      const adminAuth = (supabase.auth as any).admin;
      if (adminAuth) {
        // First, find the user in Supabase Auth by email
        const { data: authUsers, error: listError } = await adminAuth.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (!listError && authUsers && authUsers.users) {
          const authUser = authUsers.users.find((u: any) => 
            u.email?.toLowerCase() === userEmail.toLowerCase()
          );

          if (authUser && authUser.id) {
            // Delete from Supabase Auth
            const { error: deleteError } = await adminAuth.deleteUser(authUser.id);
            if (deleteError) {
              console.error('Error deleting user from Supabase Auth:', deleteError);
              // Continue with database deletion even if Supabase deletion fails
            } else {
              console.log(`✅ User ${userEmail} deleted from Supabase Auth`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error during Supabase Auth deletion:', error);
      // Continue with database deletion even if Supabase deletion fails
    }
  }

  // Delete from database
  const deleteQuery = `DELETE FROM users WHERE id = $1`;
  const deleteResult = await pool.query(deleteQuery, [id]);
  return deleteResult.rowCount !== null && deleteResult.rowCount > 0;
}

