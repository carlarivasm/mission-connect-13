import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, link, user_ids } = await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch tokens
    let query = supabase.from("fcm_tokens").select("token");
    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }
    const { data: tokens, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No tokens found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to each token via FCM legacy API
    let sentCount = 0;
    const failedTokens: string[] = [];

    for (const { token } of tokens) {
      const fcmPayload = {
        to: token,
        notification: { title, body, icon: "/icons/icon-192.png" },
        data: { link: link || "/" },
      };

      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });

      const result = await res.json();
      if (result.success === 1) {
        sentCount++;
      } else {
        failedTokens.push(token);
      }
    }

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", failedTokens);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedTokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
