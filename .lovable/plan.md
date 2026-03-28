

## Apply chronological ordering and auto-hide past events on Calendário

### Problem
The Calendário page doesn't order events by time within the same date, and past events (whose time has passed) still appear in the list.

### Solution

**Single file: `src/pages/Calendario.tsx`**

1. **Add `event_time` ordering** to both queries (approved and unapproved): append `.order("event_time", { ascending: true })` after the date ordering.

2. **Client-side filtering for past events**: Reuse the same `filterAndSetEvents` pattern from Dashboard — for today's events with a set `event_time`, hide them if the time has already passed.

3. **Auto-refresh with interval**: Add a 60-second `setInterval` that re-filters the events list to remove expired ones without page reload. Clean up on unmount.

4. **For unapproved users**: Apply the same time-based filter to the limited upcoming events list.

5. **For the calendar grid `eventsForDay`**: The dots on calendar days remain unchanged (they reflect all events fetched for the month, including past ones for historical context). Only the **events list below** gets filtered for today.

### Technical details
- Add a `filterPastEvents` helper that checks: if `event_date === todayStr` and `event_time` exists and `event_time < currentTime`, exclude the event
- Wrap the Supabase fetch result through this filter before calling `setEvents`
- Add `setInterval` with 60s refresh, clearing on component unmount or dependency change

