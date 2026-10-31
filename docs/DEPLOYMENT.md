# Deploying Nexus to Vercel with Neon Database

This guide explains how to deploy **Nexus** to [Vercel](https://vercel.com) using [Neon Serverless PostgreSQL](https://neon.tech) for persistent cloud storage.

---

## 🚀 Quick Deployment Guide

### Option 1: Native Vercel Integration (Recommended)

1. **Push your repository to GitHub**:
   Ensure your code is pushed to your GitHub repository (e.g., `jgomez5437/km_app`).

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository (`km_app`) and click **Import**.
   - Keep default build settings (`Framework Preset: Next.js`).

3. **Add Neon Database via Vercel Marketplace**:
   - In your Vercel Project Dashboard, navigate to the **Storage** tab.
   - Click **Connect Store** and choose **Neon (Serverless Postgres)**.
   - Follow the prompts to create or link a database.
   - Vercel automatically configures the `DATABASE_URL` environment variable for Production, Preview, and Development!

4. **Initialize the Database Schema**:
   In your local terminal (connected to your project):
   ```bash
   # Set your DATABASE_URL from Neon or pull from Vercel:
   npx vercel env pull .env.local

   # Push the schema to Neon:
   npm run db:push
   ```

5. **Deploy**:
   Click **Redeploy** on Vercel or trigger a new git push. Your Nexus instance is now live with real-time cloud synchronization!

---

### Option 2: Connect Existing Neon Project

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Copy your connection string (`postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require`).
3. In **Vercel Project Settings > Environment Variables**, add:
   - **Key**: `DATABASE_URL`
   - **Value**: `<your-neon-connection-string>`
4. Apply database schema:
   ```bash
   DATABASE_URL="<your-neon-connection-string>" npm run db:push
   ```

---

## 🛠️ Local Development with Neon

To test against your Neon database locally:

1. Create `.env.local` in the project root:
   ```env
   DATABASE_URL=postgresql://neondb_owner:your_password@ep-...neon.tech/neondb?sslmode=require
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Look for the green **Cloud Synced** badge in the top right header!

---

## 🛡️ Offline-First Fallback
If `DATABASE_URL` is not provided (or during network outages), Nexus automatically operates in **Local Vault** mode using browser IndexedDB, so your writing is never blocked.
