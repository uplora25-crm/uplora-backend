/**
 * Uplora CRM Backend - Local Development Server Entry Point
 * 
 * This file starts the HTTP server for local development.
 * For Vercel serverless deployment, see api/index.ts
 */

import app from './app';

// Set the port to 4000 as specified
const PORT = process.env.PORT || 4000;

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Uplora CRM Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Leads API: http://localhost:${PORT}/api/leads`);
  console.log(`📈 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
  console.log(`💼 Deals API: http://localhost:${PORT}/api/deals/pipeline`);
  console.log(`📝 Tasks API: http://localhost:${PORT}/api/tasks/my`);
  console.log(`📞 Calls API: http://localhost:${PORT}/api/calls`);
  console.log(`📍 Visits API: http://localhost:${PORT}/api/visits`);
  console.log(`👥 Clients API: http://localhost:${PORT}/api/clients`);
  console.log(`📊 Activities API: http://localhost:${PORT}/api/activities`);
  console.log(`👨‍👩‍👧‍👦 Team API: http://localhost:${PORT}/api/team`);
  console.log(`🔐 Credentials API: http://localhost:${PORT}/api/clients/:clientId/credentials`);
  console.log(`📁 Files API: http://localhost:${PORT}/api/clients/:clientId/files`);
});

