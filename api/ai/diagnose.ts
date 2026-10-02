/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function - AI Diagnostic Chatbot for Aetra Customer Portal
 */

import { GoogleGenAI } from "@google/genai";

function getRuleBasedDiagnosticResponse(
  message: string,
  history: Array<{ role: string; text: string }> = []
) {
  const text = message.toLowerCase();

  if (text.includes("mati") || text.includes("tidak keluar") || text.includes("kering")) {
    return {
      reply: `Untuk keluhan **Air Tidak Mengalir**, mari kita periksa langkah awal mandiri berikut:
1. **Cek Posisi Stop Kran:** Pastikan stop kran (kran putar/tuas dekat meteran air) dalam posisi terbuka penuh (sejajar dengan pipa).
2. **Cek Kran Tetangga:** Apakah tetangga kanan/kiri Anda juga mengalami air mati?
3. **Cek Toren/Filter:** Jika rumah menggunakan toren, periksa apakah pelampung otomatis tersangkut.

Silakan pilih kondisi yang paling sesuai:`,
      options: [
        "Stop kran sudah terbuka, tetangga juga mati air",
        "Hanya rumah saya yang mati air, stop kran normal",
        "Ternyata kran depan meteran sempat tertutup (Sudah normal kembali)",
      ],
      suggestedAction: {
        type: "requires_work_order",
        categoryCode: "KATM",
        categoryTitle: "Air Mati Total / Tidak Mengalir",
        recommendedDivision: "minor_repair",
        summary: "Air mati di persil pelanggan setelah verifikasi stop kran.",
        urgency: true,
      },
    };
  }

  if (text.includes("keruh") || text.includes("cokelat") || text.includes("kuning") || text.includes("bau") || text.includes("pasir")) {
    return {
      reply: `Air keruh biasanya terjadi sementara setelah perbaikan pipa transmisi atau pengalihan aliran:
💡 **Langkah Mandiri (Flushing):**
1. Buka kran yang posisinya paling dekat dengan meteran air selama **2–3 menit** (jangan dialirkan ke toren).
2. Biarkan air membuang sisa sedimen pipa hingga jernih.

Apakah setelah 3–5 menit dialirkan air kembali bening, atau tetap keruh pekat?`,
      options: [
        "Sudah diflushing 5 menit, air tetap keruh pekat",
        "Air berbau menyengat / bercampur minyak",
        "Setelah diflushing sebentar, air sudah jernih kembali",
      ],
      suggestedAction: {
        type: "requires_work_order",
        categoryCode: "KMDT",
        categoryTitle: "Air Keruh / Berwarna / Berbau",
        recommendedDivision: "technical_support",
        summary: "Kualitas air keruh pekat setelah uji flushing mandiri.",
        urgency: false,
      },
    };
  }

  if (text.includes("kecil") || text.includes("lemah") || text.includes("pelan") || text.includes("loyo") || text.includes("tekanan")) {
    return {
      reply: `Untuk **Tekanan Air Kecil / Aliran Lemah**, seringkali disebabkan oleh penyumbatan kerak pada saringan kran:
🔧 **Pemeriksaan Cepat:**
1. Coba lepas tutup ujung kran (*aerator/filter mesh*). Bersihkan endapan pasir yang tersaring.
2. Cek apakah kran di lantai 1 lancar, dan hanya kran di lantai 2 yang kecil?
3. Pastikan stop kran di meteran air terbuka 100%.`,
      options: [
        "Semua kran lantai 1 & 2 tetap sangat kecil",
        "Hanya satu kran tertentu yang kecil (yang lain lancar)",
        "Sudah membersihkan saringan aerator dan air lancar kembali",
      ],
      suggestedAction: {
        type: "requires_work_order",
        categoryCode: "KTR",
        categoryTitle: "Tekanan Air Kecil / Debit Lemah",
        recommendedDivision: "technical_support",
        summary: "Tekanan air persil drop di semua titik kran.",
        urgency: false,
      },
    };
  }

  if (text.includes("bocor") || text.includes("pecah") || text.includes("sembur") || text.includes("rembes")) {
    return {
      reply: `For leak complaints, it is important to verify the leak point location:
📍 **Batas Tanggung Jawab:**
• **Sebelum Meteran / Pada Badan Meteran:** Tanggung jawab penuh PT AETRA (gratis perbaikan).
• **Setelah Meteran / Di Dalam Rumah:** Merupakan instalasi milik pelanggan (dikerjakan oleh pemilik persil).

Di mana titik kebocoran terjadi?`,
      options: [
        "Bocor di pipa persil depan pagar / sebelum meteran",
        "Bocor di badan meteran air / stop kran dinas",
        "Bocor di instalasi pipa dalam dinding rumah",
      ],
      suggestedAction: {
        type: "requires_work_order",
        categoryCode: "KBSM",
        categoryTitle: "Pipa Sambungan Bocor / Pecah",
        recommendedDivision: "minor_repair",
        summary: "Kebocoran pipa persil sebelum meteran, membutuhkan teknisi lapangan.",
        urgency: true,
      },
    };
  }

  if (text.includes("tagihan") || text.includes("rekening") || text.includes("mahal") || text.includes("melonjak") || text.includes("bayar")) {
    return {
      reply: `Untuk **Lonjakan Tagihan Rekening Air**, mari kita lakukan uji kebocoran pipa dalam secara mandiri:
🔍 **Uji Jarum Segitiga (*Flow Indicator*):**
1. Tutup rapat semua kran di rumah dan pastikan toren tidak sedang mengisi.
2. Perhatikan meteran air. Apakah jarum segitiga kecil merah/hitam masih berputar?
   - Jika **masih berputar**: Ada kebocoran pipa tersembunyi di dalam tanah/tembok rumah Anda.
   - Jika **diam**: Kemungkinan terdapat salah catat stand meter atau kenaikan konsumsi air.`,
      options: [
        "Semua kran tutup tapi jarum meteran tetap berputar (bocor dalam)",
        "Jarum meteran diam, ingin verifikasi pembacaan angka meteran",
        "Angka di struk tagihan jauh lebih tinggi dari angka di meteran fisik",
      ],
      suggestedAction: {
        type: "requires_work_order",
        categoryCode: "KRPT",
        categoryTitle: "Tagihan Melonjak Tidak Wajar",
        recommendedDivision: "sales_support",
        summary: "Pengajuan verifikasi stand meter dan lonjakan rekening air pelanggan.",
        urgency: false,
      },
    };
  }

  return {
    reply: `Halo! Saya Asisten Diagnostik Cerdas AETRA. Saya siap membantu Anda mendiagnosa kendala air secara mandiri sebelum membuat laporan teknisi.

Silakan pilih atau ketik masalah air yang Anda alami:`,
    options: [
      "💧 Air mati total di rumah",
      "📉 Tekanan air sangat kecil",
      "🟤 Air keruh / berbau",
      "🔧 Pipa depan rumah bocor",
      "📈 Tagihan rekening melonjak",
    ],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userMessage, history, customerName, meterId } = req.body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "userMessage is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = getRuleBasedDiagnosticResponse(userMessage, history);
      return res.status(200).json(fallback);
    }

    const aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });

    const systemPrompt = `Anda adalah "Asisten Diagnostik Cerdas PT AETRA Air Tangerang".
Tugas utama Anda adalah memandu pelanggan melakukan pengecekan awal (diagnostik mandiri) saat mengalami kendala air bersih, dengan tujuan:
1. MENCEGAH pengiriman teknisi lapangan yang tidak perlu jika masalah ternyata sepele (misal: stop kran meteran tertutup, saringan kran kotor tersumbat pasir, pemadaman terjadwal wilayah, atau pipa bocor di dalam instalasi rumah milik pelanggan).
2. Jika masalah MEMANG membutuhkan perbaikan teknisi AETRA (pipa dinas sebelum meter bocor, kran meter patah, air mati kawasan, kualitas air keruh pekat), berikan instruksi aman dan siapkan data tiket pengaduan secara tepat.

ATURAN RESPON:
- Berbicaralah dalam Bahasa Indonesia yang ramah, sopan, jelas, dan mudah dipahami orang awam.
- Berikan langkah diagnosa 1 demi 1 (maksimal 2-3 poin praktis).
- Outputkan respon dalam format JSON yang valid dengan struktur:
{
  "reply": "Kalimat penjelasan dan pertanyaan panduan diagnosa untuk pelanggan...",
  "options": ["Pilihan respon cepat 1", "Pilihan respon cepat 2", "Pilihan respon cepat 3"],
  "suggestedAction": {
    "type": "requires_work_order",
    "categoryCode": "KBSM",
    "categoryTitle": "Nama Kategori",
    "recommendedDivision": "minor_repair",
    "summary": "Ringkasan kesimpulan diagnosa teknis untuk form pengaduan",
    "urgency": true
  }
}

Informasi Pelanggan: Nama: ${customerName || "Pelanggan"}, No. Meter: ${meterId || "-"}.`;

    const chatHistory = Array.isArray(history)
      ? history.slice(-6).map((h) => `${h.role === "user" ? "Pelanggan" : "Asisten"}: ${h.text}`).join("\n")
      : "";

    const userPrompt = `${chatHistory ? `Riwayat Percakapan Sebelumnya:\n${chatHistory}\n\n` : ""}Pesan Pelanggan Baru: "${userMessage}"

Berikan diagnosa dan saran langkah mandiri dalam format JSON yang telah ditentukan.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const rawText = response.text ? response.text.trim() : "";
    try {
      const parsed = JSON.parse(rawText);
      return res.status(200).json(parsed);
    } catch {
      const fallback = getRuleBasedDiagnosticResponse(userMessage, history);
      return res.status(200).json({
        reply: rawText || fallback.reply,
        options: fallback.options,
        suggestedAction: fallback.suggestedAction,
      });
    }
  } catch (err: any) {
    console.error("Vercel AI Endpoint Error:", err);
    const fallback = getRuleBasedDiagnosticResponse(req.body?.userMessage || "");
    return res.status(200).json(fallback);
  }
}
