# 504 Gateway Timeout Error - Fix Applied

## Problem
- `/api/health` endpoint works ✅
- All other endpoints return 504 Gateway Timeout ❌

## Root Cause

The 504 errors were caused by **database connection timeouts** on endpoints that require database access:

1. **Health endpoint works** because it doesn't hit the database
2. **Other endpoints fail** because:
   - First database connection in a cold start is slow (3-5 seconds)
   - Original `connectionTimeoutMillis: 3000` was too short
   - `pool.connect()` calls could hang if connection failed
   - No query-level timeout protection

## Fixes Applied

### 1. Increased Connection Timeout
**File**: `backend/src/lib/db.ts`

Changed `connectionTimeoutMillis` from `3000` (3 seconds) to `10000` (10 seconds):
```typescript
connectionTimeoutMillis: 10000, // Increased for cold starts
```

**Why**: First database connection in a cold container needs more time for:
- DNS lookup
- TCP handshake  
- SSL/TLS negotiation
- Authentication

### 2. Added Query-Level Timeout
**File**: `backend/src/lib/db.ts`

Added `statement_timeout` on each connection:
```typescript
pool.on('connect', async (client: any) => {
  await client.query("SET timezone = 'UTC'");
  await client.query("SET statement_timeout = 25000"); // 25 seconds
});
```

**Why**: Prevents individual queries from running longer than 25 seconds (must be < function timeout of 30s).

### 3. Added Timeout Protection for pool.connect()
**File**: `backend/src/lib/db.ts`

Created `getPoolClient()` helper function:
```typescript
export async function getPoolClient(timeoutMs: number = 8000): Promise<any> {
  return Promise.race([
    pool.connect(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Database connection timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<any>;
}
```

**Why**: Prevents `pool.connect()` from hanging indefinitely if the pool is exhausted or connection fails.

### 4. Updated Service Layer
**File**: `backend/src/services/leads.service.ts`

Replaced direct `pool.connect()` calls with `getPoolClient()`:
```typescript
// Before
const client = await pool.connect();

// After  
const client = await getPoolClient(8000);
```

**Why**: Uses the timeout-protected connection method.

## Expected Results

After deploying these changes:

1. ✅ **Connection timeout increased** - More time for first connection in cold starts
2. ✅ **Query timeout protection** - Queries can't run longer than 25 seconds
3. ✅ **Connection wrapper** - Prevents hanging on `pool.connect()` calls
4. ✅ **Better error messages** - Timeout errors are clearer

## Testing

Test these endpoints after deployment:

1. **Health check** (should still work):
   ```
   GET /api/health
   ```

2. **Leads endpoint** (should now work):
   ```
   GET /api/leads
   ```

3. **Dashboard endpoint** (should now work):
   ```
   GET /api/dashboard/summary
   ```

## If Issues Persist

If you still see 504 errors:

1. **Check Vercel logs** for specific error messages
2. **Verify DATABASE_URL** is set correctly in Vercel environment variables
3. **Check database connectivity** - Ensure Supabase database is accessible
4. **Monitor execution times** in Vercel dashboard
5. **Consider increasing maxDuration** further if needed (currently 30s)

## Additional Optimizations (Future)

If you continue to have timeout issues:

1. **Add response caching** for read-heavy endpoints (dashboard, leads list)
2. **Optimize database queries** - Add indexes, use materialized views
3. **Implement connection warming** - Keep connections alive between requests
4. **Use connection pooling service** - Consider PgBouncer or Supabase connection pooling

## Related Files Changed

- `backend/src/lib/db.ts` - Database connection configuration
- `backend/src/services/leads.service.ts` - Updated to use timeout-protected connections
- `backend/vercel.json` - Already has `maxDuration: 30` (from previous fix)

