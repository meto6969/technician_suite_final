const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const { Server: IOServer } = require("socket.io");
const { db, initDb } = require("./lib/db");
const { authMiddleware, signToken, verifyToken } = require("./lib/jwt");

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH"] }
});
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// تقديم ملفات الواجهة (تأكد أن مجلد client موجود بجانب مجلد server)
app.use(express.static(path.join(__dirname, "../client")));

// تهيئة قاعدة البيانات
initDb();

// خريطة سوكِت لتوصيل الإشعارات لكل فني
const userSockets = new Map();
io.on("connection", (socket) => {
  socket.on("register", ({ token }) => {
    const user = verifyToken(token);
    if (!user) return;
    userSockets.set(user.id, socket.id);
    socket.data.userId = user.id;
  });

  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    if (uid && userSockets.get(uid) === socket.id) userSockets.delete(uid);
  });
});

// فحص سريع
app.get("/api/health", (req, res) => res.json({ ok: true }));

// تسجيل الدخول
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username & password required" });
  const user = db.prepare("SELECT id,name,username,password,role FROM technicians WHERE username = ?").get(username);
  if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken({ id: user.id, username: user.username, role: user.role, name: user.name });
  res.json({ token, role: user.role, name: user.name });
});

// قائمة الفنيين (أدمن فقط)
app.get("/api/technicians", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const list = db.prepare("SELECT id,name,username,role FROM technicians ORDER BY role DESC, name ASC").all();
  res.json(list);
});

// قراءة جميع التذاكر (الأدمن يرى الكل، الفني يرى فقط تذاكره)
app.get("/api/work-orders", authMiddleware, (req, res) => {
  const sql = req.user.role === "admin"
    ? "SELECT * FROM work_orders ORDER BY created_at DESC"
    : "SELECT * FROM work_orders WHERE technician_id = ? ORDER BY created_at DESC";
  const rows = req.user.role === "admin" ? db.prepare(sql).all() : db.prepare(sql).all(req.user.id);
  res.json(rows);
});

// قراءة تذكرة واحدة
app.get("/api/work-orders/:id", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && row.technician_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  res.json(row);
});

// إنشاء تذكرة (أدمن فقط) + إرسال إشعار Socket.IO للفني المستهدف
app.post("/api/work-orders", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { customer_name, phone, address, issue, technician_id, scheduled_for } = req.body || {};
  if (!customer_name || !issue || !technician_id) return res.status(400).json({ error: "Missing fields" });

  const info = db.prepare(`
    INSERT INTO work_orders (customer_name, phone, address, issue, status, notes, technician_id, scheduled_for)
    VALUES (?,?,?,?, 'pending','', ?, ?)
  `).run(customer_name, phone || "", address || "", issue, technician_id, scheduled_for || null);

  const ticket = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(info.lastInsertRowid);

  // إشعار لحظي للفني المستهدف
  const sid = userSockets.get(Number(technician_id));
  if (sid) io.to(sid).emit("new-ticket", ticket);

  res.status(201).json(ticket);
});

// تحديث تذكرة (الفني يستطيع تحديث حالته وملاحظاته)
app.patch("/api/work-orders/:id", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && row.technician_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const { status, notes } = req.body || {};
  db.prepare("UPDATE work_orders SET status = COALESCE(?,status), notes = COALESCE(?,notes) WHERE id = ?")
    .run(status, notes, row.id);

  const updated = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(row.id);
  res.json(updated);
});

// أي مسار آخر → يفتح واجهة الفني
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

server.listen(PORT, () => console.log("Server on :" + PORT));
