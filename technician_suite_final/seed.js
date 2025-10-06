const { db, initDb } = require("./lib/db");

initDb();

// حسابات افتراضية: أدمن + 6 فنيين بنفس كلمة المرور 1234
const users = [
  { id:1, name:'Admin User',   username:'admin1', password:'1234', role:'admin' },
  { id:2, name:'خضر سعدي',     username:'admin2', password:'1234', role:'tech' },
  { id:3, name:'رامي عبد',     username:'admin3', password:'1234', role:'tech' },
  { id:4, name:'عبدالله قاسم', username:'admin4', password:'1234', role:'tech' },
  { id:5, name:'مؤمن محمد',    username:'admin5', password:'1234', role:'tech' },
  { id:6, name:'مصطفى سعيد',   username:'admin6', password:'1234', role:'tech' },
  { id:7, name:'يوسف كريم',    username:'admin7', password:'1234', role:'tech' }
];

const up = db.prepare("INSERT OR REPLACE INTO technicians (id,name,username,password,role) VALUES (?,?,?,?,?)");
users.forEach(u => up.run(u.id, u.name, u.username, u.password, u.role));

// عينات تذاكر
const ins = db.prepare(`
  INSERT INTO work_orders (customer_name, phone, address, issue, status, notes, technician_id, scheduled_for)
  VALUES (?,?,?,?,?,?,?,?)
`);
ins.run('حسن محمد','07811111111','بغداد - المنصور','انقطاع الانترنت','pending','',2,null);
ins.run('علياء صالح','07922222222','بغداد - الكرادة','تركيب راوتر','pending','',3,null);

console.log("Seed finished.");
