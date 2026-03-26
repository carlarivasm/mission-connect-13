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
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const { action, userId, email } = await req.json();

    if (action === "delete_user") {
      // Delete user from auth (cascades to profiles, roles, etc.)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      // Also reset authorized_missionaries used flag so they can re-register
      await supabase
        .from("authorized_missionaries")
        .update({ used: false })
        .eq("email", email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resend_confirmation") {
      // Use admin API to generate a magic link for existing users
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${req.headers.get("origin") || "https://app-missoes-familia.lovable.app"}` },
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Link de confirmação regenerado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reinvite_user") {
      // Re-invite: set used=false so they can sign up again
      await supabase
        .from("authorized_missionaries")
        .update({ used: false })
        .eq("email", email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      // Tratar e retornar apenas dados necessários para não expor tudo
      const usersInfo = data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
      }));
      return new Response(JSON.stringify({ success: true, users: usersInfo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
