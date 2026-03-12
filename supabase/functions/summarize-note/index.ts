import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { house_number, resident_name, user_address, needs_names, notes } = await req.json();

    // Build a structured text from the observation fields
    const parts: string[] = [];
    if (house_number) parts.push(`Nº da casa: ${house_number}`);
    if (resident_name) parts.push(`Morador: ${resident_name}`);
    if (user_address) parts.push(`Complemento: ${user_address}`);
    if (needs_names && needs_names.length > 0) parts.push(`Necessidades: ${needs_names.join(", ")}`);
    if (notes) parts.push(`Observações: ${notes}`);

    if (parts.length === 0) {
      return new Response(
        JSON.stringify({ summary: "Nenhuma informação preenchida para resumir." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const observationText = parts.join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente de missões comunitárias. Sua tarefa é criar um resumo curto e amigável (máximo 2-3 frases) de uma observação de visita domiciliar feita por missionários. O resumo deve destacar os pontos mais importantes como necessidades identificadas e informações relevantes sobre o morador. Escreva em português brasileiro, de forma acolhedora e objetiva. Não use bullet points, apenas texto corrido.",
          },
          {
            role: "user",
            content: `Resuma a seguinte observação de visita:\n\n${observationText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-note error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
