# Setup Traxio Bot + Telegram

Bot butuh **penjadwal** yang terus jalan. Ada dua mode — pilih salah satu, jangan dua-duanya
(dua penjadwal = pesan dobel, dan Telegram menolak polling kalau webhook terpasang).

| | Mode A — Laptop (lokal) | Mode B — Vercel (24/7) |
|---|---|---|
| Cek terjadwal | `bun run bot` (loop tiap 15 dtk) | cron-job.org → `GET /api/cron/bot` tiap 1 menit |
| Perintah Telegram (/status) | long polling di worker | webhook `POST /api/telegram/webhook` |
| Jalan saat laptop mati | ❌ | ✅ |

## Checklist awal (dua mode)

1. `.env` berisi `TELEGRAM_BOT_TOKEN` (dari @BotFather) dan `DATABASE_URL`.
2. Aplikasi → **Pengaturan → Notifikasi** → Hubungkan Telegram → klik *Start* di bot.
   Pastikan toggle **Ringkasan tiap cek** aktif.
3. Aplikasi → **Bot → Watchlist**: minimal 1 simbol (atau pakai default).
4. Aplikasi → **Bot → Pengaturan**: centang *Aktifkan*, pilih **Jarak cek**
   (4 jam = rekomendasi, 1 menit = testing), Simpan → pesan "▶️ Bot aktif" masuk ke Telegram.

## Mode A — Laptop

```bash
bun run bot
```

Biarkan terminal ini terbuka. Setiap cek mengirim ringkasan + jam cek berikutnya.
Setelah mengubah kode bot, **restart** worker (Ctrl+C lalu jalankan lagi).

## Mode B — Vercel

1. **Env di Vercel** (Project → Settings → Environment Variables), salin dari `.env`:
   `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET`,
   `DASHSCOPE_API_KEY` (kalau review AI dipakai), plus env auth yang sudah ada. Redeploy.
2. **Webhook Telegram** (sekali, dari laptop):
   ```bash
   npx tsx scripts/telegram-webhook.ts set https://<domain-vercel-kamu>
   npx tsx scripts/telegram-webhook.ts info   # cek url & last_error_message
   ```
3. **Cron** di [cron-job.org](https://cron-job.org) (gratis):
   - URL: `https://<domain-vercel-kamu>/api/cron/bot`
   - Schedule: every 1 minute
   - Advanced → Headers: `Authorization: Bearer <CRON_SECRET>`
   - Respons sukses: `{"processed":…,"logs":[…]}`; `401` = secret salah.
4. Matikan `bun run bot` di laptop (kalau masih jalan).

Endpoint cron cuma menjalankan user yang jadwalnya sudah lewat, jadi cron tiap 1 menit
tetap aman untuk interval 4 jam.

Kembali ke Mode A: `npx tsx scripts/telegram-webhook.ts delete`, lalu `bun run bot`.

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Tidak ada pesan sama sekali | Bot nonaktif, atau penjadwal tidak jalan (badge "Worker mati" di halaman Bot). |
| "0 simbol dicek, watchlist bot kosong" | Isi watchlist bot. |
| Jadwal tidak berubah setelah update kode | Worker lama masih jalan — restart `bun run bot`. |
| Log worker: `409` | Ada dua proses polling — tutup salah satu. |
| Pesan dobel | Mode A dan B jalan bersamaan. |
| /status tidak dibalas (Mode B) | `telegram-webhook.ts info` → lihat `last_error_message`. |
