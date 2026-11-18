# D&D Battle Map

แผนที่ต่อสู้ D&D (เว็บ static) เปิดผ่าน GitHub Pages ได้เลย ไม่ต้องมีขั้นตอนบิลด์

## 🔗 เปิดใช้งาน
- **เปิดเว็บ:** https://6714120001-glitch.github.io/D-D-_app/
- **Repo (โค้ด):** https://github.com/6714120001-glitch/D-D-_app

> ถ้าเปิดแล้วขึ้น 404: ไปที่ Settings → Pages ของ repo แล้วเลือก Source = Deploy from a branch, branch `main`, โฟลเดอร์ `/ (root)` รอ 1–2 นาที

## โครงสร้างไฟล์ (อัปทั้งโฟลเดอร์ตามนี้)
```
index.html                  หน้าเพจหลัก (HTML อย่างเดียว)
.nojekyll
css/style.css
js/tailwind-config.js       ตั้งค่าสี/ฟอนต์ของ Tailwind
js/core/state.js            state กลาง + ตัวปรับข้อมูลหมุด
js/ui/nav.js                แถบเครื่องมือเดิม/ปุ่มพับแถบข้าง
js/ui/panels.js             รายชื่อหมุด + แผงรายละเอียดหมุด
js/map/aoe.js               วงสกิล
js/map/fog.js               เงา/บังแมพ
js/map/render.js            วาดแคนวาส/กล้อง/ซูม
js/map/pointer.js           เมาส์-ทัช ลาก วัดระยะ
js/map/grid-upload.js       กริด + อัปโหลดแมพ
js/tokens/tokens.js         จัดการหมุด
js/tokens/import-companion.js  ตัวนำเข้าตัวละคร (เดิม; ถูกแทนด้วยตัวใน features/library.js)
js/data/presets.js          ฉากสำเร็จรูป
js/data/save-load.js        บันทึก/โหลดฉาก JSON + localStorage
js/main.js                  เริ่มต้นโปรแกรม
js/features/library.js      ตัวแปลงแอปคู่หู, คลังตัวละคร, คลังแมพ, แถบเครื่องมือ, บันทึกรวม
js/features/persist-map.js  จำรูปแมพข้ามการรีเฟรช (IndexedDB)
js/features/stats.js        ช่องสเตตัส + ทอยเช็ก (กติกาในบ้าน)
js/features/initiative.js   ตัวนับลำดับเทิร์น
```
ลำดับ `<script>` ใน index.html สำคัญ (ไฟล์ต่อๆ ไปใช้ตัวแปรของไฟล์ก่อนหน้า)
เมื่อแก้ไฟล์ JS/CSS ให้เปลี่ยนเลข `?v=` ท้ายชื่อไฟล์ใน index.html เพื่อกันแคช
