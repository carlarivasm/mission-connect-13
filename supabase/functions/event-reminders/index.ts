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

  // Validate cron secret to prevent unauthorized access
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || !incomingSecret || incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, event_date, event_time, event_type, notify_push, reminder_24h, reminder_30min, reminder_10min, reminder_5min")
      .gte("event_date", todayStr)
      .lte("event_date", tomorrowStr);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reminderIntervals = [
      { minutes: 24 * 60, label: "amanhã", profileCol: "notify_reminder_24h", eventCol: "reminder_24h" },
      { minutes: 30, label: "em 30 minutos", profileCol: "notify_reminder_30min", eventCol: "reminder_30min" },
      { minutes: 10, label: "em 10 minutos", profileCol: "notify_reminder_10min", eventCol: "reminder_10min" },
      { minutes: 5, label: "em 5 minutos", profileCol: "notify_reminder_5min", eventCol: "reminder_5min" },
    ];

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
    const pushUserIds: string[] = [];

    for (const event of events) {
      const eventDateTime = new Date(`${event.event_date}T${event.event_time || "00:00:00"}`);
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      for (const interval of reminderIntervals) {
        // Check if this reminder interval is enabled for this event
        if (!(event as any)[interval.eventCol]) continue;

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
            if (!(profile as any)[interval.profileCol]) continue;
            if (alreadyNotified.has(profile.id)) continue;

            notificationsToInsert.push({
              user_id: profile.id,
              title: "📅 Lembrete de evento",
              message: `"${event.title}" acontece ${interval.label}${timeStr} (${dateStr}).`,
              type: "event_reminder",
              data: { event_id: event.id, reminder_key: reminderKey },
            });

            // Track users for push if event has push enabled
            if (event.notify_push && !pushUserIds.includes(profile.id)) {
              pushUserIds.push(profile.id);
            }
          }
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);
      if (insertError) throw insertError;

      // Send push notifications if any events had push enabled
      if (pushUserIds.length > 0) {
        const firstNotif = notificationsToInsert[0];
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              title: firstNotif.title,
              body: firstNotif.message,
              link: "/calendario",
              user_ids: pushUserIds,
            }),
          });
        } catch (err) {
          console.error("Push notification error:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${notificationsToInsert.length} reminders, push to ${pushUserIds.length} users` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Event reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
