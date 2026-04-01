import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePageTracking(page: string, pageDetail?: string) {
  const { user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (!user || tracked.current) return;
    tracked.current = true;

    supabase
      .from("page_views")
      .insert({ user_id: user.id, page, page_detail: pageDetail ?? null })
      .then(() => {});
  }, [user, page, pageDetail]);
}
