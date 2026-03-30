

## Custom Audio Player for Dashboard Banners

### Problem
The current audio banner uses the browser's native `<audio>` element, which is bulky and inconsistent across browsers. The user wants a minimal, clean audio player with play/pause, a progress bar, total duration display, and playback speed control (up to 2.0x).

### Solution

**Single file change: `src/components/DashboardBanner.tsx`**

1. **Create a custom `AudioPlayer` component** inside the file (or as a separate component) that replaces the native `<audio>` tag:
   - Hidden `<audio>` element for playback
   - Play/Pause button (icon toggle)
   - Seekable progress bar (using the existing `Slider` component)
   - Current time / Total duration display (formatted as `mm:ss`)
   - Speed control button that cycles through: 1.0x → 1.25x → 1.5x → 1.75x → 2.0x → back to 1.0x

2. **UI layout**: Single compact row inside the banner card:
   ```
   [▶] ━━━━━━━━━━━━━━━━━━━━ 3:45  [1.0x]
   ```

3. **Replace** the current `<audio>` block in `renderMedia` with the new `<AudioPlayer src={banner.media_url} />`.

### Technical details
- Use `useRef` for the `<audio>` element, `useState` for `isPlaying`, `currentTime`, `duration`, `playbackRate`
- Listen to `timeupdate`, `loadedmetadata`, `ended` events
- Slider `onValueChange` seeks the audio via `audioRef.current.currentTime`
- Speed button sets `audioRef.current.playbackRate`
- Format seconds to `mm:ss` helper

