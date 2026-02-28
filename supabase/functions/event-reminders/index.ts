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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get events happening in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, event_date, event_time, event_type")
      .gte("event_date", todayStr)
      .lte("event_date", tomorrowStr);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter events that are actually within the next 24h
    const upcomingEvents = events.filter((e: any) => {
      const eventDateTime = new Date(`${e.event_date}T${e.event_time || "00:00:00"}`);
      return eventDateTime > now && eventDateTime <= tomorrow;
    });

    if (upcomingEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No events in next 24h" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users who have reminders enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, notify_reminders")
      .eq("notify_reminders", true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with reminders enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which notifications were already sent (avoid duplicates)
    const notificationsToInsert: any[] = [];

    for (const event of upcomingEvents) {
      const dateStr = new Date(`${event.event_date}T00:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      const timeStr = event.event_time ? ` às ${event.event_time.slice(0, 5)}` : "";

      // Check existing reminders for this event
      const { data: existing } = await supabase
        .from("notifications")
        .select("user_id")
        .eq("type", "event_reminder")
        .filter("data->>event_id", "eq", event.id);

      const alreadyNotified = new Set((existing || []).map((n: any) => n.user_id));

      for (const profile of profiles) {
        if (!alreadyNotified.has(profile.id)) {
          notificationsToInsert.push({
            user_id: profile.id,
            title: "📅 Lembrete de evento",
            message: `"${event.title}" acontece amanhã${timeStr} (${dateStr}).`,
            type: "event_reminder",
            data: { event_id: event.id },
          });
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${notificationsToInsert.length} reminders for ${upcomingEvents.length} events`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
