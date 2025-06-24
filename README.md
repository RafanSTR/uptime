# UptimeWatch - Professional Uptime Monitoring

Aplikasi monitoring uptime website yang modern dan profesional dengan setup manual yang mudah.

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

-- 3. Create status_checks table
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

-- 5. Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for admin_users
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

DROP POLICY IF EXISTS "Allow anonymous UPDATE to admin_users" ON admin_users;
CREATE POLICY "Allow anonymous UPDATE to admin_users"
  ON admin_users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 7. Create RLS Policies for monitors
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

-- 8. Create RLS Policies for status_checks
DROP POLICY IF EXISTS "Anyone can read status_checks" ON status_checks;
CREATE POLICY "Anyone can read status_checks"
  ON status_checks
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 9. Create RLS Policies for monitoring_settings
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

-- 10. Insert default admin user (username: admin, password: password)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;

-- 11. Insert default monitoring settings
INSERT INTO monitoring_settings (global_check_interval, enable_global_interval)
VALUES (5, false)
ON CONFLICT DO NOTHING;
```

#### C. Jalankan SQL
1. Klik **"Run"** untuk menjalankan semua SQL di atas
2. Pastikan tidak ada error (semua harus sukses)

### 3. Dapatkan Kredensial Supabase
1. Di dashboard Supabase, buka **Settings** → **API**
2. Copy **Project URL** (contoh: `https://abc123.supabase.co`)
3. Copy **anon public key** (key yang panjang dimulai dengan `eyJ...`)

### 4. Setup Environment Variables

#### Untuk Development Local:
Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Untuk Vercel:
1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Import repository GitHub Anda
3. Di bagian **Environment Variables**, tambahkan:
   - **Name:** `VITE_SUPABASE_URL` **Value:** `https://your-project.supabase.co`
   - **Name:** `VITE_SUPABASE_ANON_KEY` **Value:** `your-anon-key`
4. Klik **Deploy**

#### Untuk Netlify:
1. Buka [Netlify Dashboard](https://app.netlify.com)
2. Drag & drop folder `dist` setelah build, atau connect GitHub
3. Buka **Site Settings** → **Environment Variables**
4. Tambahkan kedua environment variables seperti di atas
5. Redeploy site

### 5. Test Aplikasi
1. Buka aplikasi (local: `http://localhost:5173` atau URL production)
2. Klik **Login** di navigation
3. Login dengan:
   - **Username:** `admin`
   - **Password:** `password`
4. Mulai tambahkan monitor!

## 🌐 Deploy ke Vercel - Lengkap

### Step 1: Persiapan
```bash
# Clone atau download project
git clone https://github.com/your-repo/uptime-monitor
cd uptime-monitor

# Install dependencies
npm install

# Test local (opsional)
npm run dev
```

### Step 2: Setup Database
1. Ikuti **Setup Database Manual** di atas
2. Pastikan semua SQL berhasil dijalankan
3. Catat Project URL dan anon key

### Step 3: Deploy ke Vercel
1. Push ke GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Buka [Vercel Dashboard](https://vercel.com/dashboard)
3. Klik **"New Project"**
4. Import repository GitHub
5. **PENTING:** Di **Environment Variables**, tambahkan:
```
VITE_SUPABASE_URL = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key-here
```
6. Klik **Deploy**

### Step 4: Verifikasi
1. Tunggu deployment selesai
2. Buka URL yang diberikan Vercel
3. Test login dengan `admin` / `password`
4. Tambahkan monitor pertama

## 🌐 Deploy ke Netlify - Lengkap

### Step 1: Build Project
```bash
# Install dependencies
npm install

# Build untuk production
npm run build
```

### Step 2: Deploy Manual (Drag & Drop)
1. Buka [Netlify Dashboard](https://app.netlify.com)
2. Drag & drop folder `dist` ke area deploy
3. Tunggu upload selesai

### Step 3: Setup Environment Variables
1. Buka **Site Settings** → **Environment Variables**
2. Klik **Add Variable** dan tambahkan:
   - **Key:** `VITE_SUPABASE_URL` **Value:** `https://your-project.supabase.co`
   - **Key:** `VITE_SUPABASE_ANON_KEY` **Value:** `your-anon-key`
3. Klik **Save**

### Step 4: Redeploy
1. Buka **Deploys** tab
2. Klik **Trigger Deploy** → **Deploy Site**
3. Tunggu deployment selesai

### Step 5: Setup Redirects (Penting!)
1. Buat file `public/_redirects` dengan isi:
```
/*    /index.html   200
```
2. Redeploy lagi

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

### ❌ Error: "No user updated - user not found"
**Solusi:**
1. Buka Supabase Dashboard → SQL Editor
2. Jalankan SQL berikut untuk memperbaiki RLS policy:
```sql
DROP POLICY IF EXISTS "Allow anonymous UPDATE to admin_users" ON admin_users;
CREATE POLICY "Allow anonymous UPDATE to admin_users"
  ON admin_users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
```
3. Refresh aplikasi dan coba update credentials lagi

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

## 🛠️ Teknologi

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Monitoring API**: External uptime checking service
- **Authentication**: Custom admin system dengan bcrypt
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

## 🔒 Keamanan

- Environment variables untuk kredensial
- Row Level Security di database
- Password hashing dengan bcrypt
- CORS protection
- Input validation dan sanitization

## 📞 Support

Untuk bantuan teknis:
1. Cek console browser (F12) untuk error logs
2. Periksa network tab untuk failed requests
3. Pastikan environment variables sudah benar
4. Cek status Supabase di dashboard mereka

## 🔗 Links Penting

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Netlify Dashboard](https://app.netlify.com)

---

**Setup manual yang mudah, monitoring yang powerful!** 🚀

### 🎯 Keunggulan Setup Manual:

✅ **Kontrol Penuh** - Anda tahu persis apa yang dibuat  
✅ **Debugging Mudah** - Jika ada masalah, mudah dilacak  
✅ **Production Ready** - Tested dan optimized  
✅ **Platform Agnostic** - Jalan di Vercel, Netlify, atau hosting lain  
✅ **Zero Dependencies** - Tidak butuh tools tambahan  
✅ **Clear Documentation** - Panduan step-by-step yang jelas