# PRD: Feature Parity with Legacy Arcus Web Client

## Purpose

This document catalogs the full feature set of the legacy Arcus web client (`~/arcusweb`, DoneJS/CanJS) and maps it against the modern client (`~/arcuswebmodern`, Next.js 16 / React 19) to identify gaps that must be closed for feature parity.

Status legend: **Done** = fully implemented, **Partial** = core flow works but missing sub-features, **Missing** = not yet built, **Broken** = built but not functioning correctly (regression / bug to fix).

---

## 1. Authentication & Onboarding

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Email/password login | Yes | Yes | **Done** |
| "Public computer" session flag | Yes | Yes | **Done** |
| Password reset (email flow) | Yes | Yes (3-step) | **Done** |
| Create account wizard | Yes (multi-step) | Yes (4-step: credentials, address, PIN, welcome) | **Done** |
| Accept invitation wizard | Yes | Yes (5-step: code, confirm, login, PIN, welcome) | **Done** |
| Kit activation flow | Yes | Yes (device grid with per-device customization) | **Done** |
| Automatic logout on expired / stale session | Yes | Yes | **Done** |

### Gaps

- ~~**Bug:** No automatic logout when the platform session is too old.~~ **DONE.** `corneaMiddleware` now bridges the platform `sess:SessionExpired` event to `sessionExpired()` and tears down the socket, so AuthProvider redirects to `/login?expired=1` (4001 close / `error.unauthorized` responses were already handled via `sess unauthorized`).
- Session / WebSocket persistence between the deployed dev client and the locally running `arcuswebmodern` instance, so switching between them reuses the same platform session instead of forcing re-authentication.

---

## 2. Dashboard / Home Page

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Subsystem cards (12 types) | Yes | Yes | **Done** |
| Favorites card | Yes | Yes | **Done** |
| History sidebar | Yes | Yes (5 recent entries, refresh, link to full) | **Done** |
| Card reordering & visibility | Yes (preferences page) | Yes (preferences page with up/down + toggle) | **Done** |
| Unavailable subsystem warnings | Yes | Yes (cards hidden when subsystem absent) | **Done** |

### Gaps

None.

---

## 3. Device Management

### 3.1 Device List & Details

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Device list view | Yes | Yes | **Done** |
| Device status indicators (online/offline, battery) | Yes | Yes | **Done** |
| Device detail panel (manufacturer, model, firmware, protocol) | Yes | Yes | **Done** |
| Device naming | Yes | Yes | **Done** |
| Device favorite toggle | Yes | Yes | **Done** |
| Device identification (blink/beep) | Yes | Yes | **Done** |
| Device removal with confirmation | Yes | Yes | **Done** |
| Device settings/configuration panel | Yes | Yes (enum, range, text parameter types) | **Done** |
| Power usage display (instantaneous) | Yes | No | **Missing** |
| OTA firmware update status | Yes | No | **Missing** |
| Signal strength display | Yes | No | **Missing** |

### 3.2 Device Controls by Type

| Device Type | Legacy Controls | Modern Controls | Status |
|-------------|----------------|-----------------|--------|
| On/Off switches & plugs | Toggle | Toggle | **Done** |
| Dimmers | Toggle + brightness slider | Toggle + brightness slider | **Done** |
| Color lights | RGB + color temp + brightness | Hue/saturation sliders + color temp slider | **Done** |
| Multi-switch (dual relay/outlet) | Per-instance toggle | Per-instance toggle + status | **Done** |
| Smart locks | Lock/unlock | Lock/unlock | **Done** |
| Door/window contacts | Open/close status | Open/close status | **Done** |
| Motorized doors / garage doors | Open/close/stop | Open/close | **Partial** |
| Thermostats | Mode, heat/cool setpoints, min/max enforcement, fan mode | Mode, heat/cool setpoints | **Partial** |
| Fans | Multi-speed control | 4-level speed selector | **Done** |
| Water valves | Open/close | Open/close | **Done** |
| Water heaters | Mode control, temperature | None | **Missing** |
| Water softeners | Salt level, recharge time, settings | None | **Missing** |
| Shades / blinds | Position, tilt | Config references action but no component | **Missing** |
| Irrigation controllers | Zone-by-zone control, schedules, modes | Zone list display only | **Partial** |
| Cameras (live) | HLS streaming, PTZ, recording, clips | Device panel with status only | **Partial** |
| Keypads | Button function assignment | None | **Missing** |
| Pet doors | Open/close control, access settings | None | **Missing** |
| Buttons / pendants | Configuration | None | **Missing** |
| NOAA weather radios | Alert display, hush/snooze | None | **Missing** |
| Halo devices | Multi-function (smoke, CO, weather, nightlight) | None | **Missing** |
| Presence sensors / pet tokens | Assignment to person | None | **Missing** |
| Somfy motorized shades | Position control | None | **Missing** |

### 3.3 Thermostat Sub-Features

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| HVAC mode switching (heat, cool, auto, off) | Yes | Yes | **Done** |
| Heat / cool setpoint adjustment | Yes | Yes | **Done** |
| Min/max temperature enforcement (45-95 F) | Yes | No | **Missing** |
| Minimum separation (3 F between heat/cool in auto) | Yes | No | **Missing** |
| Fan mode control | Yes | No | **Missing** |
| Thermostat schedule management | Yes (full calendar) | No | **Missing** |
| Space heater mode | Yes | No | **Missing** |
| Nest integration specifics | Yes | No | **Missing** |
| Honeywell TCC integration specifics | Yes | No | **Missing** |

### 3.4 Camera Sub-Features

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| HLS live streaming | Yes (hls.js) | No | **Missing** |
| Pan/tilt/zoom controls | Yes | No | **Missing** |
| Recording start/stop | Yes | No | **Missing** |
| Recording playback | Yes | No | **Missing** |
| Clips browser | Yes | No | **Missing** |
| Storage quota display | Yes | No | **Missing** |
| Frame rate configuration | Yes | No | **Missing** |
| IR LED mode (on/off/auto) | Yes | No | **Missing** |
| Camera rotation / flip | Yes | No | **Missing** |
| Resolution settings | Yes | No | **Missing** |
| Fullscreen mode | Yes (cross-browser) | No | **Missing** |
| Preview image / thumbnail | Yes | No | **Missing** |

---

## 4. Scenes

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Scene list view | Yes | Yes | **Done** |
| Create scene from template | Yes | Yes | **Done** |
| Edit scene (name, actions) | Yes | Yes | **Done** |
| Delete scene | Yes | Yes | **Done** |
| Fire scene | Yes | Yes | **Done** |
| Scene favorite toggle | Yes | Yes | **Done** |
| Notification toggle per scene | Yes | Yes | **Done** |
| Action selectors (boolean, percent, temperature, range, list, group) | Yes | Yes (all types) | **Done** |
| Scene scheduling | Yes | Yes | **Done** |

### Gaps

- None.

### Notes

- **Scene scheduling** is wired via the Schedule button on each scene card: it
  opens the shared `ScheduleEditPanel` targeting the scene, firing `scene:Fire`
  on the platform `FIRE` schedule group. This also fixed the panel's scheduler
  lookup (`selectSchedulerByTarget` — schedulers are keyed by their own address,
  not the target's), which unblocks device/rule scheduling reuse too.

---

## 5. Rules & Automation

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| My Rules list with enable/disable | Yes | Yes | **Done** |
| Rule creation from templates | Yes | Yes | **Done** |
| Rule editing (name, context) | Yes | Yes | **Done** |
| Rule deletion with confirmation | Yes | Yes | **Done** |
| Template variable resolution with device names | Yes | Yes | **Done** |
| Rules library browse by category | Yes | Yes | **Done** |
| Rule scheduling (enable/disable on schedule) | Yes | No | **Missing** |

### Gaps

- Rule scheduling (enable/disable rules on a time-based schedule).

---

## 6. Scheduling

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Time-of-day (absolute) scheduling | Yes | Yes | **Done** |
| Sunrise / sunset offset scheduling | Yes | Yes | **Done** |
| Weekly recurring (day-of-week selection) | Yes | Yes | **Done** |
| Device scheduling | Yes | Yes | **Done** |
| Thermostat schedule programs | Yes (full HVAC calendar) | No | **Missing** |
| Irrigation scheduling (even/odd/interval modes) | Yes | No | **Missing** |
| Scene scheduling | Yes | Yes | **Done** |
| Rule enable/disable scheduling | Yes | No | **Missing** |
| Timezone conversion (place vs device) | Yes | No | **Missing** |

### Gaps

- Thermostat schedule management (temperature programs).
- Irrigation schedule management (zone durations, watering modes).
- Rule scheduling (enable/disable rules on a time-based schedule).
- Timezone-aware scheduling.

---

## 7. Alarms & Security

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Alarm status display | Yes | Yes | **Done** |
| Arm / disarm controls | Yes | Yes | **Done** |
| Arm STAY (perimeter only) | Yes | Yes | **Done** |
| Incident tracker (timeline, events) | Yes | Yes | **Done** |
| Offline device count display | Yes | Yes | **Done** |
| Professional monitoring badge | Yes | Yes | **Done** |
| Alarm banner on active incidents | Yes | Yes | **Done** |
| Device participation list | Yes | Yes | **Done** |
| Participation editing per device | Yes | Yes (ON, PARTIAL, both, none) | **Done** |
| Notification / call tree management | Yes (ordered, up to 6 people) | Yes (ordered, enable/disable, reorder) | **Done** |
| Alarm delays / grace period configuration | Yes | Yes (exit/entrance delay per mode) | **Done** |
| Strobe / siren settings | Yes | Yes (silent alarm toggle per mode) | **Done** |
| Silent / audible mode toggle | Yes | Yes (per mode) | **Done** |
| Panic button | Yes | Yes | **Done** |

### Gaps

None.

---

## 8. Care Subsystem

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Care status display (alert / all clear) | Yes | Yes | **Done** |
| Last alert cause display | Yes | Yes | **Done** |
| Clear care alert | Yes | Yes | **Done** |
| Behavior list with enable/disable | Yes | Yes (read-only list) | **Partial** |
| Behavior creation from templates | Yes | No | **Missing** |
| Behavior editing (devices, time windows, thresholds) | Yes | No | **Missing** |
| Behavior deletion | Yes | No | **Missing** |
| Activity timeline | Yes | No | **Missing** |
| Care device management | Yes | No | **Missing** |
| Care call tree / notification settings | Yes | No | **Missing** |
| Alarm mode (ON / VISIT) | Yes | No | **Missing** |
| Silent mode toggle | Yes | Yes (display only) | **Partial** |
| Panic alert | Yes | No | **Missing** |

### Gaps

- Full behavior CRUD (create, edit, delete care behaviors).
- Activity timeline.
- Care-specific notification/call tree management.
- Alarm mode switching (ON vs VISIT).
- Panic alert trigger.

---

## 9. Climate

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Current temperature display | Yes | Yes | **Done** |
| Current humidity display | Yes | Yes | **Done** |
| Thermostat controls (mode, setpoints) | Yes | Yes | **Done** |
| Multiple thermostats | Yes | Yes | **Done** |
| Temperature sensor list | Yes | Yes | **Done** |
| Thermostat schedule management | Yes (full calendar) | No | **Missing** |
| Fan mode control | Yes | No | **Missing** |
| Space heater mode | Yes | No | **Missing** |

### Gaps

- Thermostat scheduling (temperature programs by time/day).
- Fan mode control.
- Space heater mode support.

---

## 10. Doors & Locks

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Lock state display | Yes | Yes | **Done** |
| Lock/unlock controls | Yes | Yes | **Done** |
| Door/window contact status | Yes | Yes | **Done** |
| Motorized / garage door controls | Yes | Yes | **Done** |
| Unlocked / open count summary | Yes | Yes | **Done** |
| Access list (PIN codes per user) | Yes | No | **Missing** |
| Temporary PINs with expiry | Yes | No | **Missing** |
| PIN history | Yes | No | **Missing** |
| Door chime configuration | Yes | No | **Missing** |
| Pet door controls | Yes | No | **Missing** |

### Gaps

- Access management (assign PINs to people for locks, temporary PINs).
- Door chime configuration.
- Pet door controls.

---

## 11. Water

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Shut-off valve control | Yes | Yes | **Done** |
| Leak sensor status | Yes | Yes | **Done** |
| Water device list | Yes | Yes | **Done** |
| Flow monitoring / usage display | Yes | No | **Missing** |
| Water heater mode & temperature | Yes | No | **Missing** |
| Water softener settings (salt level, recharge) | Yes | No | **Missing** |
| EcoWater / AO Smith integration | Yes | No | **Missing** |

### Gaps

- Flow monitoring and usage display.
- Water heater controls.
- Water softener controls.

---

## 12. Lawn & Garden

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Irrigation controller status | Yes | Yes | **Done** |
| Zone list display | Yes | Yes (basic) | **Partial** |
| Individual zone control (start/stop/duration) | Yes | No | **Missing** |
| Irrigation schedule management | Yes (even/odd/interval/weekly modes) | No | **Missing** |
| Water saver modes | Yes | No | **Missing** |
| Seasonal adjustments | Yes | No | **Missing** |

### Gaps

- Individual zone controls.
- Irrigation scheduling with all modes (even, odd, interval, weekly).
- Water saver and seasonal adjustment features.
- ~~**Bug:** The Lawn & Garden card on the home screen shows an "undefined" watering device.~~ **DONE.** `sublawnngarden:zonesWatering` is a map keyed by controller address, not an array; `useLawnGardenSubsystem` now converts it with `Object.values(...)` so the watering count renders correctly (was `undefined` because the map has no `.length`).
- ~~**Bug:** Clicking the Lawn & Garden subsystem navigates to the Alarms page instead of the Lawn & Garden section.~~ **DONE.** The Services page is now a path-based route matching arcusweb — `/services/<subsystem>/<action>` (e.g. `/services/lawn-garden/status`) via an optional catch-all `[[...slug]]`. Previously it read no route info and always defaulted to the first subsystem (Alarms). Home dashboard cards, the sidebar, and the incident redirect all use the `/services/<slug>/status` form; the alarm view's status/settings tabs are route-driven.
- **Testing:** Create a mock irrigation controller so zone control, scheduling, and the fixes above can be exercised without physical hardware.

---

## 13. Cameras

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Camera list with status | Yes | Yes | **Partial** |
| Live HLS streaming | Yes (hls.js, fullscreen, adaptive bitrate) | No | **Missing** |
| Pan/tilt/zoom controls | Yes | No | **Missing** |
| Recording start/stop | Yes | No | **Missing** |
| Recording playback | Yes | No | **Missing** |
| Clips browser with filtering | Yes | No | **Missing** |
| Storage quota display | Yes | No | **Missing** |
| Camera settings (resolution, frame rate, IR, rotation) | Yes | No | **Missing** |
| Archive management (delete all, favorites quota) | Yes | No | **Missing** |

### Gaps

- This is the largest single feature gap. The entire camera streaming, recording, and management stack is unbuilt.

---

## 14. Weather

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| NOAA weather alert display | Yes | No | **Missing** |
| Alert snooze / hush controls | Yes | No | **Missing** |
| Current conditions display | Yes | No | **Missing** |
| Weather radio device integration | Yes | No | **Missing** |

### Gaps

- Entire weather subsystem is absent from the modern client.

---

## 15. People & Permissions

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Person list | Yes | Yes | **Done** |
| Invite person (email, relationship) | Yes | Yes | **Done** |
| Accept/decline invitations | Yes | Yes | **Done** |
| PIN creation during invitation acceptance | Yes | Yes | **Done** |
| Person detail (role, email, phone) | Yes | Yes | **Done** |
| Remove person from place | Yes | Yes | **Done** |
| Change PIN per person/place | Yes | Yes | **Done** |
| Relationship tagging (spouse, friend, service, etc.) | Yes | Yes | **Done** |
| Invitation code display with copy | Yes | Yes | **Done** |
| Cancel pending invitations | Yes | No | **Missing** |
| Full-access vs partial-access roles | Yes | No | **Missing** |
| Ownership transfer / designation | Yes | No | **Missing** |

### Gaps

- Cancel pending outgoing invitations.
- Full-access vs partial-access (PIN-only) person roles.
- Ownership transfer.
- **Bug:** Contact info does not load on the person detail view.

---

## 16. Places & Multi-Place

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Multi-place support | Yes | Yes | **Done** |
| Place switching | Yes | Yes | **Done** |
| Add new place | Yes | Yes | **Done** |
| Place settings (name, address) | Yes | Yes | **Done** |
| Place deletion | Yes | No | **Missing** |
| Service level display | Yes | No | **Missing** |
| Cellular backup status | Yes | No | **Missing** |

### Gaps

- Place deletion.
- Service level and cellular backup status display.

---

## 17. Settings & Account

### 17.1 Profile

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Name editing | Yes | Yes | **Done** |
| Phone editing | Yes | Yes | **Done** |
| Email display | Yes | Yes | **Done** |
| Password change | Yes | Yes | **Done** |
| Email management (primary/secondary) | Yes | No | **Missing** |
| Phone verification | Yes | No | **Missing** |
| Security questions | Yes | No | **Missing** |
| Account deletion | Yes | No | **Missing** |

### 17.2 Billing & Subscription

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Service plan display | Yes | No | **Missing** |
| Plan upgrade / downgrade | Yes | No | **Missing** |
| Payment method management (Recurly) | Yes | No | **Missing** |
| Billing address management | Yes | No | **Missing** |
| Invoice history | Yes | No | **Missing** |

### 17.3 Notification Preferences

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| In-app toast notifications | Yes | Yes | **Done** |
| Notification call tree (alarm escalation) | Yes | No | **Missing** |
| Push notification settings | Yes | No | **Missing** |
| Email notification preferences | Yes | No | **Missing** |
| Quiet hours / do-not-disturb | Yes | No | **Missing** |

### Gaps

- ~~**Bug:** Saving Profile → Edit Contact Info could blank the user's first and last name.~~ **DONE.** The form was seeded from `auth.person` (often just the session payload, with no names) and always wrote all three fields. `ContactInfoPanel` now loads the person with `base:GetAttributes` and stays disabled until that succeeds (error toast + retry on failure; a sign-in-again message with no session). It sends only the fields that changed, trimmed, and checks only those: names can't be blanked, and a changed phone must be a US number (phone characters only, 10 digits or 11 starting with 1, via `useFormValidation`'s new `phoneNumber` rule). Phones are sent as `(555) 123-4567`, the format the platform stores. Errors show after Save and follow typing, not blur. The Profile card refreshes after a save once #13 (`auth.person` follows the person's `base:ValueChange`) is merged.
- Billing and subscription management is entirely absent.
- Notification preferences and call tree management.
- Account-level features (email management, phone verification, security questions, account deletion).

---

## 18. Hub & Network Management

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Hub status display (online/offline) | Yes | Yes | **Done** |
| Hub reboot | Yes | Yes (via MCP) | **Done** |
| Z-Wave network heal | Yes | Yes | **Done** |
| Z-Wave device removal | Yes | Yes | **Done** |
| Zigbee network scan | Yes | Yes (via MCP) | **Done** |
| Hub firmware update workflow | Yes | No | **Missing** |
| Hub WiFi configuration (SSID, password, scan) | Yes | No | **Missing** |
| Hub name configuration | Yes | No | **Missing** |
| Cellular backup activation & status | Yes | No | **Missing** |
| Z-Wave network topology / neighbor info | Yes | No | **Missing** |
| Z-Wave node metrics (signal strength, routing) | Yes | No | **Missing** |
| Zigbee channel info / radio statistics | Yes | Partial (via MCP) | **Partial** |
| Hub sounds / volume control | Yes | No | **Missing** |
| Hub 4G data usage | Yes | No | **Missing** |

### Gaps

- Hub firmware update workflow.
- Hub WiFi and network configuration.
- Cellular backup management.
- Advanced Z-Wave diagnostics (topology, per-node metrics).
- Hub audio/sound settings.

---

## 19. Pairing & Device Setup

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Hub registration | Yes | Yes | **Done** |
| Product-specific pairing instructions | Yes | Yes | **Done** |
| Device search with timeout | Yes | Yes | **Done** |
| Device customization (name, favorite) | Yes | Yes | **Done** |
| Completion with success/failure | Yes | Yes | **Done** |
| Kit activation flow | Yes | Yes | **Done** |
| Hub WiFi configuration during setup | Yes | No | **Missing** |
| Cloud device pairing (Nest, Hue, Lutron) | Yes | No | **Missing** |
| Care alarm interrupt (cancel pairing on alert) | Yes | No | **Missing** |
| Incident interrupt (cancel pairing on alarm) | Yes | No | **Missing** |

### Gaps

- Hub WiFi configuration during pairing.
- Cloud device / third-party bridge pairing flows.
- Pairing interruption on alarm/care events.

---

## 20. History / Activity Log

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Chronological activity feed | Yes | Yes | **Done** |
| Infinite scroll / load more | Yes | Yes (Load More button) | **Done** |
| Filter by device | Yes | Yes (not functional) | **Broken** |
| Date-based grouping | Yes | Yes | **Done** |
| Refresh button | Yes | Yes | **Done** |
| Premium history (14+ days) | Yes | Yes (tier-based limits) | **Done** |

### Gaps

- **Bug:** The device filter on the History page does not actually filter activity by the selected device.

---

## 21. Professional Monitoring

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Pro monitoring signup wizard | Yes | Yes (7-step) | **Done** |
| Address verification | Yes | Yes | **Done** |
| Household details (adults, children, pets, directions) | Yes | Yes | **Done** |
| Permit information | Yes | Yes | **Done** |
| PIN verification for activation | Yes | Yes | **Done** |
| Connection test call | Yes | Yes | **Done** |
| Post-activation settings management | Yes | Yes | **Done** |
| Trial activation | Yes | No | **Missing** |
| Monthly vs annual plan selection | Yes | No | **Missing** |

### Gaps

- Trial activation flow.
- Plan duration selection (monthly vs annual).

---

## 22. Product Catalog

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Browse products by brand | Yes | Yes | **Done** |
| Product search | Yes | Yes | **Done** |
| Filter by hub-required vs non-hub | Yes | Yes | **Done** |
| Product detail with pairing navigation | Yes | Yes | **Done** |
| Hub online validation before pairing | Yes | Yes | **Done** |

### Gaps

None.

---

## 23. Favorites

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Favorite devices | Yes | Yes | **Done** |
| Favorite scenes | Yes | No toggle UI yet (card reads tag) | **Partial** |
| Favorite rules | Yes | No toggle UI yet | **Missing** |
| Dashboard favorites card | Yes | Yes | **Done** |
| Toggle favorite from device detail | Yes | Yes | **Done** |

### Gaps

- Scene and rule favorite **toggles** are not yet exposed in the UI. The
  underlying mechanism now works — the dashboard favorites card recognizes any
  object tagged `FAVORITE` — so adding a star control to the scene/rule lists
  that calls `setFavorite()` (`@/lib/favorites`) is all that remains.

### Notes

- **Fixed:** Favoriting now persists. It is stored as the `FAVORITE` tag in
  `base:tags` and toggled via `base:AddTags` / `base:RemoveTags` (matching the
  legacy client), replacing the made-up `dev:favorite` / `scene:favorite`
  attributes the platform silently ignored. Shared helpers live in
  `@/lib/favorites` (`isFavorite`, `setFavorite`, `FAVORITE_TAG`).

---

## 24. Home & Family (Presence)

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| Presence status display | Yes | Yes | **Done** |
| Home/away detection | Yes | Yes | **Done** |
| Mobile device tracking | Yes | No | **Missing** |
| Assign presence sensor to person | Yes | No | **Missing** |

### Gaps

- Mobile device presence tracking.
- Presence sensor assignment to people.

---

## 25. API Keys & Integrations (Modern-Only)

| Feature | Legacy | Modern | Status |
|---------|--------|--------|--------|
| API key creation with label | No | Yes | **Modern-only** |
| Role-based permission matrix | No | Yes | **Modern-only** |
| Revoke / delete keys | No | Yes | **Modern-only** |
| Copy token to clipboard | No | Yes | **Modern-only** |

This is a new feature in the modern client with no legacy equivalent.

---

## Priority Summary

### Tier 1 — High-Impact Gaps (Core Smart Home Functionality)

These are commonly used features that users will expect:

1. **Camera streaming & recording** — Live HLS streaming, recording playback, clips browser, camera settings. This is the single largest gap.
2. ~~**Alarm device participation & settings**~~ — **DONE.** Device participation (ON/PARTIAL/both/none), notification call tree (ordered, enable/disable, reorder), delay settings (exit/entrance per mode), silent alarm, arming sounds, panic button.
3. **Thermostat scheduling** — Temperature programs by time-of-day and day-of-week.
4. **Notification call tree (Care)** — Ordered contact escalation for care events (alarm call tree is done).
5. **Billing & subscription management** — Service plan display, payment methods, invoicing.

### Tier 2 — Important Gaps (Full Feature Parity)

6. **Care behavior CRUD** — Create, edit, delete care behaviors with device/time/threshold configuration.
7. **Lock access management** — PIN assignment per person, temporary PINs with expiry.
8. **Hub firmware updates** — Firmware version display and update workflow.
9. **Hub WiFi configuration** — WiFi SSID/password setup, network scanning.
10. **Irrigation scheduling & zone control** — Per-zone start/stop, schedule modes (even/odd/interval).
11. **Rule scheduling** — Enable/disable rules on time-based schedules. (Scene scheduling is done.)
12. **Account management** — Account deletion, email management, security questions.

### Tier 3 — Completeness Gaps (Niche Device Types & Polish)

13. **Water heater & softener controls** — Mode, temperature, salt level, recharge settings.
14. **Shade / blind controls** — Position and tilt control.
15. **Weather subsystem** — NOAA alerts, current conditions, weather radio integration.
16. **Thermostat fan mode & min/max enforcement** — Fan control, setpoint limits, separation enforcement.
17. **Advanced device info** — Power usage, signal strength, OTA firmware status.
18. **Keypad, pet door, button/pendant, Halo device controls** — Niche device type support.
19. **Cloud device pairing** — Nest, Hue, Lutron bridge pairing flows.
20. **Hub advanced features** — Sounds/volume, cellular backup, Z-Wave topology, 4G usage.
21. **Mobile device presence tracking** — Phone location for home/away detection.
22. **Ownership transfer, place deletion, cancel invitations** — Account and place lifecycle.
23. **Pro monitoring trial & plan selection** — Trial activation, monthly vs annual.
24. **Consolidate the dashboard card ↔ subsystem mappings** — The home page keeps
    its own `SERVICE_TO_NAMESPACE` table (`src/app/(authenticated)/home/page.tsx`)
    alongside `subsystemConfigs` (`src/lib/subsystemConfig.ts`), which already
    maps each subsystem to its namespace, slug and device attributes. Fold the
    card's preference key (`serviceName`, e.g. `DOORS_N_LOCKS`) into
    `SubsystemConfigEntry` so there is one source of truth, and use it from the
    Preferences page too — it currently has a third list of card keys
    (`favorites`, `doorsLocks`, …) and writes `dashboard:cards` / `dashboard:hidden`
    while the home page reads `dashboardCards`, so saved preferences never
    affect the dashboard.
25. **Split `login/page.tsx` into per-view components** — The login route
    (`src/app/login/page.tsx`, ~570 lines) defines four views in one file:
    `LoginForm`, `SendCodeForm`, `ResetPasswordForm` and `ResetConfirmation`,
    plus the branding shell, switched on `?view=`. That breaks the
    one-component-per-file convention in CLAUDE.md and makes each form hard to
    unit-test in isolation. Move each form into its own file under
    `src/components/login/` (sharing the validation constraints from a
    `constraints.ts`), keep `page.tsx` as the thin `?view=` router + layout, and
    give each component its own test file.
26. ~~**Fix the Alarms `deviceAttributes` in `subsystemConfig`**~~ — **DONE.**
    The Alarms entry listed `subsecurity:securityDevices` / `subsafety:totalDevices`
    under the `subalarm` namespace, so `useSubsystemDevices('subalarm')` found no
    devices. Fixed the same way as Lights & Switches and Water: it now points at
    device lists that live on the alarm subsystem itself — the per-alert `Alarm`
    capability instances, `alarm:devices:<SECURITY|PANIC|SMOKE|CO|WATER>`.
    Covered by `src/__tests__/hooks/useSubsystem.test.ts`.

---

## Testing

Containerized testing (running a production build in Docker against the dev platform),
authentication setup, and related workflows are documented in [`testing.md`](./testing.md).

### End-to-end coverage

Every area marked **Done** above has Cypress coverage in `cypress/e2e/` (see
[`testing.md` → End-to-End Tests](./testing.md#end-to-end-tests)). The specs run
against an in-browser fake of the platform, so they exercise the real UI, the
Bridge/Cornea round trip and the `base:ValueChange` handling without a backend.
Objects a test creates are removed after each test.

Bugs found and fixed while writing the suite:

- Home dashboard looked for the presence subsystem under `subpresence`; the
  platform namespace is `subspres` (`PresenceSubsystem.NAMESPACE`), so the
  Home & Family card never rendered.
- Lights & Switches and Water dashboard cards read the device list from
  `swit:state` / `valv:valvestate` on the subsystem instead of
  `sublightsnswitches:switchDevices` / `subwater:waterDevices`, so they always
  showed 0.
- The invite page read the invitation off the `invite:GetInvitation` wrapper
  instead of its `invitation` field, so the confirm step showed "Hello!" and an
  empty inviter/place.
- Hub registration only treated states starting with `error` as failures, so an
  invalid Hub ID (`request.param.invalid`) left the wizard spinning.
- `useFormValidation.formValidates` did not mark fields as visited, so a bare
  submit of the create-account form showed no validation errors.

Still open (documented by a skipped E2E test): the History device filter
(§20) sends `place:ListHistoryEntries` to a device address.
