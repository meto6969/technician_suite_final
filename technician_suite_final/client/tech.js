let token = localStorage.getItem('tech_token') || null;
let currentId = null;

const q = id => document.getElementById(id);
const show = id => q(id).classList.remove('hidden');
const hide = id => q(id).classList.add('hidden');

function toast(msg){
  let t = document.querySelector('.toast');
  if (!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

const socket = io();

function setScreen(){
  if (token){
    hide('login'); show('dash'); hide('detail');
    socket.emit('register', { token });
    load();
  }else{
    show('login'); hide('dash'); hide('detail');
  }
}

async function login(){
  q('m').textContent = '...';
  const username = q('u').value.trim();
  const password = q('p').value.trim();
  const resp = await fetch('/api/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const data = await resp.json();
  if (resp.ok){
    token = data.token;
    localStorage.setItem('tech_token', token);
    setScreen();
  }else{
    q('m').textContent = data.error || 'خطأ تسجيل الدخول';
  }
}

function logout(){
  token = null;
  localStorage.removeItem('tech_token');
  setScreen();
}

async function load(){
  const r = await fetch('/api/work-orders', { headers:{ Authorization:'Bearer '+token }});
  const rows = await r.json();
  const el = q('orders');
  el.innerHTML = '';
  rows.forEach(x => {
    const it = document.createElement('div');
    it.className = 'item';
    it.innerHTML = `
      <div><b>${x.customer_name}</b> <span class='badge'>${x.status}</span></div>
      <div class='muted'>${x.phone || '-'} — ${x.address || ''}</div>
      <div class='muted'>مشكلة: ${x.issue}</div>
      <button class='btn mt' onclick='openOne(${x.id})'>فتح</button>`;
    el.appendChild(it);
  });
}

async function openOne(id){
  currentId = id;
  const r = await fetch('/api/work-orders/'+id, { headers:{ Authorization:'Bearer '+token }});
  const n = await r.json();
  q('d').innerHTML = `
    <div class='grid'>
      <div><b>العميل:</b> ${n.customer_name}</div>
      <div><b>الهاتف:</b> ${n.phone || '-'}</div>
      <div><b>العنوان:</b> ${n.address || '-'}</div>
      <div><b>الحالة:</b> <span class='badge'>${n.status}</span></div>
    </div>
    <div class='mt'><b>المشكلة:</b> ${n.issue}</div>`;
  hide('dash'); show('detail');
}

function back(){ show('dash'); hide('detail'); }

async function save(){
  if (!currentId) return;
  const body = { status: q('status').value, notes: q('notes').value };
  const r = await fetch('/api/work-orders/'+currentId, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
    body: JSON.stringify(body)
  });
  if (r.ok){ toast('تم الحفظ'); back(); load(); }
  else { toast('فشل الحفظ'); }
}

socket.on('new-ticket', (t) => { toast('وصلتك تذكرة جديدة: '+t.customer_name); load(); });

setScreen();
