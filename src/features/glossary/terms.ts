import type { GlossaryCategory } from "./types"

export interface GlossaryTerm {
  id: string
  term: string
  /** Nama lengkap / kepanjangan istilah. */
  fullName?: string
  category: GlossaryCategory
  /** Penjelasan singkat dengan bahasa sehari-hari. */
  summary: string
  /** Cara membaca angka/sinyalnya. */
  howToRead?: string[]
  /** Bagaimana istilah ini dipakai di Traxio. */
  inTraxio?: string
  /** Contoh nyata. */
  example?: string
}

export const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  signal: "Sinyal & Skor",
  indicator: "Indikator Teknikal",
  market: "Istilah Pasar",
  risk: "Trading & Risiko",
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── Sinyal & Skor ────────────────────────────────────────────
  {
    id: "score",
    term: "Score",
    category: "signal",
    summary:
      "Angka 0–100 yang merangkum semua indikator teknikal jadi satu nilai. Semakin tinggi, semakin banyak indikator yang condong naik.",
    howToRead: [
      "Mulai dari 50 (netral), lalu ditambah/dikurangi oleh RSI, posisi harga terhadap SMA, MACD, dan Momentum.",
      "Warna bar: hijau ≥ 60, kuning 42–59, merah < 42.",
    ],
    inTraxio:
      "Ditampilkan sebagai \"SCORE xx/100\" di tab Analysis pada Watchlist dan halaman Analisis.",
  },
  {
    id: "signal",
    term: "Signal (STRONG BUY / BUY / HOLD / SELL / STRONG SELL)",
    category: "signal",
    summary:
      "Label yang diturunkan langsung dari Score. Ini ringkasan kondisi teknikal, bukan perintah untuk langsung membuka atau menutup posisi.",
    howToRead: [
      "STRONG BUY: Score ≥ 74",
      "BUY: Score 60–73",
      "HOLD: Score 42–59",
      "SELL: Score 28–41",
      "STRONG SELL: Score < 28",
    ],
    inTraxio:
      "Badge berwarna di bagian atas tab Analysis. Selalu cek juga tab News, volume, dan pasang stop-loss sendiri.",
  },
  {
    id: "hold",
    term: "HOLD",
    category: "signal",
    summary:
      "Kondisi netral: indikator saling bertentangan, jadi tidak ada sinyal beli/jual yang jelas.",
    howToRead: [
      "Belum punya posisi: artinya tunggu dulu, belum ada alasan kuat untuk beli.",
      "Sudah punya posisi: artinya tahan dulu, belum ada alasan kuat untuk jual.",
    ],
    example:
      "Harga di bawah SMA20/50 (tren turun) tapi MACD dan Momentum positif (ada pantulan) → hasilnya saling tarik → HOLD.",
  },
  {
    id: "bullish-bearish",
    term: "Bullish / Bearish",
    category: "signal",
    summary:
      "Bullish = kondisi atau ekspektasi harga naik. Bearish = kondisi atau ekspektasi harga turun.",
    inTraxio: "Di kolom Alasan, 🟢 berarti faktor bullish, 🔴 bearish, 🟡 hati-hati/lemah.",
  },
  {
    id: "confidence",
    term: "Confidence",
    category: "signal",
    summary:
      "Seberapa yakin sistem terhadap hasil analisisnya (Low / Medium / High). Confidence rendah berarti sinyalnya lemah atau datanya kurang mendukung.",
    inTraxio: "Dipakai di panel probabilitas dan keputusan Bot.",
  },

  // ── Indikator Teknikal ───────────────────────────────────────
  {
    id: "rsi",
    term: "RSI",
    fullName: "Relative Strength Index",
    category: "indicator",
    summary:
      "Mengukur seberapa kuat kenaikan dibanding penurunan dalam beberapa candle terakhir. Nilainya 0–100. Fungsinya untuk melihat apakah harga sudah naik/turun terlalu jauh.",
    howToRead: [
      "< 30: oversold (sudah turun banyak), sering jadi area pantulan.",
      "30–70: netral.",
      "> 70: overbought (sudah naik banyak), rawan koreksi.",
      "Angka dalam kurung, misalnya RSI(14), adalah jumlah candle yang dihitung.",
    ],
    inTraxio:
      "RSI < 25 menambah skor paling besar (+22), RSI > 75 mengurangi paling besar (−22). Periode bisa diatur di Settings.",
    example: "RSI 46.8 → netral, tidak jenuh beli maupun jenuh jual.",
  },
  {
    id: "sma",
    term: "SMA",
    fullName: "Simple Moving Average",
    category: "indicator",
    summary:
      "Rata-rata harga penutupan dalam N candle terakhir. Garis ini menghaluskan naik-turun harian supaya arah tren lebih mudah terlihat.",
    howToRead: [
      "SMA20 = rata-rata 20 candle (tren jangka pendek). SMA50 = rata-rata 50 candle (tren menengah).",
      "Harga di atas kedua SMA → uptrend.",
      "Harga di bawah kedua SMA → downtrend.",
      "Harga di antara keduanya → transisi / belum jelas.",
    ],
    inTraxio:
      "Harga di atas kedua MA menambah skor +18, di bawah keduanya mengurangi −18. Panjang MA bisa diatur di Settings.",
    example:
      "Harga 0.031 sementara SMA20 = 0.0325 dan SMA50 = 0.0337 → harga di bawah keduanya → tren turun.",
  },
  {
    id: "ema",
    term: "EMA",
    fullName: "Exponential Moving Average",
    category: "indicator",
    summary:
      "Mirip SMA, tapi candle yang lebih baru diberi bobot lebih besar. Jadi EMA bereaksi lebih cepat terhadap perubahan harga.",
    inTraxio:
      "Bot memakai EMA20, EMA50, dan EMA200 untuk menentukan tren. Uptrend jika harga > EMA20 > EMA50 > EMA200.",
  },
  {
    id: "macd",
    term: "MACD",
    fullName: "Moving Average Convergence Divergence",
    category: "indicator",
    summary:
      "Selisih antara EMA12 dan EMA26. Dipakai untuk melihat arah dan perubahan momentum. Ada dua garis: garis MACD dan garis Signal (EMA9 dari MACD).",
    howToRead: [
      "MACD > 0: rata-rata jangka pendek di atas jangka panjang, momentum cenderung naik.",
      "MACD < 0: momentum cenderung turun.",
      "Bullish crossover: garis MACD memotong ke atas garis Signal, tanda momentum mulai naik.",
      "Bearish crossover: garis MACD memotong ke bawah garis Signal, tanda momentum mulai turun.",
    ],
    inTraxio:
      "Crossover naik di zona positif +14, crossover naik saja +7. Kebalikannya −14 / −7.",
    example:
      "MACD 0.0009 dan di atas garis Signal → \"MACD bullish crossover di zona positif\".",
  },
  {
    id: "momentum",
    term: "Momentum",
    category: "indicator",
    summary:
      "Persentase perubahan harga dibanding 5 candle sebelumnya. Menunjukkan seberapa cepat harga bergerak belakangan ini.",
    howToRead: [
      "> +8%: kuat naik.",
      "+2% s/d +8%: positif.",
      "−2% s/d +2%: datar.",
      "< −8%: melemah tajam.",
    ],
    example: "Momentum +8.6% → dalam 5 candle terakhir harga naik 8.6%.",
  },
  {
    id: "crossover",
    term: "Crossover",
    category: "indicator",
    summary:
      "Saat dua garis indikator saling memotong. Sering dipakai sebagai tanda awal perubahan arah.",
    example: "MACD memotong garis Signal dari bawah ke atas = bullish crossover.",
  },
  {
    id: "oversold-overbought",
    term: "Oversold / Overbought",
    category: "indicator",
    summary:
      "Oversold = harga sudah turun terlalu banyak dalam waktu singkat (jenuh jual). Overbought = sudah naik terlalu banyak (jenuh beli).",
    howToRead: [
      "Oversold belum tentu langsung naik. Harga bisa tetap oversold cukup lama saat tren turun kuat.",
      "Overbought juga tidak otomatis turun. Ini tanda hati-hati, bukan sinyal jual pasti.",
    ],
  },
  {
    id: "atr",
    term: "ATR",
    fullName: "Average True Range",
    category: "indicator",
    summary:
      "Rata-rata besar gerakan harga per candle. Mengukur volatilitas (seberapa liar harga bergerak), bukan arah.",
    inTraxio:
      "Bot memakai ATR untuk menentukan jarak stop-loss supaya tidak terlalu dekat dengan gerakan normal harga.",
  },

  // ── Istilah Pasar ────────────────────────────────────────────
  {
    id: "candle",
    term: "Candle (Candlestick)",
    category: "market",
    summary:
      "Satu batang di chart yang mewakili satu periode waktu (misalnya 1 jam atau 1 hari). Isinya harga Open, High, Low, dan Close (OHLC).",
    howToRead: [
      "Hijau: harga Close lebih tinggi dari Open (naik di periode itu).",
      "Merah: harga Close lebih rendah dari Open (turun).",
      "Sumbu tipis di atas/bawah (wick) menunjukkan harga tertinggi dan terendah.",
    ],
  },
  {
    id: "interval",
    term: "Interval / Timeframe",
    category: "market",
    summary:
      "Lama waktu yang diwakili satu candle, misalnya 1h, 4h, 1d, 1w. Semua indikator dihitung berdasarkan interval ini.",
    howToRead: [
      "Interval kecil (1h): sinyal lebih cepat tapi lebih banyak noise.",
      "Interval besar (1d/1w): sinyal lebih lambat tapi lebih stabil.",
    ],
  },
  {
    id: "trend",
    term: "Trend (Uptrend / Downtrend)",
    category: "market",
    summary:
      "Arah umum harga dalam suatu periode. Uptrend: puncak dan lembah makin tinggi. Downtrend: makin rendah. Sideways: bergerak mendatar.",
  },
  {
    id: "rebound",
    term: "Rebound / Koreksi / Pullback",
    category: "market",
    summary:
      "Rebound: harga memantul naik setelah turun. Koreksi: harga turun sementara setelah naik. Pullback: koreksi kecil di dalam tren yang masih berjalan.",
  },
  {
    id: "volume",
    term: "Volume & Likuiditas",
    category: "market",
    summary:
      "Volume = jumlah aset yang diperdagangkan dalam satu periode. Likuiditas = seberapa mudah membeli/menjual tanpa menggeser harga terlalu jauh.",
    howToRead: [
      "Kenaikan harga dengan volume besar biasanya lebih bisa dipercaya.",
      "Aset dengan likuiditas rendah rawan slippage (harga eksekusi meleset dari harga yang terlihat).",
    ],
  },
  {
    id: "change24h",
    term: "Change 24h",
    category: "market",
    summary: "Persentase perubahan harga dibanding 24 jam yang lalu.",
    example: "−6.22% → harga sekarang 6.22% lebih rendah dari kemarin di jam yang sama.",
  },
  {
    id: "support-resistance",
    term: "Support / Resistance",
    category: "market",
    summary:
      "Support: area harga tempat penurunan cenderung tertahan (banyak pembeli). Resistance: area tempat kenaikan cenderung tertahan (banyak penjual).",
  },
  {
    id: "breakout",
    term: "Breakout / Fake Breakout",
    category: "market",
    summary:
      "Breakout: harga menembus support/resistance dan berlanjut. Fake breakout: sempat menembus lalu balik lagi, sering menjebak trader.",
    inTraxio: "Panel probabilitas menampilkan peluang breakout dan risiko fake breakout.",
  },

  // ── Trading & Risiko ─────────────────────────────────────────
  {
    id: "long-short",
    term: "Long / Short",
    category: "risk",
    summary:
      "Long = beli, untung kalau harga naik. Short = jual duluan (pinjam), untung kalau harga turun.",
    inTraxio: "Bot hanya membuka posisi LONG searah tren.",
  },
  {
    id: "position",
    term: "Posisi (Position)",
    category: "risk",
    summary:
      "Aset yang sedang kamu pegang dari sebuah trade yang belum ditutup. \"Belum punya posisi\" berarti kamu belum membeli apa pun.",
  },
  {
    id: "entry-exit",
    term: "Entry / Exit",
    category: "risk",
    summary: "Entry: harga saat kamu membuka posisi. Exit: harga saat kamu menutup posisi.",
  },
  {
    id: "stop-loss",
    term: "Stop-Loss (SL)",
    category: "risk",
    summary:
      "Harga batas yang kamu tentukan untuk menutup posisi secara otomatis kalau harga bergerak melawanmu, supaya kerugian tidak membesar.",
    example: "Beli di 100, SL di 95 → kerugian maksimal sekitar 5%.",
  },
  {
    id: "take-profit",
    term: "Take-Profit (TP)",
    category: "risk",
    summary:
      "Harga target untuk menutup posisi secara otomatis saat sudah untung.",
    example: "Beli di 100, TP di 110 → ambil untung saat harga menyentuh 110.",
  },
  {
    id: "rr",
    term: "R:R (Risk : Reward)",
    category: "risk",
    summary:
      "Perbandingan potensi rugi (jarak ke SL) dengan potensi untung (jarak ke TP).",
    example:
      "SL −5%, TP +10% → R:R = 1:2. Artinya setiap 1 bagian risiko, targetnya 2 bagian untung.",
  },
  {
    id: "pnl",
    term: "P&L (Profit and Loss)",
    category: "risk",
    summary:
      "Hasil untung atau rugi dari trade. Realized = dari posisi yang sudah ditutup. Unrealized = dari posisi yang masih terbuka (bisa berubah).",
  },
  {
    id: "winrate",
    term: "Win Rate",
    category: "risk",
    summary:
      "Persentase trade yang berakhir untung dari semua trade yang ditutup.",
    howToRead: [
      "Win rate tinggi belum tentu profit. Kalau ruginya besar dan untungnya kecil, total tetap bisa minus. Lihat juga R:R.",
    ],
  },
  {
    id: "leverage",
    term: "Leverage",
    category: "risk",
    summary:
      "Meminjam dana dari bursa supaya ukuran posisi lebih besar dari modal. Untung dan rugi ikut dikalikan.",
    example:
      "Leverage 10x: harga turun 10% saja bisa menghabiskan seluruh modal di posisi itu (likuidasi).",
  },
  {
    id: "drawdown",
    term: "Drawdown",
    category: "risk",
    summary:
      "Penurunan nilai akun dari titik tertinggi ke titik terendah sebelum naik lagi. Mengukur seberapa dalam kerugian yang pernah dialami.",
  },
]
