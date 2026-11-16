# Recept

Photograph a receipt and Recept reads it for you: store, date, items, GST, total, what you saved and any loyalty points. Everything is saved to your own account so you can see how much you spend and save over time.

It is a personal project I built to learn how to combine an AI vision model, a hosted database and a login system into a real app. It works in the browser and installs on a phone like a native app. The interface is styled as a strip of thermal receipt paper on a dark desk.

> The live version is private (login required, sign-ups closed) because scans use my own Gemini key and receipts can contain personal details. To try it, follow the setup below with your own keys.

## Screenshots

| Scan | Spending | Savings |
| --- | --- | --- |
| ![Scan](docs/scan.png) | ![Spending](docs/spending.png) | ![Savings](docs/savings.png) |

## Features

- **Scan a receipt:** take a photo or choose one. The image is resized in the browser, then read by Google's Gemini model.
- **Check before saving:** the result prints out as a receipt. Tap any shaded value (store, date, total, GST, savings, points) to correct it.
- **Spending tab:** total spent, spend this month, average receipt, a monthly line chart (receipts in the same month are combined) and your five most recent receipts, with a "See all" dropdown for the rest.
- **Savings tab:** total saved, savings rate, each store's share of your savings as a percentage, and points per loyalty program.
- **Loyalty points:** only counted when the program is recognised as Flybuys or Everyday Rewards. Anything else is left out.
- **Store name tidying:** the same store under different names (for example "COLES 1234 BRUNSWICK" and "Coles Supermarkets") is grouped as one, with consistent capitalisation.
- **Private by default:** email and password login, each user can only see their own receipts, and the scan endpoint refuses anyone who is not signed in.
- **Installable:** works as a home screen app on iPhone and Android.

## How it works

```
Browser (single HTML page)
  1. Sign in with Supabase Auth
  2. Resize the receipt photo
  3. POST /api/scan with the login token
        |
        v
Express server
  4. Checks the token with Supabase
  5. Sends the image to the Gemini API
  6. Returns structured JSON (store, items, totals, points)
        |
        v
Browser
  7. You review and correct the result
  8. Saves to Supabase (Postgres, row-level security)
  9. Dashboard reads your receipts back
```

The Gemini key only ever lives on the server. The browser holds a Supabase publishable key, which is safe to expose because row-level security decides what each user can read and write.

## Tech stack

| Part | Choice |
| --- | --- |
| Front end | Plain HTML, CSS and JavaScript in one file (no build step) |
| Server | Node.js and Express |
| AI | Google Gemini API (`gemini-3.5-flash-lite`) via `@google/genai` |
| Login and database | Supabase Auth and Postgres via `@supabase/supabase-js` |
| Hosting | Render (free web service) |
| Phone install | Web app manifest and service worker (PWA) |
| Fonts | Courier Prime and Doto from Google Fonts |

## Run it yourself

### You will need

- Node.js 20.6 or newer
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)
- A free [Supabase](https://supabase.com) project

### 1. Install

```
git clone <https://github.com/dani3ll1u3745-sudo/Recept>
cd <https://github.com/dani3ll1u3745-sudo/Recept>
npm install
```

### 2. Set up the database

In Supabase, open SQL Editor and run:

```sql
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store text,
  date date,
  total numeric,
  gst numeric,
  total_savings numeric,
  points_earned numeric,
  points_balance numeric,
  loyalty_program text,
  offers jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

grant select, insert, update, delete on public.receipts to authenticated;

create policy "select own receipts" on public.receipts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own receipts" on public.receipts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own receipts" on public.receipts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own receipts" on public.receipts
  for delete to authenticated using ((select auth.uid()) = user_id);
```

Then go to Authentication, add your own user, and turn off "Allow new users to sign up" so the app stays private.

### 3. Add your keys

Create `public/config.js` with your Supabase project URL and publishable key (this key is designed to be public):

```js
window.RECEPT_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  key: "sb_publishable_YOUR_KEY"
};
```

Create a `.env` file in the project root (it is git-ignored, never commit it):

```
GEMINI_API_KEY=your-gemini-key
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_KEY=sb_publishable_YOUR_KEY
ALLOWED_EMAIL=you@example.com
```

`ALLOWED_EMAIL` is the only account allowed to run scans.

### 4. Start it

```
node --env-file=.env server.mjs
```

Open http://localhost:3000 and sign in.

To try it on a phone on the same wifi, open `http://YOUR-COMPUTER-IP:3000`.

## Deploying (Render)

1. Push the repo to GitHub and create a new Web Service on Render from it.
2. Build command: `npm install`. Start command: `node server.mjs`. Instance type: Free.
3. Add the environment variables `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_EMAIL` and `NODE_VERSION=22`.
4. Open the Render address on your phone and use Add to Home Screen.

Render's free tier sleeps after about 15 minutes without visits, so the first load afterwards can take up to a minute.

## Project structure

```
server.mjs                 Express server: login check and the Gemini scan endpoint
package.json
public/
  index.html               The whole front end
  config.js                Supabase URL and publishable key
  manifest.webmanifest     Makes the app installable
  sw.js                    Minimal service worker
  icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
```

## Notes on privacy and limits

- Receipts can include partial card numbers, names and loyalty numbers. On Gemini's free tier, Google may use prompts to improve its products, so avoid scanning sensitive receipts or use a paid key.
- The free tier has daily and per-minute request limits that change over time. Check the current numbers in AI Studio.
- Scan results are a first draft. Always check the values before saving.

## Ideas for next

- A public demo mode with sample receipts and no AI calls
- Spending categories (groceries, stationery and so on)
- Editing saved receipts
- Export to CSV
- Filtering by month, store or date range