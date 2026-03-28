

## Fix: Chronological event ordering and auto-hide past events on Dashboard

### Problem
1. Today's events don't disappear after their time has passed
2. Events need to always be in chronological order (date + time)

### Solution

**Single file change: `src/pages/Dashboard.tsx`**

1. **Fetch today's events that haven't passed yet**: Instead of fetching all events for today, fetch events for today AND future dates (`