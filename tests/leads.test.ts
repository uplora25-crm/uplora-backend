/**
 * Leads API Tests
 * 
 * This file contains automated tests for the leads API endpoints.
 * Tests ensure that our API works correctly before deploying to production.
 * 
 * We use Jest (testing framework) and Supertest (HTTP testing library) to:
 * - Make HTTP requests to our API
 * - Check that responses have the correct status codes
 * - Verify that data is returned in the expected format
 */

import request from 'supertest';
import app from '../src/app';

/**
 * Test suite for the Leads API
 * 'describe' groups related tests together
 */
describe('Leads API', () => {
  /**
   * Test: POST /api/leads with valid data should return 201
   * 
   * This test:
   * 1. Sends a POST request to /api/leads with valid lead data
   * 2. Expects a 201 (Created) status code
   * 3. Verifies the response contains the created lead
   */
  it('should create a new lead with valid data and return 201', async () => {
    // Sample lead data that matches our validation schema
    const leadData = {
      contact: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-9999',
      },
      source: 'website',
      stage: 'new',
    };

    // Make a POST request to /api/leads
    const response = await request(app)
      .post('/api/leads')
      .send(leadData) // Send the JSON data in the request body
      .expect(201); // Expect HTTP status code 201 (Created)

    // Verify the response structure
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('contact');
    expect(response.body.data.contact).toHaveProperty('name', 'Test User');
    expect(response.body.data.contact).toHaveProperty('email', 'test@example.com');
  });

  /**
   * Test: GET /api/leads should return an array with at least 1 lead
   * 
   * This test:
   * 1. First creates a lead (so we know there's at least one)
   * 2. Sends a GET request to /api/leads
   * 3. Expects a 200 (OK) status code
   * 4. Verifies the response is an array with at least one lead
   */
  it('should return an array with at least 1 lead when calling GET /api/leads', async () => {
    // First, create a lead to ensure we have at least one in the database
    const leadData = {
      contact: {
        name: 'Another Test User',
        email: 'another@example.com',
        phone: '+1-555-8888',
      },
      source: 'referral',
      stage: 'qualified',
    };

    // Create the lead
    await request(app)
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    // Now fetch all leads
    const response = await request(app)
      .get('/api/leads')
      .expect(200); // Expect HTTP status code 200 (OK)

    // Verify the response structure
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1); // At least 1 lead

    // Verify the first lead has the expected structure
    if (response.body.data.length > 0) {
      const lead = response.body.data[0];
      expect(lead).toHaveProperty('id');
      expect(lead).toHaveProperty('contact');
    }
  });

  /**
   * Test: POST /api/leads with invalid data should return 400
   * 
   * This test ensures our validation works correctly by sending invalid data
   */
  it('should return 400 when creating a lead with invalid data', async () => {
    const invalidLeadData = {
      // Missing required 'contact' field
      source: 'website',
    };

    const response = await request(app)
      .post('/api/leads')
      .send(invalidLeadData)
      .expect(400); // Expect HTTP status code 400 (Bad Request)

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errors');
  });

  /**
   * Test: GET /api/leads/:id returns 404 for invalid id
   * 
   * This test ensures that requesting a non-existent lead returns a proper 404 error
   */
  it('should return 404 when requesting a lead that does not exist', async () => {
    // Use a very large ID that definitely doesn't exist
    const invalidId = 999999;

    const response = await request(app)
      .get(`/api/leads/${invalidId}`)
      .expect(404); // Expect HTTP status code 404 (Not Found)

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });

  /**
   * Test: POST /api/leads/:id/activities creates an activity and returns 201
   * 
   * This test:
   * 1. First creates a lead to get a valid lead ID
   * 2. Sends a POST request to create an activity for that lead
   * 3. Expects a 201 (Created) status code
   * 4. Verifies the response contains the created activity
   */
  it('should create an activity for a lead and return 201', async () => {
    // Step 1: Create a lead first so we have a valid lead ID
    const leadData = {
      contact: {
        name: 'Activity Test Lead',
        email: 'activity@example.com',
        phone: '+1-555-7777',
      },
      source: 'website',
      stage: 'new',
    };

    const leadResponse = await request(app)
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    const leadId = leadResponse.body.data.id;

    // Step 2: Create an activity for this lead
    const activityData = {
      activityType: 'call',
      description: 'Initial call to discuss requirements',
    };

    const activityResponse = await request(app)
      .post(`/api/leads/${leadId}/activities`)
      .send(activityData)
      .expect(201); // Expect HTTP status code 201 (Created)

    // Step 3: Verify the response structure
    expect(activityResponse.body).toHaveProperty('success', true);
    expect(activityResponse.body).toHaveProperty('data');
    expect(activityResponse.body.data).toHaveProperty('id');
    expect(activityResponse.body.data).toHaveProperty('lead_id', leadId);
    expect(activityResponse.body.data).toHaveProperty('activity_type', 'call');
    expect(activityResponse.body.data).toHaveProperty('description', 'Initial call to discuss requirements');
  });

  /**
   * Test: POST /api/leads/:id/activities with invalid data should return 400
   * 
   * This test ensures validation works for activity creation
   */
  it('should return 400 when creating an activity with invalid data', async () => {
    // First create a lead
    const leadData = {
      contact: {
        name: 'Validation Test Lead',
        email: 'validation@example.com',
        phone: '+1-555-6666',
      },
      source: 'website',
      stage: 'new',
    };

    const leadResponse = await request(app)
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    const leadId = leadResponse.body.data.id;

    // Try to create an activity with missing required field (activityType)
    const invalidActivityData = {
      description: 'This should fail because activityType is missing',
    };

    const response = await request(app)
      .post(`/api/leads/${leadId}/activities`)
      .send(invalidActivityData)
      .expect(400); // Expect HTTP status code 400 (Bad Request)

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errors');
  });

  /**
   * Test: POST /api/leads/:id/cold-calls creates a cold call and returns 201
   * 
   * This test:
   * 1. First creates a lead to get a valid lead ID
   * 2. Sends a POST request to create a cold call for that lead
   * 3. Expects a 201 (Created) status code
   * 4. Verifies the response contains the created cold call
   */
  it('should create a cold call for a lead and return 201', async () => {
    // Step 1: Create a lead first so we have a valid lead ID
    const leadData = {
      contact: {
        name: 'Cold Call Test Lead',
        email: 'coldcall@example.com',
        phone: '+1-555-5555',
      },
      source: 'website',
      stage: 'new',
    };

    const leadResponse = await request(app)
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    const leadId = leadResponse.body.data.id;

    // Step 2: Create a cold call for this lead
    const coldCallData = {
      outcome: 'connected',
      notes: 'Had a productive conversation about their needs',
    };

    const coldCallResponse = await request(app)
      .post(`/api/leads/${leadId}/cold-calls`)
      .send(coldCallData)
      .expect(201); // Expect HTTP status code 201 (Created)

    // Step 3: Verify the response structure
    expect(coldCallResponse.body).toHaveProperty('success', true);
    expect(coldCallResponse.body).toHaveProperty('data');
    expect(coldCallResponse.body.data).toHaveProperty('id');
    expect(coldCallResponse.body.data).toHaveProperty('lead_id', leadId);
    expect(coldCallResponse.body.data).toHaveProperty('outcome', 'connected');
    expect(coldCallResponse.body.data).toHaveProperty('notes', 'Had a productive conversation about their needs');
  });

  /**
   * Test: POST /api/leads/:id/onsite-visits creates an onsite visit and returns 201
   * 
   * This test:
   * 1. First creates a lead to get a valid lead ID
   * 2. Sends a POST request to create an onsite visit for that lead
   * 3. Expects a 201 (Created) status code
   * 4. Verifies the response contains the created onsite visit
   */
  it('should create an onsite visit for a lead and return 201', async () => {
    // Step 1: Create a lead first so we have a valid lead ID
    const leadData = {
      contact: {
        name: 'Onsite Visit Test Lead',
        email: 'onsite@example.com',
        phone: '+1-555-4444',
      },
      source: 'referral',
      stage: 'qualified',
    };

    const leadResponse = await request(app)
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    const leadId = leadResponse.body.data.id;

    // Step 2: Create an onsite visit for this lead
    const visitData = {
      location: '123 Main St, City, State 12345',
      outcome: 'meeting_done',
      notes: 'Discussed proposal details and pricing. Very interested.',
    };

    const visitResponse = await request(app)
      .post(`/api/leads/${leadId}/onsite-visits`)
      .send(visitData)
      .expect(201); // Expect HTTP status code 201 (Created)

    // Step 3: Verify the response structure
    expect(visitResponse.body).toHaveProperty('success', true);
    expect(visitResponse.body).toHaveProperty('data');
    expect(visitResponse.body.data).toHaveProperty('id');
    expect(visitResponse.body.data).toHaveProperty('lead_id', leadId);
    expect(visitResponse.body.data).toHaveProperty('location', '123 Main St, City, State 12345');
    expect(visitResponse.body.data).toHaveProperty('outcome', 'meeting_done');
    expect(visitResponse.body.data).toHaveProperty('notes', 'Discussed proposal details and pricing. Very interested.');
  });
});

