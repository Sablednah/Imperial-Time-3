# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What we're building

A Pebble watchface for the **emery** and **gabbro** platforms (round Pebble watches) — a C rewrite of the Alloy/Moddable JavaScript watchface in `/mnt/d/Repos/sable/Imperial-Time-2/Imperial-Time-2`.

The theme is Warhammer 40K. The watchface displays:
- **Fuzzy time** — spoken English phrases ("twenty past three", "quarter to eight")
- **Analog clock hands** — hour and minute, with drop-shadow effect
- **Imperial dating system** — Warhammer 40K format: `0 NNN YYY.M21`
- **Warhammer 40K quotes** — fetched from `sabletopia.co.uk/ids2/quote.php` every 10 minutes, pipe-delimited (`|`) for multi-line display
- **Weather** — temperature + conditions from Open-Meteo API, refreshed hourly
- **Battery bar** — colour-coded (green/yellow/red) at top of screen
- **Bluetooth disconnect indicator** — "X" top-right when phone disconnected
- **Date** — short format e.g. "Mon 1st Jun"
- **Exact time** — small, bottom-right corner (e.g. "7:37 pm")

## Why C (not Alloy/Moddable)

The previous version (`Imperial-Time-2`) used the Alloy/Moddable approach (JavaScript on the watch via Moddable XS). After extensive debugging, that approach proved fragile:

- HTTP requests go through a phone proxy (`@moddable/pebbleproxy`) that starts up asynchronously — `minutechange` and `hourchange` events fire before the proxy is ready, causing all fetches to silently fail
- Sensor classes (`Location`, `HTTPClient`) are C-level singletons — if the watchface crashes while one is open, every subsequent restart throws an uncatchable "single instance only" abort, locking the watch in a crash loop
- `hourchange` fires immediately on `addEventListener` registration (same as `minutechange`), causing two concurrent `new Location({})` calls on startup
- The proxy layer is undocumented and undebuggable from user code

The C + pkjs architecture avoids all of this:
- Networking happens on the **phone** (pkjs) — `fetch()` just works, no proxy timing
- AppMessage sends data to the watch as simple key/value pairs
- The Pebble C SDK battery/GPS/tick APIs are reliable and well-documented
- No singleton sensor lifecycle to manage manually

## Architecture

```
Watch (C — src/c/main.c)               Phone (JS — src/pkjs/index.js)
─────────────────────────               ──────────────────────────────
Renders everything                      Fetches weather from Open-Meteo
Handles tick timer (minute)             Fetches quote from sabletopia.co.uk
Battery, Bluetooth callbacks            Sends data to watch via AppMessage
Receives AppMessage data          ←───
Computes fuzzy time locally
Computes Imperial date locally
```

## Key algorithms to port from Imperial-Time-2

These are implemented in `Imperial-Time-2/src/embeddedjs/main.js` and need porting to C:

**Fuzzy time** (`getFuzzyTime`): Takes hours/minutes, produces two lines like "twenty past" / "three o'clock". Minutes ≤ 33 → "past", > 33 → "to" (using `60 - minutes`, incrementing hour). Minute buckets: <4 = o'clock, <8 = five, <13 = ten, <18 = quarter, <23 = twenty, <27 = twentyfive, else = half.

**Imperial date** (`imperialTime`): `0 NNN YYY.M21` where NNN = zero-padded 3-digit part-of-year (1–876, computed as `floor(hours_elapsed_in_year / 8.744744) + 1`), YYY = last 3 digits of year, M21 = millennium indicator (first digit of year + "1").

**Drop-shadow text**: Each text string is drawn 3 times — offset (+1,+1) in dark grey, (0,0) in mid grey, (-1,-1) in white — to produce a layered shadow effect.

**Analog hands**: `drawHand(cx, cy, angle, length, color, thickness)` — draws from centre to `(cx + sin(angle)*length, cy - cos(angle)*length)`. Hour and minute hands each drawn twice (wider dark then narrower colour) for drop-shadow.

**Battery bar**: 2/3 screen width, centred, y=5, height=8. White border, black fill, coloured fill proportional to percentage. Colour: ≤20% red, ≤40% yellow, else green.

## AppMessage keys

Define in both C and pkjs:
- `KEY_WEATHER` (0) — string e.g. `"18°C Cloudy"`
- `KEY_QUOTE` (1) — pipe-delimited string e.g. `"++THOUGHT FOR THE DAY++|In the grim darkness..."`

## Build & Deploy

```bash
pebble build
pebble install --emulator emery    # emulator
pebble install --phone <IP>        # real watch via phone app developer mode
pebble logs --emulator emery       # stream logs
```

To reset emulator state if it gets into a crash loop:
```bash
bunzip2 -k -f ~/.pebble-sdk/SDKs/4.9.169/sdk-core/pebble/emery/qemu/qemu_spi_flash.bin.bz2 -c > ~/.pebble-sdk/4.9.169/emery/qemu_spi_flash.bin
rm -rf ~/.pebble-sdk/4.9.169/emery/app_cache ~/.pebble-sdk/4.9.169/emery/localstorage
```

## Documentation

Repebble (Pebble revival) SDK reference: https://developer.repebble.com  
LLM-friendly index: https://developer.repebble.com/llms.txt

Key guides:
- C watchface tutorial: https://developer.repebble.com/tutorials/watchface-tutorial/part1.md
- AppMessage / communication: https://developer.repebble.com/guides/communication/sending-and-receiving-data.md
- PebbleKit JS: https://developer.repebble.com/guides/communication/using-pebblekit-js.md

## Reference implementation

`/mnt/d/Repos/sable/Imperial-Time-2/Imperial-Time-2/src/embeddedjs/main.js` — the complete Alloy implementation with all display logic. Replicate the visual output exactly; the algorithms above are taken directly from that file.
