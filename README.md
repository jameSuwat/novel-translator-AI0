# นักแปลนิยาย (Novel Translator App)

เว็บแอปแปลนิยายด้วย Google Gemini แบบ standalone — รันเองได้ ไม่ต้องพึ่ง claude.ai

## โครงสร้างไฟล์

```
webapp/
├── api/
│   └── gemini.js        ← serverless function ที่เก็บ API key และเรียก Gemini แทน
├── src/
│   ├── App.jsx          ← ตัวแอปหลัก (เหมือนเดิมเกือบทั้งหมด)
│   ├── main.jsx         ← จุดเริ่มโปรแกรม
│   ├── storageShim.js   ← จำลอง window.storage ด้วย localStorage ของเบราว์เซอร์
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

ข้อมูลนิยาย/คำศัพท์ทั้งหมดเก็บอยู่ใน **localStorage ของเบราว์เซอร์เครื่องที่ใช้งานเท่านั้น** — ล้างข้อมูลเบราว์เซอร์หรือเปิดจากเครื่อง/เบราว์เซอร์อื่นจะไม่เห็นข้อมูลเดิม ถ้าต้องการใช้หลายเครื่อง/ซิงก์ข้ามอุปกรณ์ในอนาคต ค่อยเปลี่ยนไปใช้ฐานข้อมูลจริง (Supabase/Firebase) แทนได้ โดยไม่ต้องแก้โค้ดส่วนอื่น เพราะทุกอย่างเรียกผ่าน `window.storage` จุดเดียว

## วิธี deploy ด้วย Vercel (แนะนำ — ฟรี, ใช้ได้กับ Vite และ /api ในตัว)

### 1. เตรียม API key
ไปที่ https://aistudio.google.com/apikey (ล็อกอินด้วยบัญชี Google) แล้วกด **Create API key** (เก็บไว้ก่อน จะใช้ในขั้นตอนที่ 4)

> **หมายเหตุ**: การใช้ผ่าน API key ของคุณเองมีค่าใช้จ่าย/โควต้าตามเงื่อนไขของ Google AI Studio แยกจากแอปอื่นๆ ที่คุณใช้อยู่ — เช็คราคา/โควต้าฟรีปัจจุบันได้ที่ https://ai.google.dev/pricing

### 2. อัปโหลดโค้ดขึ้น GitHub
```bash
cd webapp
git init
git add .
git commit -m "Initial commit"
```
แล้วสร้าง repo ใหม่บน GitHub แล้ว push โค้ดขึ้นไป (ผ่านหน้าเว็บ GitHub หรือคำสั่ง `git remote add origin ...` แล้ว `git push`)

### 3. เชื่อม Vercel กับ repo
- ไปที่ https://vercel.com แล้วสมัคร/ล็อกอิน (ใช้ GitHub ล็อกอินได้เลย)
- กด **"Add New" → "Project"** แล้วเลือก repo ที่เพิ่ง push ไป
- Vercel จะตรวจพบว่าเป็นโปรเจกต์ Vite อัตโนมัติ ไม่ต้องตั้งค่า Build Command/Output Directory เพิ่ม

### 4. ใส่ API key เป็น Environment Variable
ในหน้าตั้งค่าโปรเจกต์บน Vercel (ก่อนกด Deploy หรือหลัง deploy แล้วก็แก้ทีหลังได้):
- ไปที่ **Settings → Environment Variables**
- เพิ่มตัวแปรชื่อ `GEMINI_API_KEY` ค่าเป็น API key จากขั้นตอนที่ 1
- เลือกให้ครอบคลุมทั้ง Production, Preview, Development

### 5. Deploy
กด **Deploy** — เสร็จแล้วจะได้ลิงก์ประมาณ `https://ชื่อโปรเจกต์.vercel.app` ใช้งานได้ทันทีจากมือถือ/คอมทุกเครื่อง (ข้อมูลแต่ละเครื่องแยกกันตามที่อธิบายด้านบน)

ครั้งต่อไปแค่ `git push` โค้ดใหม่ Vercel จะ deploy ให้อัตโนมัติ

## รันทดสอบในเครื่องตัวเอง (ไม่บังคับ)
```bash
npm install
npm i -g vercel        # ครั้งแรกครั้งเดียว
vercel dev             # รันทั้งหน้าเว็บและ /api/gemini พร้อมกัน อ่าน .env.local
```
สร้างไฟล์ `.env.local` แล้วใส่ `GEMINI_API_KEY=...` ตามตัวอย่างใน `.env.example`
