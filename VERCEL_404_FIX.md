# Fix 404 Error on Vercel Deployment

## 🚨 Problem

You're getting `404: NOT_FOUND` even though the deployment succeeded.

This usually means:
1. The serverless function isn't being found
2. The routing configuration is incorrect
3. The function path doesn't match Vercel's expectations

---

## ✅ Solution 1: Simplified vercel.json (Recommended)

Replace your `backend/vercel.json` with this simpler version:

```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "@vercel/node@3"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.ts"
    }
  ]
}
```

This uses Vercel's modern configuration format.

---

## ✅ Solution 2: Keep Current Format but Fix Path

If Solution 1 doesn't work, try this updated version:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node@3"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

Key change: Added `/` prefix to destination path.

---

## ✅ Solution 3: Verify File Structure

Make sure your file structure matches:

```
backend/
├── api/
│   └── index.ts          ← Must exist!
├── src/
│   └── app.ts
├── vercel.json           ← Configuration
└── package.json
```

---

## 🔍 Debugging Steps

1. **Check Vercel Deployment Logs:**
   - Go to your project → Deployments → Click latest deployment
   - Check Function logs for errors
   - Look for compilation errors

2. **Verify Function is Created:**
   - Go to Settings → Functions
   - You should see `api/index.ts` listed
   - If not, the function isn't being detected

3. **Test the Function Directly:**
   Try accessing:
   ```
   https://your-backend.vercel.app/api/index
   ```
   If this works but `/api/health` doesn't, it's a routing issue.

4. **Check Root Directory:**
   - Settings → General → Root Directory should be `backend`
   - Build Command should be empty (or `npm install && npm run build`)

---

## 🧪 Test Endpoints

After fixing, test these URLs:

1. **Root:**
   ```
   https://your-backend.vercel.app/
   ```
   Should return: `{"message":"Welcome to Uplora CRM API",...}`

2. **Health Check:**
   ```
   https://your-backend.vercel.app/api/health
   ```
   Should return: `{"status":"ok"}`

3. **API Endpoint:**
   ```
   https://your-backend.vercel.app/api/leads
   ```
   Should return leads data (or error with proper status code, not 404)

---

## ⚠️ Common Issues

### Issue 1: Function Not Detected
**Symptom:** No functions listed in Vercel dashboard
**Solution:** 
- Verify `backend/api/index.ts` exists
- Check Root Directory is set to `backend`
- Ensure file exports default handler

### Issue 2: Wrong Path in vercel.json
**Symptom:** 404 on all routes
**Solution:**
- Use `/api/index.ts` (with leading slash) in routes destination
- Or use `rewrites` instead of `routes`

### Issue 3: Build Errors
**Symptom:** Deployment succeeds but function doesn't work
**Solution:**
- Check deployment logs for TypeScript errors
- Verify all dependencies are in `dependencies` (not `devDependencies`)
- Ensure `@vercel/node` handles TypeScript correctly

---

## 📝 Updated vercel.json

I've updated your `backend/vercel.json` file. Try deploying again!

If it still doesn't work, check the Vercel function logs for specific error messages.

