#include <pebble.h>

// AppMessage keys — must match messageKeys order in package.json
#define KEY_WEATHER 0
#define KEY_QUOTE   1

// Screen dimensions (emery: Pebble Time 2, 200×228 rectangular)
#define W 200
#define H 228
#define CX (W / 2)
#define CY (H / 2)

// Layout Y positions derived from the reference JS implementation:
//   middleY = 114, timeFont.height ≈ 28, smallFont.height ≈ 18, tinyFont.height ≈ 14
//   timeY   = middleY - 28*2 - 10 = 48
//   timeY2  = middleY - 28   - 10 = 76
//   dateY   = H - 18 - 18 - 7    = 185  (imperial date)
//   weatherY = H - 18 - 5        = 205
#define LAYOUT_TIME1_Y   48
#define LAYOUT_TIME2_Y   76
#define LAYOUT_DATE_Y    17
#define LAYOUT_IMP_Y    185
#define LAYOUT_WEATHER_Y 205
#define LAYOUT_TINY_H    14   // approx height of GOTHIC_14 for quote spacing

// ── Global state ──────────────────────────────────────────────────────────────
static Window             *s_window;
static Layer              *s_canvas;
static GFont               s_font_time;   // Gothic 28  — fuzzy time lines
static GFont               s_font_small;  // Gothic 18  — date / weather / exact time
static GFont               s_font_tiny;   // Gothic 14  — imperial date / quote

static char                s_weather[64]  = "Loading...";
static char                s_quote[512]   = "++ THOUGHT FOR THE DAY ++|--- REDACTED ---";
static bool                s_bt_connected = true;
static BatteryChargeState  s_battery;
static struct tm           s_now;

// ── Look-up tables ────────────────────────────────────────────────────────────
static const char *HOURS[] = {
    "twelve","one","two","three","four","five","six",
    "seven","eight","nine","ten","eleven","twelve"
};
static const char *WEEKDAYS[] = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};
static const char *MONTHS[]   = {
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sept","Oct","Nov","Dec"
};

// ── Helpers ───────────────────────────────────────────────────────────────────

static const char *day_ordinal(int d) {
    if (d == 1 || d == 21 || d == 31) return "st";
    if (d == 2 || d == 22)            return "nd";
    if (d == 3 || d == 23)            return "rd";
    return "th";
}

// Convert a fraction (num/denom) of a full circle to a Pebble trig angle.
static int32_t frac_angle(int32_t num, int32_t denom) {
    return (int32_t)((int64_t)TRIG_MAX_ANGLE * num / denom);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

static void draw_hand(GContext *ctx, int cx, int cy, int32_t angle,
                      int length, GColor color, int thickness) {
    int x2 = cx + (int32_t)(sin_lookup(angle) * length / TRIG_MAX_RATIO);
    int y2 = cy - (int32_t)(cos_lookup(angle) * length / TRIG_MAX_RATIO);
    graphics_context_set_stroke_color(ctx, color);
    graphics_context_set_stroke_width(ctx, (uint8_t)thickness);
    graphics_draw_line(ctx, GPoint(cx, cy), GPoint(x2, y2));
}

// Draw text centred horizontally at y with a 3-layer drop-shadow:
//   (+1,+1) dark grey  →  (0,0) mid grey  →  (-1,-1) white
static void draw_shadowed_text(GContext *ctx, const char *text, GFont font, int y) {
    GRect measure = GRect(0, 0, W, 50);
    GSize sz = graphics_text_layout_get_content_size(
        text, font, measure, GTextOverflowModeWordWrap, GTextAlignmentLeft);
    int x = (W - sz.w) / 2;

    graphics_context_set_text_color(ctx, GColorDarkGray);
    graphics_draw_text(ctx, text, font, GRect(x + 1, y + 1, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
    graphics_context_set_text_color(ctx, GColorLightGray);
    graphics_draw_text(ctx, text, font, GRect(x, y, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, text, font, GRect(x - 1, y - 1, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
}

// Draw text centred horizontally at y with a 2-layer green shadow (for quotes).
static void draw_quote_line(GContext *ctx, const char *text, int y) {
    GRect measure = GRect(0, 0, W, 30);
    GSize sz = graphics_text_layout_get_content_size(
        text, s_font_tiny, measure, GTextOverflowModeWordWrap, GTextAlignmentLeft);
    int x = (W - sz.w) / 2;

    graphics_context_set_text_color(ctx, GColorDarkGreen);
    graphics_draw_text(ctx, text, s_font_tiny, GRect(x + 1, y + 1, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
    graphics_context_set_text_color(ctx, GColorGreen);
    graphics_draw_text(ctx, text, s_font_tiny, GRect(x, y, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
}

// Draw text centred horizontally at y in white.
static void draw_centred_text(GContext *ctx, const char *text, GFont font, int y) {
    GRect measure = GRect(0, 0, W, 30);
    GSize sz = graphics_text_layout_get_content_size(
        text, font, measure, GTextOverflowModeWordWrap, GTextAlignmentLeft);
    int x = (W - sz.w) / 2;
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, text, font, GRect(x, y, sz.w + 4, sz.h + 4),
                       GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
}

// ── Canvas update ─────────────────────────────────────────────────────────────

static void canvas_update_proc(Layer *layer, GContext *ctx) {

    // ── Background ──
    graphics_context_set_fill_color(ctx, GColorBlack);
    graphics_fill_rect(ctx, GRect(0, 0, W, H), 0, GCornerNone);

    // ── Analog hands ──
    // maxLength = (min(W,H) - 20) / 2 = (200-20)/2 = 90
    const int MAX_LEN = 90;
    int hour   = s_now.tm_hour % 12;
    int minute = s_now.tm_min;

    int32_t min_angle  = frac_angle(minute, 60);
    int32_t hour_angle = frac_angle(hour * 60 + minute, 12 * 60);

    // Hour hand: wide shadow then narrower colour
    draw_hand(ctx, CX, CY, hour_angle, MAX_LEN / 2, GColorFromRGB(85, 85, 170), 8);
    draw_hand(ctx, CX, CY, hour_angle, MAX_LEN / 2, GColorFromRGB(0, 0, 170),   4);
    // Minute hand: wide shadow then narrower colour
    draw_hand(ctx, CX, CY, min_angle,  MAX_LEN,     GColorFromRGB(85, 85, 255), 6);
    draw_hand(ctx, CX, CY, min_angle,  MAX_LEN,     GColorBlue,                 2);

    // ── Battery bar ──
    // bar: 2/3 screen width, centred, y=5, height=8
    int bar_w  = (W * 2) / 3;             // 133 (matches JS float behaviour)
    int bar_x  = (W - bar_w) / 2;         // 33
    int pct    = s_battery.charge_percent;
    GColor bar_color = (pct <= 20) ? GColorRed
                     : (pct <= 40) ? GColorChromeYellow
                     :               GColorGreen;
    int fill_w = (pct * (bar_w - 4)) / 100;

    graphics_context_set_fill_color(ctx, GColorWhite);
    graphics_fill_rect(ctx, GRect(bar_x,     5, bar_w,     8), 0, GCornerNone);
    graphics_context_set_fill_color(ctx, GColorBlack);
    graphics_fill_rect(ctx, GRect(bar_x + 1, 6, bar_w - 2, 6), 0, GCornerNone);
    graphics_context_set_fill_color(ctx, bar_color);
    graphics_fill_rect(ctx, GRect(bar_x + 2, 7, fill_w,    4), 0, GCornerNone);

    // ── Bluetooth disconnect indicator ──
    if (!s_bt_connected) {
        graphics_context_set_text_color(ctx, GColorRed);
        graphics_draw_text(ctx, "X", s_font_small,
                           GRect(W - 20, 2, 18, 22),
                           GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
    }

    // ── Compute text strings ──
    char fuzzy1[32], fuzzy2[32], exact_time[20], date_str[32];
    {
        int h = s_now.tm_hour;
        int m = s_now.tm_min;

        // Exact time — uses original h before fuzzy modification
        int exact_h = (h >= 13) ? h - 12 : h;
        snprintf(exact_time, sizeof(exact_time), "%d:%02d %s",
                 exact_h, m, h >= 12 ? "pm" : "am");

        // Date string
        int d = s_now.tm_mday;
        snprintf(date_str, sizeof(date_str), "%s %d%s %s",
                 WEEKDAYS[s_now.tm_wday], d, day_ordinal(d), MONTHS[s_now.tm_mon]);

        // Fuzzy time — may modify h and m
        const char *prefix   = "";
        const char *suffix   = "";
        const char *min_name = "";

        if (m <= 33) {
            prefix = "past";
        } else {
            prefix = "to";
            m = 60 - m;
            h++;
        }
        if (h >= 12) h -= 12;
        // Clamp for array safety
        if (h < 0)   h = 0;
        if (h > 12)  h = 12;

        if (m < 4)       { min_name = "";          suffix = "o'clock"; prefix = ""; }
        else if (m < 8)  { min_name = "five"; }
        else if (m < 13) { min_name = "ten"; }
        else if (m < 18) { min_name = "quarter"; }
        else if (m < 23) { min_name = "twenty"; }
        else if (m < 27) { min_name = "twentyfive"; }
        else             { min_name = "half"; }

        snprintf(fuzzy1, sizeof(fuzzy1), "%s %s", min_name, prefix);
        snprintf(fuzzy2, sizeof(fuzzy2), "%s %s", HOURS[h], suffix);
    }

    // ── Fuzzy time (two lines, drop-shadow) ──
    draw_shadowed_text(ctx, fuzzy1, s_font_time, LAYOUT_TIME1_Y);
    draw_shadowed_text(ctx, fuzzy2, s_font_time, LAYOUT_TIME2_Y);

    // ── Date string ──
    draw_centred_text(ctx, date_str, s_font_small, LAYOUT_DATE_Y);

    // ── Imperial date ──
    {
        char imperial[32];
        int year     = 1900 + s_now.tm_year;
        int yearpart = year % 1000;
        int millen   = year / 1000;
        // Hours elapsed in year: tm_yday is 0-based (Jan 1 = 0)
        int hour_of_year = s_now.tm_yday * 24 + s_now.tm_hour;
        int part = (int)(hour_of_year / 8.744744) + 1;
        if (part < 1)   part = 1;
        if (part > 999) part = 999;
        snprintf(imperial, sizeof(imperial), "0 %03d %03d.M%d1", part, yearpart, millen);
        draw_centred_text(ctx, imperial, s_font_tiny, LAYOUT_IMP_Y);
    }

    // ── Quote (pipe-delimited lines above imperial date) ──
    {
        char buf[512];
        strncpy(buf, s_quote, sizeof(buf) - 1);
        buf[sizeof(buf) - 1] = '\0';

        // Count lines
        int line_count = 1;
        for (int i = 0; buf[i]; i++) {
            if (buf[i] == '|') line_count++;
        }

        char *line = strtok(buf, "|");
        int remaining = line_count;
        while (line) {
            int y = LAYOUT_IMP_Y - remaining * LAYOUT_TINY_H - 2;
            draw_quote_line(ctx, line, y);
            remaining--;
            line = strtok(NULL, "|");
        }
    }

    // ── Weather (bottom-left) and exact time (bottom-right) ──
    {
        graphics_context_set_text_color(ctx, GColorWhite);
        graphics_draw_text(ctx, s_weather, s_font_small,
                           GRect(5, LAYOUT_WEATHER_Y, 95, 22),
                           GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);

        GRect measure = GRect(0, 0, W, 22);
        GSize sz = graphics_text_layout_get_content_size(
            exact_time, s_font_small, measure, GTextOverflowModeWordWrap, GTextAlignmentLeft);
        int x = W - sz.w - 5;
        graphics_draw_text(ctx, exact_time, s_font_small,
                           GRect(x, LAYOUT_WEATHER_Y, sz.w + 4, 22),
                           GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
    }
}

// ── Service callbacks ─────────────────────────────────────────────────────────

static void tick_handler(struct tm *tick_time, TimeUnits changed) {
    s_now = *tick_time;
    layer_mark_dirty(s_canvas);
}

static void battery_handler(BatteryChargeState state) {
    s_battery = state;
    layer_mark_dirty(s_canvas);
}

static void bt_handler(bool connected) {
    s_bt_connected = connected;
    layer_mark_dirty(s_canvas);
}

static void inbox_received_handler(DictionaryIterator *iterator, void *context) {
    Tuple *weather_t = dict_find(iterator, KEY_WEATHER);
    Tuple *quote_t   = dict_find(iterator, KEY_QUOTE);

    if (weather_t) {
        strncpy(s_weather, weather_t->value->cstring, sizeof(s_weather) - 1);
        s_weather[sizeof(s_weather) - 1] = '\0';
    }
    if (quote_t) {
        strncpy(s_quote, quote_t->value->cstring, sizeof(s_quote) - 1);
        s_quote[sizeof(s_quote) - 1] = '\0';
    }

    layer_mark_dirty(s_canvas);
}

// ── Window lifecycle ──────────────────────────────────────────────────────────

static void main_window_load(Window *window) {
    Layer *root = window_get_root_layer(window);

    s_font_time  = fonts_get_system_font(FONT_KEY_GOTHIC_28);
    s_font_small = fonts_get_system_font(FONT_KEY_GOTHIC_18);
    s_font_tiny  = fonts_get_system_font(FONT_KEY_GOTHIC_14);

    s_canvas = layer_create(GRect(0, 0, W, H));
    layer_set_update_proc(s_canvas, canvas_update_proc);
    layer_add_child(root, s_canvas);

    // Seed time, battery, BT from current state
    time_t t  = time(NULL);
    struct tm *lt = localtime(&t);
    s_now     = *lt;
    s_battery = battery_state_service_peek();
    s_bt_connected = connection_service_peek_pebble_app_connection();

    // Subscribe to services
    tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
    battery_state_service_subscribe(battery_handler);
    connection_service_subscribe((ConnectionHandlers){
        .pebble_app_connection_handler = bt_handler
    });

    // Open AppMessage inbox — enough for weather (64) + quote (512)
    app_message_register_inbox_received(inbox_received_handler);
    app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
}

static void main_window_unload(Window *window) {
    layer_destroy(s_canvas);
    tick_timer_service_unsubscribe();
    battery_state_service_unsubscribe();
    connection_service_unsubscribe();
    app_message_deregister_callbacks();
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

static void init(void) {
    s_window = window_create();
    window_set_background_color(s_window, GColorBlack);
    window_set_window_handlers(s_window, (WindowHandlers){
        .load   = main_window_load,
        .unload = main_window_unload
    });
    window_stack_push(s_window, true);
}

static void deinit(void) {
    window_destroy(s_window);
}

int main(void) {
    init();
    app_event_loop();
    deinit();
    return 0;
}
