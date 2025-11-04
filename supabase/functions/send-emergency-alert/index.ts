import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, location, userName } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract user id from JWT without remote call
    const token = authHeader.replace(/Bearer\s+/i, '').trim();
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      userId = payload?.sub ?? null;
    } catch (e) {
      console.error('JWT parse error', e);
    }
    if (!userId) {
      throw new Error('Unauthorized');
    }

    console.log(`Fetching contacts for user: ${userId}`);

    // Create admin client for database queries
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch emergency contacts for this user
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      throw new Error('Failed to fetch emergency contacts');
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emergency contacts found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending emergency alerts to ${contacts.length} contacts`);

    // Send emails with rate limiting (2 req/sec) and retries
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const sendEmailWithRetry = async (contact: any) => {
      const payload = {
        from: (Deno.env.get('RESEND_FROM') || 'Health Mate Emergency <onboarding@resend.dev>'),
        to: [contact.email],
        subject: '🚨 EMERGENCY ALERT from Health Mate',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
                  <strong>${userName || 'A Health Mate user'}</strong> has sent you an emergency alert.
                </p>
                
                ${message ? `
                  <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 0; color: #333;"><strong>Message:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #555;">${message}</p>
                  </div>
                ` : ''}
                
                ${location ? `
                  <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; color: #333;"><strong>📍 Location:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #555;">${location}</p>
                  </div>
                ` : ''}
                
                <p style="color: #dc2626; font-size: 14px; margin-top: 20px; font-weight: bold;">
                  ⚠️ This is an automated emergency alert. Please check on ${userName || 'the sender'} as soon as possible.
                </p>
                
                <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
                  You are receiving this because you are listed as an emergency contact in Health Mate.
                </p>
              </div>
            </div>
          `,
      };

      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;

      while (attempt < maxRetries) {
        attempt++;
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (emailResponse.ok) {
          const data = await emailResponse.json();
          console.log(`Email sent to ${contact.email}:`, data);
          return { contact: contact.name, email: contact.email, success: true, messageId: data.id };
        }

        // Capture error and decide if we should retry
        const status = emailResponse.status;
        const errorText = await emailResponse.text();
        lastError = { status, errorText };
        console.error(`Attempt ${attempt} failed for ${contact.email}:`, errorText);

        // Retry only on rate limits or transient server errors
        if (status === 429 || status >= 500) {
          const backoff = 400 * attempt + Math.floor(Math.random() * 200);
          await sleep(backoff);
          continue;
        }

        // For other errors (e.g., Resend sandbox validation 403), don't retry
        break;
      }

      return { contact: contact.name, email: contact.email, success: false, error: lastError };
    };

    // Resend free tier allows 2 requests/second. Send in small batches to avoid 429.
    const batchSize = 2;
    const results: any[] = [];
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((c) => sendEmailWithRetry(c)));
      results.push(...batchResults);
      if (i + batchSize < contacts.length) {
        await sleep(700); // ~1.4 req/sec overall, safe below 2 req/sec limit
      }
    }
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalContacts: contacts.length,
        successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Emergency alert error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
