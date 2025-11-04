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

    // Create Supabase client with user's JWT token for auth.getUser()
    const supabaseClient = createClient(
      SUPABASE_URL!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log(`Fetching contacts for user: ${user.id}`);

    // Create admin client for database queries
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch emergency contacts for this user
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id);

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

    // Send email to each contact
    const emailPromises = contacts.map(async (contact) => {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Health Mate Emergency <onboarding@resend.dev>',
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
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(`Failed to send to ${contact.email}:`, errorText);
        return { contact: contact.name, success: false, error: errorText };
      }

      const data = await emailResponse.json();
      console.log(`Email sent to ${contact.email}:`, data);
      return { contact: contact.name, success: true, messageId: data.id };
    });

    const results = await Promise.all(emailPromises);
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
