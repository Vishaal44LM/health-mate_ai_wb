import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, medicineName, dosage, timeOfDay } = await req.json();
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      from: 'Health Mate <onboarding@resend.dev>',
      to: [email],
      subject: `Medication Reminder: ${medicineName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22b8cf;">Health Mate Reminder</h1>
          <p>This is a friendly reminder to take your medication:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333;">${medicineName}</h2>
            <p style="font-size: 16px; margin: 10px 0;">
              <strong>Dosage:</strong> ${dosage}
            </p>
            <p style="font-size: 16px; margin: 10px 0;">
              <strong>Time:</strong> ${timeOfDay}
            </p>
          </div>
          <p style="color: #6c757d; font-size: 14px;">
            Stay on track with your health goals! If you have any questions about your medication, 
            please consult your healthcare provider.
          </p>
          <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
          This is an automated reminder from Health Mate.
          </p>
        </div>
      `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error('Failed to send email');
    }

    const data = await emailResponse.json();
    console.log('Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
