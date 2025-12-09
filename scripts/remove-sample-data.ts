/**
 * Remove Sample Data Script
 * 
 * This script helps remove sample/test data from the Uplora CRM database.
 * 
 * Usage:
 *   npx ts-node scripts/remove-sample-data.ts
 * 
 * WARNING: This will permanently delete data. Make sure to backup your database first!
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

interface SampleDataCounts {
  contacts: number;
  leads: number;
  coldCalls: number;
  onsiteVisits: number;
  activities: number;
  tasks: number;
  deals: number;
  sampleCompanies: number;
}

async function getSampleDataCounts(client: Client): Promise<SampleDataCounts> {
  // Count sample companies
  const sampleCompanyNames = [
    'Acme Corporation',
    'TechStart Solutions',
    'Global Dynamics Inc.',
    'Innovation Labs',
    'Digital Ventures',
    'Cloud Systems Ltd.',
    'Enterprise Solutions',
    'Future Technologies',
    'Smart Business Group',
    'Advanced Systems Co.',
    'Prime Industries',
    'Elite Services Inc.',
    'Strategic Partners LLC',
    'NextGen Technologies',
    'Modern Solutions Group',
    'ProActive Industries',
    'Visionary Enterprises',
    'Excellence Corp.',
    'Summit Business Solutions',
    'Pinnacle Technologies',
  ];

  const sampleCompaniesQuery = `
    SELECT COUNT(*) as count
    FROM contacts
    WHERE company = ANY($1::text[])
  `;
  const sampleCompaniesResult = await client.query(sampleCompaniesQuery, [sampleCompanyNames]);
  const sampleCompanies = parseInt(sampleCompaniesResult.rows[0].count);

  // Get all counts
  const [contacts, leads, coldCalls, onsiteVisits, activities, tasks, deals] = await Promise.all([
    client.query('SELECT COUNT(*) as count FROM contacts'),
    client.query('SELECT COUNT(*) as count FROM leads'),
    client.query('SELECT COUNT(*) as count FROM cold_calls'),
    client.query('SELECT COUNT(*) as count FROM onsite_visits'),
    client.query('SELECT COUNT(*) as count FROM activities'),
    client.query('SELECT COUNT(*) as count FROM team_tasks'),
    client.query('SELECT COUNT(*) as count FROM deals'),
  ]);

  return {
    contacts: parseInt(contacts.rows[0].count),
    leads: parseInt(leads.rows[0].count),
    coldCalls: parseInt(coldCalls.rows[0].count),
    onsiteVisits: parseInt(onsiteVisits.rows[0].count),
    activities: parseInt(activities.rows[0].count),
    tasks: parseInt(tasks.rows[0].count),
    deals: parseInt(deals.rows[0].count),
    sampleCompanies,
  };
}

async function removeAllData(client: Client): Promise<void> {
  console.log('🗑️  Removing all data from database...\n');

  try {
    await client.query('BEGIN');

    // Delete in order to respect foreign key constraints
    console.log('  - Deleting task attachments...');
    await client.query('DELETE FROM task_attachments');

    console.log('  - Deleting activities...');
    await client.query('DELETE FROM activities');

    console.log('  - Deleting notifications...');
    await client.query('DELETE FROM notifications');

    console.log('  - Deleting chat messages...');
    await client.query('DELETE FROM chat_messages');

    console.log('  - Deleting cold calls...');
    await client.query('DELETE FROM cold_calls');

    console.log('  - Deleting onsite visits...');
    await client.query('DELETE FROM onsite_visits');

    console.log('  - Deleting deals...');
    await client.query('DELETE FROM deals');

    console.log('  - Deleting pipeline entries...');
    await client.query('DELETE FROM pipeline');

    console.log('  - Deleting team tasks...');
    await client.query('DELETE FROM team_tasks');

    console.log('  - Deleting client project files...');
    await client.query('DELETE FROM client_project_files');

    console.log('  - Deleting project credentials...');
    await client.query('DELETE FROM project_credentials');

    // Clear lead_id references in contacts first (to avoid foreign key constraint)
    console.log('  - Clearing lead_id references in contacts...');
    await client.query('UPDATE contacts SET lead_id = NULL, updated_at = NOW() WHERE lead_id IS NOT NULL');

    console.log('  - Deleting leads...');
    await client.query('DELETE FROM leads');

    console.log('  - Deleting contacts...');
    await client.query('DELETE FROM contacts');

    console.log('  - Deleting automation runs...');
    await client.query('DELETE FROM automation_runs');

    await client.query('COMMIT');
    console.log('\n✅ All data removed successfully!\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error removing data:', error.message);
    throw error;
  }
}

async function removeSampleDataOnly(client: Client): Promise<void> {
  console.log('🗑️  Removing only sample data...\n');

  const sampleCompanyNames = [
    'Acme Corporation',
    'TechStart Solutions',
    'Global Dynamics Inc.',
    'Innovation Labs',
    'Digital Ventures',
    'Cloud Systems Ltd.',
    'Enterprise Solutions',
    'Future Technologies',
    'Smart Business Group',
    'Advanced Systems Co.',
    'Prime Industries',
    'Elite Services Inc.',
    'Strategic Partners LLC',
    'NextGen Technologies',
    'Modern Solutions Group',
    'ProActive Industries',
    'Visionary Enterprises',
    'Excellence Corp.',
    'Summit Business Solutions',
    'Pinnacle Technologies',
  ];

  try {
    await client.query('BEGIN');

    // First, clear ALL lead_id references in contacts that point to leads we're about to delete
    // This is necessary because contacts.lead_id has a foreign key to leads.id
    console.log('  - Clearing lead_id references in contacts...');
    const clearLeadIdQuery = `
      UPDATE contacts
      SET lead_id = NULL, updated_at = NOW()
      WHERE lead_id IN (
        SELECT id FROM leads
        WHERE contact_id IN (
          SELECT id FROM contacts
          WHERE company = ANY($1::text[])
        )
      )
    `;
    const clearResult = await client.query(clearLeadIdQuery, [sampleCompanyNames]);
    console.log(`    Cleared ${clearResult.rowCount} lead_id references`);

    // Delete leads with sample company names
    console.log('  - Deleting leads with sample company names...');
    const deleteLeadsQuery = `
      DELETE FROM leads
      WHERE contact_id IN (
        SELECT id FROM contacts
        WHERE company = ANY($1::text[])
      )
    `;
    const leadsResult = await client.query(deleteLeadsQuery, [sampleCompanyNames]);
    console.log(`    Deleted ${leadsResult.rowCount} leads`);

    // Delete contacts with sample company names
    console.log('  - Deleting contacts with sample company names...');
    const deleteContactsQuery = `
      DELETE FROM contacts
      WHERE company = ANY($1::text[])
    `;
    const contactsResult = await client.query(deleteContactsQuery, [sampleCompanyNames]);
    console.log(`    Deleted ${contactsResult.rowCount} contacts`);

    // Remove sample verticals
    console.log('  - Clearing sample verticals...');
    const updateVerticalsQuery = `
      UPDATE leads
      SET verticals = NULL, updated_at = NOW()
      WHERE verticals IS NOT NULL
    `;
    const verticalsResult = await client.query(updateVerticalsQuery);
    console.log(`    Updated ${verticalsResult.rowCount} leads`);

    await client.query('COMMIT');
    console.log('\n✅ Sample data removed successfully!\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error removing sample data:', error.message);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Remove Sample Data from Uplora CRM Database');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check for database connection
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Get current data counts
    console.log('📊 Analyzing database...\n');
    const counts = await getSampleDataCounts(client);
    
    console.log('Current Database Contents:');
    console.log('─────────────────────────────');
    console.log(`  Contacts:           ${counts.contacts}`);
    console.log(`  Leads:              ${counts.leads}`);
    console.log(`  Cold Calls:         ${counts.coldCalls}`);
    console.log(`  Onsite Visits:      ${counts.onsiteVisits}`);
    console.log(`  Activities:         ${counts.activities}`);
    console.log(`  Tasks:              ${counts.tasks}`);
    console.log(`  Deals:              ${counts.deals}`);
    console.log(`  Sample Companies:   ${counts.sampleCompanies}\n`);

    if (counts.contacts === 0 && counts.leads === 0) {
      console.log('ℹ️  Database appears to be empty already.\n');
      await client.end();
      rl.close();
      return;
    }

    // Ask user what they want to do
    console.log('⚠️  WARNING: This will permanently delete data!');
    console.log('   Make sure you have a database backup before proceeding.\n');
    
    const action = await question(
      'What would you like to do?\n' +
      '  1. Remove ALL data (empty database)\n' +
      '  2. Remove only sample data (companies with sample names)\n' +
      '  3. Cancel\n' +
      'Enter choice (1-3): '
    );

    if (action === '3' || action.toLowerCase() === 'cancel') {
      console.log('\n❌ Operation cancelled.\n');
      await client.end();
      rl.close();
      return;
    }

    // Confirm action
    const confirmMessage = action === '1' 
      ? 'Are you SURE you want to delete ALL data? Type "DELETE ALL" to confirm: '
      : 'Are you sure you want to remove sample data? Type "YES" to confirm: ';
    
    const confirmation = await question(`\n${confirmMessage}`);

    if (action === '1' && confirmation !== 'DELETE ALL') {
      console.log('\n❌ Confirmation failed. Operation cancelled.\n');
      await client.end();
      rl.close();
      return;
    }

    if (action === '2' && confirmation !== 'YES') {
      console.log('\n❌ Confirmation failed. Operation cancelled.\n');
      await client.end();
      rl.close();
      return;
    }

    // Execute deletion
    if (action === '1') {
      await removeAllData(client);
    } else if (action === '2') {
      await removeSampleDataOnly(client);
    }

    // Show final counts
    console.log('📊 Final Database Contents:');
    console.log('─────────────────────────────');
    const finalCounts = await getSampleDataCounts(client);
    console.log(`  Contacts:           ${finalCounts.contacts}`);
    console.log(`  Leads:              ${finalCounts.leads}`);
    console.log(`  Cold Calls:         ${finalCounts.coldCalls}`);
    console.log(`  Onsite Visits:      ${finalCounts.onsiteVisits}`);
    console.log(`  Activities:         ${finalCounts.activities}`);
    console.log(`  Tasks:              ${finalCounts.tasks}`);
    console.log(`  Deals:              ${finalCounts.deals}\n`);

    console.log('✅ Operation completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
