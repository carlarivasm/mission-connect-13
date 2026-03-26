import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const { email, full_name } = await req.json();
    if (!email) throw new Error("Email is required");

    // Generate an invite link using Supabase Admin API
    const origin = req.headers.get("origin") || "https://app-missoes-familia.lovable.app";
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name || "" },
      redirectTo: origin,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "Convite enviado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
