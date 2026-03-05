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

    // Reminder intervals with corresponding profile column
    const reminderIntervals = [
      { minutes: 24 * 60, label: "amanhã", column: "notify_reminder_24h" },
      { minutes: 30, label: "em 30 minutos", column: "notify_reminder_30min" },
      { minutes: 10, label: "em 10 minutos", column: "notify_reminder_10min" },
      { minutes: 5, label: "em 5 minutos", column: "notify_reminder_5min" },
    ];

    // Get all users who have reminders enabled globally
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, notify_reminders, notify_reminder_24h, notify_reminder_30min, notify_reminder_10min, notify_reminder_5min")
      .eq("notify_reminders", true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with reminders enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationsToInsert: any[] = [];

    for (const event of events) {
      const eventDateTime = new Date(`${event.event_date}T${event.event_time || "00:00:00"}`);
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      for (const interval of reminderIntervals) {
        const tolerance = 2;
        if (diffMinutes >= interval.minutes - tolerance && diffMinutes <= interval.minutes + tolerance) {
          const timeStr = event.event_time ? ` às ${event.event_time.slice(0, 5)}` : "";
          const dateStr = new Date(`${event.event_date}T00:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });

          const reminderKey = `${event.id}_${interval.minutes}`;

          const { data: existing } = await supabase
            .from("notifications")
            .select("user_id")
            .eq("type", "event_reminder")
            .filter("data->>reminder_key", "eq", reminderKey);

          const alreadyNotified = new Set((existing || []).map((n: any) => n.user_id));

          for (const profile of profiles) {
            // Check per-interval preference
            if (!(profile as any)[interval.column]) continue;
            if (alreadyNotified.has(profile.id)) continue;

            notificationsToInsert.push({
              user_id: profile.id,
              title: "📅 Lembrete de evento",
              message: `"${event.title}" acontece ${interval.label}${timeStr} (${dateStr}).`,
              type: "event_reminder",
              data: { event_id: event.id, reminder_key: reminderKey },
            });
          }
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
      JSON.stringify({ message: `Sent ${notificationsToInsert.length} reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
