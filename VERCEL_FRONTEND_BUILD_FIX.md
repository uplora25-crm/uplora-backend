# Fix: Vercel Building Frontend Instead of Backend

## 🚨 Problem

Vercel is building the **frontend** instead of the **backend**. The build logs show:
```
Running "install" command: `cd frontend && npm install`...
> uplora-crm-frontend@1.0.0 build
```

This happens because Vercel is detecting the **root `vercel.json`** which is configured for the frontend.

## ✅ Solution: Set Root Directory in Vercel Dashboard

You need to configure Vercel to use the `backend` directory as the root:

### Steps:

1. **Go to Vercel Dashboard**
   - Open your backend project (not the frontend project)
   - If you don't have a separate backend project, create one

2. **Navigate to Settings → General**
   - Scroll down to **Root Directory**
   
3. **Set Root Directory**
   - Click **Edit**
   - Enter: `backend`
   - Click **Save**

4. **Clear Build & Output Settings**
   - Go to **Settings → General**
   - Under **Build & Development Settings**:
     - **Framework Preset**: Leave empty or set to "Other"
     - **Build Command**: Leave empty (Vercel will auto-detect)
     - **Output Directory**: Leave empty
     - **Install Command**: Leave empty
   - Click **Save**

5. **Verify Environment Variables**
   - Go to **Settings → Environment Variables**
   - Ensure all backend variables are set:
     - `DATABASE_URL`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `FRONTEND_URL`

6. **Redeploy**
   - Go to **Deployments**
   - Click **Redeploy** on the latest deployment
   - Or push a new commit

## ✅ Expected Result

After setting Root Directory to `backend`, the build logs should show:
- Installing backend dependencies: `npm install` (from `backend/` directory)
- Building backend TypeScript: `npm run build` (runs `tsc`)
- **NOT** building the frontend

## 🔍 Alternative: Separate Projects

If you want both frontend and backend on Vercel:
- **Frontend Project**: Root directory = `.` (or leave empty), uses root `vercel.json`
- **Backend Project**: Root directory = `backend`, uses `backend/vercel.json`

This way, each project deploys independently.

