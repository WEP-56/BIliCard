-- BiliCard Enhanced UI & Danmaku Engine
local mp = require 'mp'
local msg = require 'mp.msg'
local assdraw = require 'mp.assdraw'

msg.info("BiliCard UI Script Loading...")

-- Settings
local settings = {
    -- UI Settings
    box_height = 80,
    ui_font_size = 32,
    color = 'FFFFFF',
    bg_color = '000000', -- Pure Black
    bg_alpha = '10',     -- Hex 00-FF, 10 is ~94% opaque
    button_color = 'EEEEEE',
    button_active_color = '44AAFF',
    
    -- Danmaku Settings
    danmaku_size = 30,
    danmaku_alpha = 0.8,
    danmaku_speed = 10,
    danmaku_font = 'Microsoft YaHei',
    danmaku_track_height = 40,
    max_tracks = 15
}

local state = {
    -- UI State
    show = true,
    last_activity = mp.get_time(),
    mouse_in_area = false,
    
    -- Danmaku State
    danmaku_list = {},
    danmaku_osd = mp.create_osd_overlay('ass-events'),
    tracks = {},
    last_update_time = mp.get_time(),
    danmaku_enabled = true
}

state.danmaku_osd.z = 1000

-- Initialize tracks
for i = 1, settings.max_tracks do
    state.tracks[i] = 0
end

-- Initialize MPV Properties for Danmaku
mp.set_property_bool("sub-visibility", true)
mp.set_property_number("sub-scale", settings.danmaku_size / 30)
local alpha_val = math.floor((1 - settings.danmaku_alpha) * 255)
mp.set_property("sub-ass-style-overrides", "Alpha=&H" .. string.format("%02X", alpha_val) .. "&")

-- =================================================================================================
-- Danmaku Engine
-- =================================================================================================

function add_danmaku(text, color, author)
    -- Same implementation...
    local w, h = mp.get_osd_size()
    if w == 0 then return end
    
    local color_hex = string.format("%06X", tonumber(color) or 0xFFFFFF)
    local r = string.sub(color_hex, 1, 2)
    local g = string.sub(color_hex, 3, 4)
    local b = string.sub(color_hex, 5, 6)
    local bgr = b .. g .. r
    
    local width_approx = string.len(text) * settings.danmaku_size * 0.5 
    local _, count = string.gsub(text, "[^\128-\193]", "")
    width_approx = count * settings.danmaku_size + (string.len(text) - count) * settings.danmaku_size * 0.5
    
    local now = mp.get_time()
    local best_track = -1
    
    for i = 1, settings.max_tracks do
        if now >= state.tracks[i] then
            best_track = i
            break
        end
    end
    
    if best_track == -1 then
        best_track = math.random(1, settings.max_tracks)
    end
    
    local speed_px_s = w / settings.danmaku_speed
    local clear_time = (width_approx + 50) / speed_px_s
    state.tracks[best_track] = now + clear_time
    
    local dm = {
        text = text,
        color = bgr,
        x = w,
        y = (best_track - 1) * settings.danmaku_track_height,
        w = width_approx,
        start_time = now,
        track = best_track
    }
    
    table.insert(state.danmaku_list, dm)
end

function update_danmaku()
    local now = mp.get_time()
    local w, h = mp.get_osd_size()
    if w == 0 then return end
    
    state.danmaku_osd.res_x = w
    state.danmaku_osd.res_y = h
    state.danmaku_osd.z = 1000

    local ass = assdraw.ass_new()
    local speed_px_s = w / settings.danmaku_speed
    local to_remove = {}
    
    for i, dm in ipairs(state.danmaku_list) do
        local time_alive = now - dm.start_time
        dm.x = w - (time_alive * speed_px_s)
        
        if dm.x + dm.w < 0 then
            table.insert(to_remove, i)
        else
            ass:new_event()
            local alpha_hex = string.format("%02X", math.floor((1 - settings.danmaku_alpha) * 255))
            ass:append(string.format('{\\an7\\fs%d\\fn%s\\1c&H%s&\\alpha&H%s&\\bord1\\shad0\\pos(%d,%d)}%s', 
                settings.danmaku_size,
                settings.danmaku_font,
                dm.color,
                alpha_hex,
                math.floor(dm.x),
                math.floor(dm.y),
                dm.text))
        end
    end
    
    for i = #to_remove, 1, -1 do
        table.remove(state.danmaku_list, to_remove[i])
    end
    
    state.danmaku_osd.data = ass.text
    state.danmaku_osd:update()
end

-- =================================================================================================
-- UI Engine
-- =================================================================================================

local buttons = {
    { name = "play", label = "Play", x = 30, w = 80, icon_play = "▶", icon_pause = "⏸" },
    { name = "danmaku", label = "Danmaku", x = 130, w = 80, icon_on = "💬", icon_off = "🗨" },
    { name = "size_minus", label = "A-", x = 230, w = 50 },
    { name = "size_plus", label = "A+", x = 290, w = 50 },
    { name = "alpha_minus", label = "O-", x = 360, w = 50 },
    { name = "alpha_plus", label = "O+", x = 420, w = 50 },
}

function get_button_at(x, y)
    local w, h = mp.get_osd_size()
    if y < h - settings.box_height then return nil end
    for i, btn in ipairs(buttons) do
        if x >= btn.x and x <= btn.x + btn.w then
            return btn
        end
    end
    return nil
end

function draw_ui()
    local w, h = mp.get_osd_size()
    if w == 0 or h == 0 then return end
    
    if not state.show then
        mp.set_osd_ass(w, h, "")
        return
    end
    
    local ass = assdraw.ass_new()
    
    -- Background
    ass:new_event()
    -- Explicitly set color and alpha. \1c&H000000& is Black.
    ass:append(string.format('{\\an7\\bord0\\shad0\\1c&H%s&\\alpha&H%s&\\pos(0,0)}', 
        settings.bg_color, 
        settings.bg_alpha))
    ass:draw_start()
    ass:rect_cw(0, h - settings.box_height, w, h)
    ass:draw_stop()
    
    -- Buttons
    for i, btn in ipairs(buttons) do
        local label = btn.label
        if btn.name == "play" then
            label = mp.get_property_bool("pause") and btn.icon_play or btn.icon_pause
        elseif btn.name == "danmaku" then
            label = state.danmaku_enabled and btn.icon_on or btn.icon_off
        end
        
        ass:new_event()
        ass:append(string.format('{\\an5\\fs%d\\1c&H%s&\\pos(%d,%d)}%s', 
            settings.ui_font_size, 
            settings.button_color,
            btn.x + btn.w/2, h - settings.box_height/2, 
            label))
    end
    -- Info Text
    ass:new_event()
    ass:append(string.format('{\\an4\\fs%d\\1c&HFFFFFF&\\pos(500,%d)}Size:%d  Alpha:%.1f', 
        20, h - settings.box_height/2, settings.danmaku_size, settings.danmaku_alpha))
        
    -- Time Position
    local pos = mp.get_property_number('time-pos', 0)
    local dur = mp.get_property_number('duration', 0)
    local time_str = string.format("%02d:%02d / %02d:%02d", 
        math.floor(pos/60), pos%60, 
        math.floor(dur/60), dur%60)
        
    ass:new_event()
    ass:append(string.format('{\\an6\\fs%d\\1c&HFFFFFF&\\pos(%d,%d)}%s', 
        settings.ui_font_size, w - 20, h - settings.box_height/2, time_str))
        
    mp.set_osd_ass(w, h, ass.text)
end

function on_click()
    if not state.show then return end
    local x, y = mp.get_mouse_pos()
    local btn = get_button_at(x, y)
    
    if btn then
        state.last_activity = mp.get_time() -- Reset timer on click
        if btn.name == "play" then
            mp.command("cycle pause")
        elseif btn.name == "danmaku" then
            state.danmaku_enabled = not state.danmaku_enabled
        elseif btn.name == "size_plus" then
            settings.danmaku_size = math.min(60, settings.danmaku_size + 2)
        elseif btn.name == "size_minus" then
            settings.danmaku_size = math.max(10, settings.danmaku_size - 2)
        elseif btn.name == "alpha_plus" then
            settings.danmaku_alpha = math.min(1.0, settings.danmaku_alpha + 0.1)
        elseif btn.name == "alpha_minus" then
            settings.danmaku_alpha = math.max(0.1, settings.danmaku_alpha - 0.1)
        end
        draw_ui()
    end
end

function on_mouse_move(_, pos)
    state.last_activity = mp.get_time()
    
    if not pos then return end
    local w, h = mp.get_osd_size()
    local in_area = pos.y > h - settings.box_height
    
    if in_area then
        state.mouse_in_area = true
        if not state.show then
            state.show = true
            draw_ui()
        end
    else
        state.mouse_in_area = false
        if not state.show then
            -- Show UI temporarily even if just moving mouse outside?
            -- Usually yes, standard players show UI on any mouse move.
            state.show = true
            draw_ui()
        end
    end
end

-- =================================================================================================
-- Hooks & Bindings
-- =================================================================================================

msg.info("Registering scripts...")
mp.register_script_message("osd-danmaku", add_danmaku)

mp.observe_property('time-pos', 'number', function() if state.show then draw_ui() end end)
mp.observe_property('pause', 'bool', function() if state.show then draw_ui() end end)
mp.add_key_binding("MBTN_LEFT", "click_handler", on_click)
mp.observe_property('mouse-pos', 'native', on_mouse_move)

-- Danmaku Loop
mp.add_periodic_timer(0.03, update_danmaku)

-- UI Auto-hide Loop
mp.add_periodic_timer(0.5, function()
    local now = mp.get_time()
    -- Hide if inactive for 2s AND mouse is NOT in the button area
    if state.show and (now - state.last_activity > 2) and not state.mouse_in_area then
        state.show = false
        draw_ui()
    end
end)

msg.info("BiliCard UI Ready")
