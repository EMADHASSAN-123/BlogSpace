import { supabase } from 'supabaseClient.js';
import { StatusCodes } from 'http-status-codes';


export async function logVisit(req) {
  try {
    // Validate the request method.  Only POST is allowed.
    if (req.method !== 'POST') {
      return new Response(null, { status: StatusCodes.METHOD_NOT_ALLOWED });
    }

    // Parse the request body.  Crucially, handle potential errors.
    const reqBody = await req.json().catch(() => {
      return new Response(null, { status: StatusCodes.BAD_REQUEST, statusText: 'Invalid JSON' });
    });

    // Input Validation:  Crucial!
    if (!reqBody || !reqBody.ip || !reqBody.userAgent || !reqBody.page || !reqBody.source) {
      return new Response(null, { status: StatusCodes.BAD_REQUEST, statusText: 'Missing required fields' });
    }

    const ip = reqBody.ip;
    const userAgent = reqBody.userAgent;
    const page = reqBody.page;
    const source = reqBody.source;
    // Add session ID (if available).
    const sessionId = reqBody.sessionId || 'N/A';  

    // Sanitize input (crucial for preventing injection attacks).
    const sanitizedPage = page.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Example sanitization
    const sanitizedSource = source.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Example sanitization
    // ... other sanitized fields as needed


    // Insert into Supabase
    const { data, error } = await supabase
      .from('visits')
      .insert([
        { ip, userAgent, page: sanitizedPage, source: sanitizedSource, sessionId, timestamp: new Date() }
      ]);

    if (error) {
      console.error('Error logging visit:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: StatusCodes.INTERNAL_SERVER_ERROR });
    }

    return new Response(JSON.stringify({ success: true }), { status: StatusCodes.OK });
  } catch (error) {
    console.error('Error logging visit (catch):', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: StatusCodes.INTERNAL_SERVER_ERROR });
  }
}