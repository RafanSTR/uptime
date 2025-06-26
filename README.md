# UptimeWatch - Professional Uptime Monitoring

Aplikasi monitoring uptime website yang modern dan profesional dengan setup manual yang mudah dan monitoring server-side 24/7.

## 🚀 Setup Manual - Step by Step

### 1. Buat Project Supabase
1. Kunjungi [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi nama project dan password database
4. Tunggu project selesai dibuat (biasanya 2-3 menit)

### 2. Setup Database Manual

#### A. Buka SQL Editor
1. Di dashboard Supabase, buka **SQL Editor**
2. Klik **"New Query"**

#### B. Copy & Paste SQL Berikut:

```sql
-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  method text NOT NULL CHECK (method = ANY (ARRAY['http'::text, 'ping'::text])),
  status text DEFAULT 'checking'::text CHECK (status = ANY (ARRAY['up'::text, 'down'::text, 'checking'::text])),
  response_time integer DEFAULT 0,
  uptime numeric DEFAULT 100.0,
  last_checked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  check_interval integer DEFAULT 5
);

-- 3. Create status_checks table for uptime history tracking
CREATE TABLE IF NOT EXISTS status_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid REFERENCES monitors(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status = ANY (ARRAY['up'::text, 'down'::text])),
  response_time integer DEFAULT 0,
  checked_at timestamptz DEFAULT now()
);

-- 4. Create monitoring_settings table
CREATE TABLE IF NOT EXISTS monitoring_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_check_interval integer DEFAULT 5,
  enable_global_interval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create branding_settings table
CREATE TABLE IF NOT EXISTS branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text DEFAULT 'UptimeWatch' NOT NULL,
  logo_url text DEFAULT '',
  favicon_url text DEFAULT '/vite.svg' NOT NULL,
  primary_color text DEFAULT '#2563eb' NOT NULL,
  secondary_color text DEFAULT '#1e40af' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Create webhook_logs table for server monitoring
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_data jsonb NOT NULL,
  received_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  processed_at timestamptz,
  status text DEFAULT 'received',
  created_at timestamptz DEFAULT now()
);

-- 7. Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- 8. Grant necessary permissions to anon role BEFORE creating RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitors TO anon;
GRANT SELECT, INSERT ON public.status_checks TO anon;
GRANT SELECT, INSERT, UPDATE ON public.monitoring_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_settings TO anon;
GRANT ALL ON public.webhook_logs TO service_role;

-- 9. Create RLS Policies for admin_users
DROP POLICY IF EXISTS "Allow SELECT for admin authentication" ON admin_users;
CREATE POLICY "Allow SELECT for admin authentication"
  ON admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Prevent anonymous DELETE to admin_users" ON admin_users;
CREATE POLICY "Prevent anonymous DELETE to admin_users"
  ON admin_users
  FOR DELETE
  TO anon
  USING (false);

DROP POLICY IF EXISTS "Prevent anonymous INSERT to admin_users" ON admin_users;
CREATE POLICY "Prevent anonymous INSERT to admin_users"
  ON admin_users
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- IMPORTANT: Allow UPDATE for admin credential changes
DROP POLICY IF EXISTS "Allow anonymous UPDATE to admin_users" ON admin_users;
CREATE POLICY "Allow anonymous UPDATE to admin_users"
  ON admin_users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 10. Create RLS Policies for monitors
DROP POLICY IF EXISTS "Allow DELETE for monitor management" ON monitors;
CREATE POLICY "Allow DELETE for monitor management"
  ON monitors
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow INSERT for monitor management" ON monitors;
CREATE POLICY "Allow INSERT for monitor management"
  ON monitors
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow UPDATE for monitor management" ON monitors;
CREATE POLICY "Allow UPDATE for monitor management"
  ON monitors
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON monitors;
CREATE POLICY "Allow all operations for authenticated users"
  ON monitors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read monitors" ON monitors;
CREATE POLICY "Anyone can read monitors"
  ON monitors
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 11. Create RLS Policies for status_checks (uptime history)
DROP POLICY IF EXISTS "Anyone can read status_checks" ON status_checks;
CREATE POLICY "Anyone can read status_checks"
  ON status_checks
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow INSERT for status tracking" ON status_checks;
CREATE POLICY "Allow INSERT for status tracking"
  ON status_checks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 12. Create RLS Policies for monitoring_settings
DROP POLICY IF EXISTS "Allow INSERT for monitoring settings" ON monitoring_settings;
CREATE POLICY "Allow INSERT for monitoring settings"
  ON monitoring_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow SELECT for monitoring settings" ON monitoring_settings;
CREATE POLICY "Allow SELECT for monitoring settings"
  ON monitoring_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow UPDATE for monitoring settings" ON monitoring_settings;
CREATE POLICY "Allow UPDATE for monitoring settings"
  ON monitoring_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 13. Create RLS Policies for branding_settings
DROP POLICY IF EXISTS "Allow SELECT for branding settings" ON branding_settings;
CREATE POLICY "Allow SELECT for branding settings"
  ON branding_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow INSERT for branding settings" ON branding_settings;
CREATE POLICY "Allow INSERT for branding settings"
  ON branding_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow UPDATE for branding settings" ON branding_settings;
CREATE POLICY "Allow UPDATE for branding settings"
  ON branding_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow DELETE for branding settings" ON branding_settings;
CREATE POLICY "Allow DELETE for branding settings"
  ON branding_settings
  FOR DELETE
  TO anon
  USING (true);

-- 14. Create RLS Policies for webhook_logs
DROP POLICY IF EXISTS "Authenticated users can read webhook logs" ON webhook_logs;
CREATE POLICY "Authenticated users can read webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service can manage webhook logs" ON webhook_logs;
CREATE POLICY "Service can manage webhook logs"
  ON webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 15. Insert default admin user (username: admin, password: password)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;

-- 16. Insert default monitoring settings
INSERT INTO monitoring_settings (global_check_interval, enable_global_interval)
VALUES (5, false)
ON CONFLICT DO NOTHING;

-- 17. Insert default branding settings
INSERT INTO branding_settings (app_name, logo_url, favicon_url, primary_color, secondary_color)
VALUES ('UptimeWatch', '', '/vite.svg', '#2563eb', '#1e40af')
ON CONFLICT DO NOTHING;

-- 18. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_checks_monitor_id ON status_checks(monitor_id);
CREATE INDEX IF NOT EXISTS idx_status_checks_checked_at ON status_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_monitors_status ON monitors(status);
CREATE INDEX IF NOT EXISTS idx_monitors_last_checked ON monitors(last_checked);
CREATE INDEX IF NOT EXISTS idx_branding_settings_app_name ON branding_settings(app_name);
CREATE INDEX IF NOT EXISTS webhook_logs_received_at_idx ON webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_status_idx ON webhook_logs(status);
```

#### C. Jalankan SQL
1. Klik **"Run"** untuk menjalankan semua SQL di atas
2. Pastikan tidak ada error (semua harus sukses)

### 3. Setup Edge Functions untuk Server-Side Monitoring

#### A. Buat Edge Functions di Supabase
1. Di dashboard Supabase, buka **Edge Functions**
2. Klik **"New Function"**
3. Buat 3 functions dengan nama:
   - `background-monitor`
   - `webhook-monitor`
   - `cleanup-old-data`

#### B. Deploy Functions
1. **background-monitor**: Copy code dari `supabase/functions/background-monitor/index.ts`
2. **webhook-monitor**: Copy code dari `supabase/functions/webhook-monitor/index.ts`
3. **cleanup-old-data**: Copy code dari `supabase/functions/cleanup-old-data/index.ts`
4. Paste ke editor Supabase dan klik **"Deploy"** untuk setiap function

#### C. Test Functions
1. Klik **"Invoke"** di dashboard untuk test
2. Pastikan semua functions berjalan tanpa error

### 4. Setup GitHub Actions untuk Monitoring Otomatis 24/7

#### A. Buat Repository GitHub
1. Push project ke GitHub repository
2. Pastikan file `.github/workflows/monitor.yml` sudah ada

#### B. Setup GitHub Secrets
1. Di GitHub repository, buka **Settings** → **Secrets and variables** → **Actions**
2. Klik **"New repository secret"**
3. Tambahkan secret:
   - **Name**: `SUPABASE_WEBHOOK_URL`
   - **Value**: `https://your-project-id.supabase.co/functions/v1/webhook-monitor`

#### C. Aktifkan GitHub Actions
1. Buka tab **Actions** di repository
2. Klik **"I understand my workflows, go ahead and enable them"**
3. Workflow akan berjalan otomatis setiap 5 menit

#### D. Monitor GitHub Actions
1. Buka tab **Actions** untuk melihat status monitoring
2. Setiap 5 menit akan ada job baru yang berjalan
3. Klik job untuk melihat log detail

### 5. Dapatkan Kredensial Supabase
1. Di dashboard Supabase, buka **Settings** → **API**
2. Copy **Project URL** (contoh: `https://abc123.supabase.co`)
3. Copy **anon public key** (key yang panjang dimulai dengan `eyJ...`)

### 6. Setup Environment Variables

#### Untuk Development Local:
Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 7. Deploy ke Vercel

#### A. Persiapan
1. Push project ke GitHub repository
2. Pastikan semua file sudah ter-commit

#### B. Deploy ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"New Project"**
3. Import repository GitHub Anda
4. **PENTING:** Di bagian **Environment Variables**, tambahkan:
   - **Name:** `VITE_SUPABASE_URL` **Value:** `https://your-project.supabase.co`
   - **Name:** `VITE_SUPABASE_ANON_KEY` **Value:** `your-anon-key`
5. Klik **Deploy**
6. Tunggu deployment selesai
7. Buka URL yang diberikan Vercel untuk test aplikasi

#### C. Menghubungkan Domain Custom (Opsional)
1. Di Vercel Dashboard, buka project Anda
2. Klik tab **"Domains"**
3. Tambahkan domain custom Anda
4. Ikuti instruksi untuk setup DNS

### 8. Deploy ke Netlify

#### A. Build Project Local
```bash
npm install
npm run build
```

#### B. Deploy Manual (Drag & Drop)
1. Buka [Netlify Dashboard](https://app.netlify.com)
2. Drag & drop folder `dist` ke area deploy
3. Tunggu upload selesai

#### C. Setup Environment Variables
1. Buka **Site Settings** → **Environment Variables**
2. Klik **Add Variable** dan tambahkan:
   - **Key:** `VITE_SUPABASE_URL` **Value:** `https://your-project.supabase.co`
   - **Key:** `VITE_SUPABASE_ANON_KEY` **Value:** `your-anon-key`
3. Klik **Save**

#### D. Setup Redirects (Penting!)
1. Pastikan file `public/_redirects` ada dengan isi:
```
/*    /index.html   200
```
2. Redeploy dengan cara:
   - Buka **Deploys** tab
   - Klik **Trigger Deploy** → **Deploy Site**

#### E. Menghubungkan GitHub (Opsional)
1. Di Netlify Dashboard, klik **"New site from Git"**
2. Connect ke GitHub dan pilih repository
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Tambahkan environment variables seperti langkah C
6. Deploy

#### F. Domain Custom di Netlify
1. Di Netlify Dashboard, buka site Anda
2. Klik **"Domain settings"**
3. Klik **"Add custom domain"**
4. Ikuti instruksi untuk setup DNS

### 9. Test Aplikasi
1. Buka aplikasi (local: `http://localhost:5173` atau URL production)
2. Klik **Login** di navigation
3. Login dengan:
   - **Username:** `admin`
   - **Password:** `password`
4. Mulai tambahkan monitor!

## 🔧 Troubleshooting

### ❌ Error: "Environment Variables Diperlukan"
**Solusi:**
1. Pastikan environment variables sudah diset dengan benar
2. Nama variable harus **PERSIS**: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
3. Redeploy setelah menambah environment variables

### ❌ Error: "Database connection failed"
**Solusi:**
1. Pastikan SQL setup sudah dijalankan dengan benar
2. Cek apakah project Supabase aktif (tidak di-pause)
3. Verifikasi URL dan anon key benar

### ❌ Error: "Login failed"
**Solusi:**
1. Pastikan SQL untuk insert admin user sudah dijalankan
2. Coba login dengan `admin` / `password`
3. Cek console browser untuk error detail

### ❌ Build Error di Vercel/Netlify
**Solusi:**
1. Pastikan `package.json` ter-commit
2. Cek build logs untuk error detail
3. Pastikan semua dependencies valid

### ❌ 404 Error di Netlify
**Solusi:**
1. Pastikan file `public/_redirects` ada dengan isi `/*    /index.html   200`
2. Redeploy setelah menambah file redirects

### ❌ Error: "new row violates row-level security policy"
**Solusi:**
1. Pastikan SQL setup terbaru sudah dijalankan (termasuk GRANT statements)
2. Jika masih error, jalankan SQL berikut di Supabase SQL Editor:
```sql
GRANT SELECT, INSERT ON public.status_checks TO anon;
```
3. Restart aplikasi setelah menjalankan SQL

### ❌ GitHub Actions Tidak Berjalan
**Solusi:**
1. Pastikan secret `SUPABASE_WEBHOOK_URL` sudah diset dengan benar
2. Format URL: `https://your-project-id.supabase.co/functions/v1/webhook-monitor`
3. Cek tab Actions untuk melihat error logs
4. Pastikan Edge Functions sudah di-deploy dengan benar

### ❌ Server Monitoring Tidak Berjalan
**Solusi:**
1. Test Edge Functions di Supabase Dashboard
2. Pastikan webhook URL benar di GitHub secrets
3. Cek logs di tab Actions GitHub
4. Verifikasi database permissions

## 📋 Default Credentials

Setelah setup database, gunakan kredensial berikut:

- **Username:** `admin`
- **Password:** `password`

⚠️ **PENTING:** Segera ganti password setelah login pertama melalui menu admin settings!

## 🔧 Fitur Utama

### ✅ Real-time Monitoring
- Pengecekan otomatis sesuai interval
- Update status real-time
- Visual indicator saat monitoring aktif

### ✅ Server-Side Monitoring 24/7
- **GitHub Actions**: Monitoring berjalan di server GitHub setiap 5 menit
- **Edge Functions**: Processing di server Supabase
- **Webhook Logging**: Track semua monitoring activities
- **Auto-Cleanup**: Maintenance database otomatis

### ✅ Admin Dashboard
- Kelola semua monitor
- Pengaturan interval global/individual
- Customisasi branding (logo, nama app, warna)
- Statistik uptime dan response time

### ✅ User Dashboard
- View-only status semua layanan
- Overview sistem keseluruhan
- Real-time updates tanpa refresh

### ✅ Branding Customization
- Upload logo custom
- Ubah nama aplikasi
- Ganti favicon
- Sesuaikan warna tema
- **Sync antar semua browser** 🆕

### ✅ Uptime Tracking yang Akurat
- **History-based calculation**: Uptime dihitung berdasarkan data historis real
- **30-day tracking**: Menggunakan data 30 hari terakhir untuk akurasi
- **Automatic cleanup**: Data lama (>90 hari) dibersihkan otomatis
- **Real-time updates**: Setiap pengecekan disimpan ke database

## 🛠️ Teknologi

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time + Edge Functions)
- **Monitoring API**: External uptime checking service
- **Authentication**: Custom admin system dengan bcrypt
- **Server Monitoring**: GitHub Actions + Supabase Edge Functions
- **Deployment**: Vercel/Netlify optimized

## 📊 Monitoring Methods

### HTTP/HTTPS
- Website monitoring
- API endpoint checking
- Response time measurement
- SSL certificate validation

### Ping
- Server connectivity
- Network latency
- Basic availability check

## 📈 Cara Kerja Uptime Percentage

### **Real-time History Tracking**
- Setiap pengecekan monitor disimpan ke tabel `status_checks`
- Uptime dihitung berdasarkan 30 hari terakhir
- Formula: `(jumlah check UP / total check) × 100`

### **Contoh Perhitungan:**
- Monitor dicek setiap 5 menit = 288 checks per hari
- Dalam 24 jam: 280 up, 8 down
- Uptime = (280/288) × 100 = **97.22%**

### **Fitur Uptime:**
- ✅ **Akurat**: Berdasarkan data historis real
- ✅ **Otomatis**: Update setiap kali monitoring berjalan
- ✅ **Efisien**: Cleanup data lama otomatis
- ✅ **Reliable**: Tidak bergantung pada nilai statis

## 🎨 Branding System

### **Cross-Browser Sync**
- Pengaturan branding disimpan di database Supabase
- Otomatis sync di semua browser dan device
- Real-time update favicon, title, dan warna
- Fallback ke localStorage jika database tidak tersedia

### **Customization Options:**
- ✅ **App Name**: Ubah nama aplikasi
- ✅ **Logo**: Upload logo custom dari URL
- ✅ **Favicon**: Ganti ikon tab browser
- ✅ **Colors**: Sesuaikan warna primer dan sekunder
- ✅ **Reset**: Kembalikan ke pengaturan default

## 🚀 Server-Side Monitoring Architecture

### **GitHub Actions Workflow**
```yaml
name: Website Monitoring
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
```

### **Edge Functions Flow**
1. **GitHub Actions** → Trigger webhook setiap 5 menit
2. **webhook-monitor** → Log request dan trigger background monitor
3. **background-monitor** → Cek semua website dan update database
4. **cleanup-old-data** → Maintenance database (opsional)

### **Monitoring Process**
1. **Fetch Monitors**: Ambil semua monitor dari database
2. **Check Intervals**: Filter monitor yang perlu dicek
3. **API Calls**: Panggil external API untuk cek status
4. **Update Database**: Simpan hasil ke `status_checks` dan `monitors`
5. **Calculate Uptime**: Hitung uptime berdasarkan history 30 hari

## 🔒 Keamanan

- Environment variables untuk kredensial
- Row Level Security di database
- Password hashing dengan bcrypt
- CORS protection
- Input validation dan sanitization
- Webhook logging untuk audit trail

## 📞 Support

Untuk bantuan teknis:
1. Cek console browser (F12) untuk error logs
2. Periksa network tab untuk failed requests
3. Pastikan environment variables sudah benar
4. Cek status Supabase di dashboard mereka
5. Monitor GitHub Actions di tab Actions
6. Cek Edge Functions logs di Supabase Dashboard

## 🔗 Links Penting

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Netlify Dashboard](https://app.netlify.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Setup manual yang mudah, monitoring server-side 24/7 yang powerful!** 🚀

### 🎯 Keunggulan Setup Ini:

✅ **Server-Side Monitoring** - Berjalan 24/7 di server GitHub  
✅ **Kontrol Penuh** - Anda tahu persis apa yang dibuat  
✅ **Debugging Mudah** - Jika ada masalah, mudah dilacak  
✅ **Production Ready** - Tested dan optimized  
✅ **Platform Agnostic** - Jalan di Vercel, Netlify, atau hosting lain  
✅ **Zero Dependencies** - Tidak butuh tools tambahan  
✅ **Clear Documentation** - Panduan step-by-step yang jelas  
✅ **Accurate Uptime** - Tracking berbasis history yang akurat  
✅ **Cross-Browser Branding** - Branding sync di semua browser  
✅ **GitHub Actions Integration** - Monitoring otomatis gratis  
✅ **Edge Functions** - Processing cepat di server Supabase  
✅ **Webhook Logging** - Audit trail lengkap  
✅ **Auto Cleanup** - Maintenance database otomatis