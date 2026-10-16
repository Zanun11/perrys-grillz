# PERRY'S GRILLZ — Island Kitchen & Grill

Full-stack restaurant site (Perchance generator).

## What it is
- 20 real dishes, photos cropped from the 5 user-provided collages → `src/images/*.jpg` (upscaled 6× to ~960px HD-ready; source screenshots were ~160px so true 4K detail can't be invented — these are clean HD display assets).
- Prices in **Seychelles Rupees (Rs / SCR)**.
- Sections: Hero, Menu (filter + search), Reserve, Reviews, Visit, Cart drawer, My Orders, Perry chatbot.

## Architecture
- `main.pjs` — `$meta` + imports (`kv-plugin`, `ai-text-plugin`).
- `src/menu.js` — `window.MENU` (id, name, price in Rs, cat, img, badge, desc), `window.CATS`, `window.RESTAURANT`.
- `src/styles.css` — all styling.
- `src/store.js` — `window.Store`: cart in localStorage; orders / reservations / reviews in `root.kv` (fallback to localStorage if kv unavailable).
- `src/chatbot.js` — `window.Koko` (= `window.PerryBot`): rule-based brain (popular, veg, hours, prices, add-to-cart, cart, booking) + `generateText` AI fallback with menu in prompt, prices in Rs.
- `src/app.js` — rendering, cart drawer, checkout, reservations, reviews, chat UI, boot.
- `index.html` — layout only, loads the above.

## Backend (shared + secure)
- `src/supabase.js` (`window.Backend`) — Supabase REST adapter. Keys live only in
  each device's localStorage (entered in the ⚙️ Backend panel), never in code.
- `src/supabase-schema.sql` — run once in the Supabase SQL editor. Creates
  `orders`, `reservations`, `reviews` + Row Level Security (anon key can insert,
  read, and advance order status; nothing can be deleted via the website key).
- `src/store.js` routes every read/write through Supabase when connected
  (pill shows 🟢 Shared), otherwise kv-plugin, otherwise localStorage (🟡 Local).
- Shared live orders board (📋, auto-refresh 10s) with staff status flow:
  received → preparing → ready → done.
- Privacy note: the shared board lets any site visitor read orders (incl. phone
  numbers). For stricter privacy, add Supabase Auth later and tighten SELECT.
- Perry AI: rule-based brain + `ai-text-plugin` fallback (verified live).

## Rebuild images
Source collages were in `scratch/message-attachments/` (not shipped). To rebuild: split each 2×2 grid at 50% with 6px gutter, save quadrants to `src/images/<slug>.jpg`, upscale 6× with smoothing (see chat history). Slugs match `MENU[].id`.
