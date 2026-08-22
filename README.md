# Finora Finance ERP Web

Frontend Finance ERP menggunakan Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, Vue Router, Axios, Lucide, dan Chart.js.

## Menjalankan project

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

## Environment

Buat `.env` berdasarkan `.env.example`:

```env
VITE_API_URL=http://localhost:8000/api
```

URL API tidak ditulis langsung pada view. Seluruh request melewati `src/services/api/client.ts` dan interceptor terpusat.

## Struktur aplikasi

- `components`: komponen reusable, dashboard, dan layout
- `composables`: reusable stateful logic
- `data`: data demonstrasi yang belum terhubung API
- `layouts`: shell halaman
- `router`: konfigurasi, guard, dan route per kelompok
- `services`: kontrak akses REST API
- `stores`: state Pinia
- `types`: kontrak TypeScript bersama
- `utils`: format currency, tanggal, dan API error
- `views`: page orchestration

Alur data yang ditargetkan adalah View → Store/Composable → Service → Axios Client → REST API. Login sudah memakai backend; modul lain masih menggunakan dummy data sampai endpoint terkait siap.

## Code Style

- Gunakan indentasi 2 spasi.
- Gunakan single quote dan tanpa semicolon untuk TypeScript.
- Gunakan PascalCase untuk Vue component.
- Gunakan camelCase untuk variabel dan fungsi.
- Gunakan UPPER_SNAKE_CASE untuk configuration constants.
- Jalankan `npm run format` sebelum menyerahkan perubahan.
- Jalankan `npm run format:check` untuk memverifikasi formatting.
