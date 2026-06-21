# Kobo Trainer UI Redesign Design

Date: 2026-06-21
Project: Kobo Trainer
Scope: Full UI redesign across home, practice, review, library/growth, and settings.

## Goal

Make Kobo Trainer feel like a serious short-video speaking practice workstation instead of a dense prototype. The redesign should help a user understand what to practice today, start recording with less friction, read feedback after a session, and treat saved practice as a growing asset.

The recommended direction is **Professional Training Studio**:

- Light, calm dashboard and review surfaces for scanning.
- Dark, focused recording surfaces for camera and audio work.
- Strong crimson accent for active states, recording, and primary actions.
- Tighter information hierarchy so complex features feel organized instead of busy.

## Current Context

The app is a React single-file application in `src/app.jsx` with Tailwind generated into `styles.css`. It already has:

- A custom icon set and shared primitives such as `Btn`, `Card`, and `Tag`.
- A restrained crimson and stone visual language in `tailwind.config.js`.
- Camera, recording, AI review, saved files, goals, reminders, and growth mechanics.
- Existing uncommitted changes in `src/app.jsx`; implementation must preserve user work and avoid broad rewrites.

The redesign should build on the current visual language instead of replacing it with a separate design system.

## Non-Goals

- Do not change core practice modes or AI behavior.
- Do not remove existing user data structures or local storage behavior.
- Do not introduce a new framework, routing library, or design dependency.
- Do not fully rewrite `src/app.jsx`; edits should be targeted and staged.

## Information Architecture

The app should be organized into five clear surfaces:

1. **Today**
   - Default landing state.
   - Answers: what should I practice now?
   - Contains today's goal, streak, recommended drill, weak spot, and recent activity.

2. **Practice**
   - Recording workstation.
   - Contains camera/audio stage, prompt, duration, preparation, record controls, and live status.

3. **Review**
   - Post-session report.
   - Contains summary, five-dimensional scores, one priority fix, speech metrics, same-topic comparison, and share/save actions.

4. **Library**
   - Practice asset archive.
   - Contains saved sessions, filters, tags, stars, and monthly reports.

5. **Settings**
   - Operational configuration.
   - Contains AI key, recording save location, camera/microphone preferences, reminders, privacy, and advanced options.

## Visual System

### Layout

Use a restrained app-shell layout:

- Desktop: top navigation plus a two-column content grid where useful.
- Mobile: compact segmented navigation or bottom navigation, with one primary action per screen.
- Page sections should be unframed layouts or full-width bands. Cards are reserved for repeated items, tools, and report modules.

### Color

Keep the existing stone/crimson base but improve role clarity:

- Stone 50/100: page background and quiet panels.
- White: content surfaces.
- Crimson `#A30236`: primary actions, recording, active nav, urgent focus.
- Amber `#F1A23F`: highlights, streaks, achievements, warning-but-not-error states.
- Emerald: successful completion, progress, clean speech metrics.
- Navy: analytical comparison modules and structured insights.

Avoid making the app read as a single red theme. Crimson should be an accent, not a wash.

### Typography

Use the existing display/body fonts. Tighten text hierarchy:

- Dashboard page titles: 24-32px.
- Tool and card titles: 14-18px.
- Meta labels: 10-11px uppercase only when helpful.
- Keep letter spacing at 0 for normal readable text; reserve wider tracking for small labels only.

### Shape And Density

Preserve the near-square brand feel:

- Cards: 4-6px radius.
- Buttons: 3-6px radius.
- Repeated list rows: stable heights.
- Avoid nested cards.
- Use consistent grid and spacing tokens so dense features remain scannable.

## Screen Designs

### Today Screen

Purpose: reduce decision cost.

Structure:

- Header: today practice title, streak, weekly count, and settings.
- Primary recommendation module:
  - Recommended mode and topic.
  - Reason based on recent weak spot, such as opening, structure, or ending.
  - Primary action: start practice.
  - Secondary action: change topic.
- Mode rail:
  - Freestyle.
  - Script replication.
  - Host follow-up.
  - Tutorial/framework.
- Growth strip:
  - streak.
  - total sessions.
  - this week practice time.
  - most common weak spot.
- Recent practice list:
  - title, duration, date, score/label, quick replay.

Expected improvement:

- Users see one obvious next action.
- Secondary features remain discoverable without competing with start practice.

### Practice Screen

Purpose: make recording feel focused and confident.

Structure:

- Main stage:
  - Camera or voice-only visualizer.
  - Dark background.
  - Clear recording border/state.
  - Safe placement for timer and status so text never overlaps the face/camera center.
- Prompt panel:
  - Topic.
  - Three speaking bullets or structure hints.
  - Optional topic refresh and AI hint expansion.
- Control dock:
  - Duration selector.
  - Start/stop record.
  - Camera/audio toggle.
  - Beauty/filter button as secondary.
- Prep overlay:
  - Countdown.
  - Topic visible.
  - One focus instruction.
- Live state:
  - Recording indicator.
  - Time elapsed.
  - Audio level.
  - Current mode.

Expected improvement:

- The user always knows whether they are preparing, recording, paused, or finished.
- Controls remain stable across mobile and desktop.

### Review Screen

Purpose: turn one recording into the next practice action.

Structure:

- Summary header:
  - One thing worth keeping.
  - One thing to fix in the next round.
- Five score modules:
  - Hook, logic, filler words, ending, pacing.
  - Color-coded without becoming noisy.
- Metrics row:
  - WPM.
  - filler count.
  - duration.
  - same-topic delta when available.
- Priority fix:
  - One concrete rewrite or next drill.
  - Primary button: practice again with this fix.
- Evidence/detail:
  - transcript editor.
  - highlights.
  - AI suggestions.
  - saved video/audio.
- Output actions:
  - save.
  - star.
  - share card.
  - export monthly report.

Expected improvement:

- Feedback feels actionable, not just evaluative.
- The next session is a natural continuation.

### Library And Growth

Purpose: make practice history feel like an asset.

Structure:

- Filter bar:
  - mode.
  - tag.
  - starred.
  - weak spot.
  - date.
- Session cards:
  - title/topic.
  - mode.
  - duration.
  - score or label.
  - quick action.
- Growth panel:
  - weekly consistency.
  - monthly heat map.
  - recurring weak spots.
  - best sessions.
- Empty states:
  - give one suggested drill instead of explaining the whole feature.

Expected improvement:

- Users can find useful past recordings quickly.
- Progress becomes visible without needing a separate analytics product.

### Settings

Purpose: reduce noise.

Structure:

- Essential:
  - AI key/proxy status.
  - save location.
  - camera/microphone.
  - reminder.
  - privacy.
- Advanced collapsed:
  - model/provider details.
  - cache/service worker tools.
  - debug information.

Expected improvement:

- Settings stop competing with core practice work.
- Risky or technical controls are still available but less visually prominent.

## Components To Refine

The implementation should prefer refining existing primitives:

- `Btn`
  - Add clearer variants for primary, secondary, ghost, danger, and record.
  - Stable icon+label alignment.
  - Strong disabled and loading states.

- `Card`
  - Keep simple border and white surface.
  - Add optional accent border role without nesting.

- `Tag`
  - Use for metadata only, not primary controls.

- `TopBar`
  - Convert from page title strip into a consistent app shell element.

- `CameraFrame`
  - Establish stable stage aspect ratio.
  - Ensure overlays do not cover the user's face or prompt text.

- `DoneView`
  - Make it report-first and action-led.

## Interaction States

Required states:

- First visit / no history.
- Camera denied.
- Microphone denied.
- Voice-only recording.
- Preparing countdown.
- Recording.
- Saving.
- Save failed.
- AI unavailable.
- AI reviewing.
- AI review failed.
- Offline or service worker cached mode.

Each state should provide one next action.

## Accessibility And Responsiveness

- All icon-only buttons need `title` or accessible labels.
- Primary actions must have visible text.
- Text must not overflow buttons or cards on mobile.
- Camera/prompt/control layout must remain usable at 360px width.
- Desktop layout should avoid long text measures; keep report content in readable columns.
- Do not scale fonts with viewport width.

## Implementation Strategy

Implement in small passes:

1. Create shared UI role helpers and refine `Btn`, `Card`, `Tag`, and page shell.
2. Redesign Today/home screen.
3. Redesign Practice screen and recording states.
4. Redesign Review screen.
5. Redesign Library/growth and Settings.
6. Build and visually verify desktop/mobile.

This staged approach reduces risk in the large `src/app.jsx` file and makes it easier to preserve existing behavior.

## Validation

Code verification:

- `npm run build`

Visual verification:

- Load the local app through a static server.
- Check desktop viewport around 1440x900.
- Check mobile viewport around 390x844.
- Verify the app is nonblank and the main flows render:
  - Today.
  - Practice.
  - Review.
  - Library/history.
  - Settings.

Behavioral spot checks:

- Start practice flow can still reach recording state.
- Voice-only state renders.
- Review state handles transcript and AI feedback modules.
- Saved sessions remain visible.

## Risks

- `src/app.jsx` is large and already dirty. Implementation should avoid broad rewrites and should inspect the current diff before editing.
- `styles.css` is generated. Manual style edits should usually happen in `src/app.jsx` or Tailwind config, followed by build.
- Camera and recording behavior can be fragile. Visual refactors should not alter media lifecycle code unless necessary.

## Open Decisions

- Whether to include a bottom nav on desktop, mobile only, or neither.
- Whether the default home recommendation should be rule-based only or use existing AI capabilities.
- Whether review score cards should use numeric scores, qualitative labels, or both.

Recommended defaults:

- Bottom navigation on mobile only.
- Rule-based home recommendation for the redesign pass.
- Review cards show both label and numeric score when data exists.
