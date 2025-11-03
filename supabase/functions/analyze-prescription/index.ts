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
    const { prescription, isImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let content;
    if (isImage) {
      content = [
        {
          type: 'text',
          text: `Analyze this prescription image. Extract:
1. Medication names
2. Dosages
3. Frequencies
4. Duration
5. Any warnings or interactions
6. Simple instructions for taking each medication

Format the response in a clear, structured way.`
        },
        {
          type: 'image_url',
          image_url: {
            url: prescription
          }
        }
      ];
    } else {
      content = `Analyze this prescription text and provide:
1. Medication names
2. Dosages
3. Frequencies
4. Potential interactions or warnings
5. Simple instructions

Prescription: ${prescription}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error('Failed to analyze prescription');
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Prescription analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
