# Quick Guide: Remove Sample Data

## ⚠️ BACKUP YOUR DATABASE FIRST!

## Quick Start

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Run the script:**
   ```bash
   npm run remove-sample-data
   ```
   
   OR
   
   ```bash
   npx ts-node scripts/remove-sample-data.ts
   ```

3. **Follow the prompts:**
   - Choose option 1 to remove ALL data
   - Choose option 2 to remove only sample data
   - Confirm your choice

## What Gets Removed (Option 2 - Sample Data Only)

- Contacts with sample company names (20 sample companies)
- Leads linked to those contacts
- Sample vertical values (set to NULL)

## What Gets Removed (Option 1 - All Data)

- **Everything** - Complete database wipe
- All contacts, leads, calls, visits, tasks, deals, etc.

## Requirements

Make sure you have `DATABASE_URL` or `SUPABASE_DB_URL` in your `.env` file.

See `REMOVE_SAMPLE_DATA.md` for detailed documentation.
