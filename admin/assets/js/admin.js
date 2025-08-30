// ---- Optional Backend Integration ----
// Set API_BASE to your server URL to enable live backend (otherwise localStorage is used).
const API_BASE = ''; // e.g., 'https://api.taara.example.com'
async function apiFetch(path, options={}){
  if(!API_BASE) return null; // no-op when not configured
  const res = await fetch(API_BASE + path, {headers:{'Content-Type':'application/json'}, ...options});
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}
const API = {
  // Example endpoints — adjust to your backend names.
  list(resource){ return apiFetch(`/${resource}`); },
  create(resource, body){ return apiFetch(`/${resource}`, {method:'POST', body:JSON.stringify(body)}); },
  patch(resource, id, body){ return apiFetch(`/${resource}/${id}`, {method:'PATCH', body:JSON.stringify(body)}); },
  remove(resource, id){ return apiFetch(`/${resource}/${id}`, {method:'DELETE'}); },
};

// Simple SPA router
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(btn => btn.addEventListener('click', () => {
  navLinks.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const page = btn.dataset.page;
  pages.forEach(p => p.classList.toggle('show', p.id === page));
  window.location.hash = page;
}));
window.addEventListener('load', () => {
  const target = location.hash.replace('#','') || 'dashboard';
  document.querySelector(`.nav-link[data-page="${target}"]`)?.click();
});

// ---- App State ----
const Storage = {
  // A tiny wrapper around localStorage for persistence
  get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch{ return fallback } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  clear(){ localStorage.clear(); }
};

const state = {
  adoptions: Storage.get('adoptions', []),
  rescues: Storage.get('rescues', []),
  donations: Storage.get('donations', []),
  events: Storage.get('events', []),
  dues: Storage.get('dues', []), // dashboard due items
  calendarMarks: Storage.get('calendarMarks', []) // {date:'YYYY-MM-DD', type:'rescue|due|event'}
};

function persist(){
  Storage.set('adoptions', state.adoptions);
  Storage.set('rescues', state.rescues);
  Storage.set('donations', state.donations);
  Storage.set('events', state.events);
  Storage.set('dues', state.dues);
  Storage.set('calendarMarks', state.calendarMarks);
}

// ---- Seeding ----
document.getElementById('seedBtn').addEventListener('click', () => {
  const today = new Date();
  const iso = d => d.toISOString().slice(0,10);

  state.adoptions = [
    {id: uid(), applicant:'Daniel Borac', animal:'Milo (Cat)', submitted: iso(new Date(today-4*864e5)), status:'pending'},
    {id: uid(), applicant:'Khen Nuarin', animal:'Buddy (Dog)', submitted: iso(new Date(today-2*864e5)), status:'approved'},
    {id: uid(), applicant:'Mark Flower', animal:'Luna (Cat)', submitted: iso(new Date(today-1*864e5)), status:'rejected'}
  ];
  state.rescues = [
    {id: uid(), reporter:'CJ Arrienda', location:'Malfcot', date: iso(new Date()), status:'urgent'},
    {id: uid(), reporter:'Joan', location:'Carafiq', date: iso(new Date(today-3*864e5)), status:'in-progress'}
  ];
  state.donations = [
    {id: uid(), donor:'Rex Tan', amount: 1000, channel:'GCash', date: iso(new Date(today-1*864e5))},
    {id: uid(), donor:'Anna Lee', amount: 2500, channel:'Bank', date: iso(new Date(today-7*864e5))},
    {id: uid(), donor:'Anonymous', amount: 500, channel:'Cash', date: iso(new Date())}
  ];
  state.events = [
    {id: uid(), title:'Free Vaccination Drive', date: iso(new Date(today+5*864e5)), location:'Barangay Hall', desc:'Community pet care and adoption day.'}
  ];
  state.dues = [
    {id: uid(), text:'Rescue in Malfcot'},
    {id: uid(), text:'Rescue in Carafiq'}
  ];
  state.calendarMarks = [
    {date: iso(new Date(today+1*864e5)), type:'rescue'},
    {date: iso(new Date(today+3*864e5)), type:'event'},
    {date: iso(new Date(today+4*864e5)), type:'due'}
  ];

  persist();
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'taara-admin-data.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      Object.assign(state, data);
      persist();
      renderAll();
    }catch(err){ alert('Invalid JSON file'); }
  };
  reader.readAsText(file);
});

// ---- Dashboard widgets ----
const dueList = document.getElementById('dueList');
function renderDue(){
  dueList.innerHTML = '';
  state.dues.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.text}</span>
      <div class="actions">
        <button class="chip" data-act="done">Done</button>
        <button class="chip" data-act="del">Del</button>
      </div>`;
    li.querySelector('[data-act="done"]').onclick = () => { li.style.opacity = .5; };
    li.querySelector('[data-act="del"]').onclick = () => { state.dues = state.dues.filter(d=>d.id!==item.id); persist(); renderDue(); };
    dueList.appendChild(li);
  });
}

// Calendar
let calMonth = new Date(); // current month
const calEl = document.getElementById('calendar');
document.getElementById('prevMonth').onclick = () => { calMonth.setMonth(calMonth.getMonth()-1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { calMonth.setMonth(calMonth.getMonth()+1); renderCalendar(); };
function renderCalendar(){
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay()+6)%7; // make Monday first
  const days = new Date(y, m+1, 0).getDate();
  calEl.innerHTML = '';
  // weekday headers
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    const h = document.createElement('div'); h.className='day'; h.style.background='transparent'; h.style.border='none'; h.textContent=d;
    calEl.appendChild(h);
  });
  for(let i=0;i<offset;i++){ const pad = document.createElement('div'); pad.className='day'; pad.style.visibility='hidden'; calEl.appendChild(pad); }
  for(let d=1; d<=days; d++){
    const cell = document.createElement('div'); cell.className='day';
    const dateISO = toISO(y,m,d);
    cell.innerHTML = `<div class="date">${d}</div><div class="tags"></div>`;
    const tags = cell.querySelector('.tags');
    state.calendarMarks.filter(x => x.date === dateISO).forEach(x => {
      const b = document.createElement('span');
      b.className = 'badge ' + (x.type === 'rescue' ? 'info' : x.type === 'due' ? 'warn' : 'ok');
      tags.appendChild(b);
    });
    cell.addEventListener('click', () => openCalendarMarkModal(dateISO));
    calEl.appendChild(cell);
  }
}

function openCalendarMarkModal(dateISO){
  openModal('Mark day', html`
    <div class="row gap">
      <input type="date" id="mkDate" class="input" value="${dateISO}" />
      <select id="mkType" class="input">
        <option value="rescue">Rescue</option>
        <option value="due">Due</option>
        <option value="event">Event</option>
      </select>
      <button class="btn" id="mkAdd">Add</button>
    </div>
    <ul class="list compact">${state.calendarMarks.filter(x=>x.date===dateISO).map(x=>`<li>${x.type}<button class="chip" data-del="${x.date}|${x.type}">Del</button></li>`).join('')}</ul>
  `);
  document.getElementById('mkAdd').onclick = () => {
    const date = document.getElementById('mkDate').value;
    const type = document.getElementById('mkType').value;
    state.calendarMarks.push({date, type}); persist(); renderCalendar(); closeModal();
  };
  document.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
    const [date,type] = btn.dataset.del.split('|');
    state.calendarMarks = state.calendarMarks.filter(m => !(m.date===date && m.type===type));
    persist(); renderCalendar(); btn.closest('li').remove();
  });
}

// Quick event form
document.getElementById('quickEventForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  state.events.push({id:uid(), title:f.get('title'), date:f.get('date'), location:'', desc:''});
  persist(); renderEvents(); renderCalendar(); e.target.reset();
});

// Dashboard mini sections
function renderDashboardEventsMini(){
  const ul = document.getElementById('eventMiniList');
  ul.innerHTML = state.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(ev =>
    `<li><span>${ev.title}</span><span>${ev.date}</span></li>`).join('');
}
function renderDashboardDonationsMini(){
  const donors = document.getElementById('recentDonors');
  const donations = document.getElementById('recentDonations');
  const sorted = state.donations.slice().sort((a,b)=>b.date.localeCompare(a.date));
  donors.innerHTML = sorted.slice(0,5).map(d=>`<li><span>${d.donor}</span><span>₱${d.amount.toLocaleString()}</span></li>`).join('');
  donations.innerHTML = sorted.slice(0,5).map(d=>`<li><span>${d.date}</span><span>₱${d.amount.toLocaleString()}</span></li>`).join('');
}
function renderDashboardAdoptionQueue(){
  const ul = document.getElementById('adoptionQueue');
  const pending = state.adoptions.filter(a=>a.status==='pending');
  ul.innerHTML = pending.slice(0,6).map(a=>`<li><span>${a.applicant} • ${a.animal}</span><span>${a.submitted}</span></li>`).join('');
}

// ---- Adoption panel ----
const adoptionBody = document.querySelector('#adoptionTable tbody');
function renderAdoptions(){
  const filter = document.getElementById('adoptionFilter').value;
  const rows = state.adoptions.filter(a => filter==='all' || a.status===filter);
  adoptionBody.innerHTML = rows.map(a=>`
    <tr>
      <td>${a.applicant}</td>
      <td>${a.animal}</td>
      <td>${a.submitted}</td>
      <td><span class="chip">${a.status}</span></td>
      <td class="actions">
        <button class="chip" data-act="approve" data-id="${a.id}">Approve</button>
        <button class="chip" data-act="reject" data-id="${a.id}">Reject</button>
        <button class="chip" data-act="delete" data-id="${a.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  adoptionBody.querySelectorAll('[data-act]').forEach(btn => {
    const id = btn.dataset.id;
    btn.onclick = () => {
      const a = state.adoptions.find(x=>x.id===id); if(!a) return;
      if(btn.dataset.act==='approve') a.status='approved';
      if(btn.dataset.act==='reject') a.status='rejected';
      if(btn.dataset.act==='delete') state.adoptions = state.adoptions.filter(x=>x.id!==id);
      persist(); renderAdoptions(); renderDashboardAdoptionQueue();
    };
  });
}
document.getElementById('adoptionFilter').addEventListener('change', renderAdoptions);
document.getElementById('addAdoptionBtn').addEventListener('click', () => {
  openModal('New Adoption Application', html`
    <div class="row gap"><input id="applName" class="input" placeholder="Applicant full name" /></div>
    <div class="row gap"><input id="applAnimal" class="input" placeholder="Animal (e.g., Buddy the Dog)" /></div>
    <div class="row gap"><input id="applDate" type="date" class="input" /></div>
    <div class="row gap"><button id="applCreate" class="btn">Create</button></div>
  `);
  document.getElementById('applCreate').onclick = () => {
    const applicant = val('#applName'), animal = val('#applAnimal'), date = val('#applDate');
    if(!applicant || !animal || !date) return alert('Please complete the form');
    state.adoptions.push({id:uid(), applicant, animal, submitted:date, status:'pending'});
    persist(); renderAdoptions(); closeModal();
  };
});

// ---- Rescue panel ----
const rescueBody = document.querySelector('#rescueTable tbody');
function renderRescues(){
  rescueBody.innerHTML = state.rescues.map(r=>`
    <tr>
      <td>${r.reporter}</td>
      <td>${r.location}</td>
      <td>${r.date}</td>
      <td><span class="chip">${r.status}</span></td>
      <td class="actions">
        <button class="chip" data-act="progress" data-id="${r.id}">In-progress</button>
        <button class="chip" data-act="done" data-id="${r.id}">Resolved</button>
        <button class="chip" data-act="delete" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  rescueBody.querySelectorAll('[data-act]').forEach(btn => {
    const id = btn.dataset.id;
    btn.onclick = () => {
      const r = state.rescues.find(x=>x.id===id); if(!r) return;
      if(btn.dataset.act==='progress') r.status = 'in-progress';
      if(btn.dataset.act==='done') r.status = 'resolved';
      if(btn.dataset.act==='delete') state.rescues = state.rescues.filter(x=>x.id!==id);
      persist(); renderRescues(); renderCalendar();
    };
  });
}

// ---- Donation panel ----
const donationBody = document.querySelector('#donationTable tbody');
function renderDonations(){
  donationBody.innerHTML = state.donations.sort((a,b)=>b.date.localeCompare(a.date)).map(d=>`
    <tr>
      <td>${d.donor}</td>
      <td>₱${d.amount.toLocaleString()}</td>
      <td>${d.channel}</td>
      <td>${d.date}</td>
      <td class="actions">
        <button class="chip" data-act="delete" data-id="${d.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  donationBody.querySelectorAll('[data-act="delete"]').forEach(btn => {
    const id = btn.dataset.id;
    btn.onclick = () => { state.donations = state.donations.filter(x=>x.id!==id); persist(); renderDonations(); renderDonationStats(); };
  });
}
document.getElementById('addDonationBtn').addEventListener('click', () => {
  openModal('Add Donation', html`
    <div class="row gap"><input id="donor" class="input" placeholder="Donor name" /></div>
    <div class="row gap"><input id="amount" type="number" min="0" class="input" placeholder="Amount (₱)" /></div>
    <div class="row gap"><input id="date" type="date" class="input" /></div>
    <div class="row gap">
      <select id="channel" class="input">
        <option>GCash</option><option>Bank</option><option>Cash</option>
      </select>
    </div>
    <div class="row gap"><button id="donCreate" class="btn">Add</button></div>
  `);
  document.getElementById('donCreate').onclick = () => {
    const donor=val('#donor'), amount=Number(val('#amount')), channel=val('#channel'), date=val('#date');
    if(!donor || !amount || !date) return alert('Please complete the form');
    state.donations.push({id:uid(), donor, amount, channel, date});
    persist(); renderDonations(); renderDonationStats(); closeModal();
  };
});
document.getElementById('clearDonationsBtn').addEventListener('click',()=>{
  if(confirm('Clear all donations?')){ state.donations=[]; persist(); renderDonations(); renderDonationStats(); }
});

function renderDonationStats(){
  const el = document.getElementById('donationStats');
  const total = state.donations.reduce((s,d)=>s+d.amount,0);
  const monthly = groupByMonth(state.donations);
  el.innerHTML = `
    <div class="stat"><span class="v">₱${total.toLocaleString()}</span>Total</div>
    <div class="stat"><span class="v">${state.donations.length}</span>Donations</div>
    <div class="stat"><span class="v">${Object.keys(monthly).length}</span>Months active</div>`;
}

// ---- Events panel ----
function renderEvents(){
  const list = document.getElementById('eventList');
  list.innerHTML = state.events.sort((a,b)=>a.date.localeCompare(b.date)).map(ev => `
    <li class="card-item">
      <h4>${ev.title}</h4>
      <div class="meta">${ev.date} • ${ev.location || 'TBA'}</div>
      <p>${ev.desc || ''}</p>
      <div class="row gap">
        <button class="chip" data-edit="${ev.id}">Edit</button>
        <button class="chip" data-del="${ev.id}">Delete</button>
      </div>
    </li>
  `).join('');
  document.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
    state.events = state.events.filter(e=>e.id!==btn.dataset.del); persist(); renderEvents(); renderDashboardEventsMini(); renderCalendar();
  });
  document.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => openEventModal(btn.dataset.edit));
}
document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());

function openEventModal(id){
  const ev = state.events.find(e=>e.id===id) || {title:'', date:'', location:'', desc:''};
  openModal(id ? 'Edit Event' : 'Create Event', html`
    <div class="row gap"><input id="eTitle" class="input" placeholder="Title" value="${ev.title}"/></div>
    <div class="row gap"><input id="eDate" type="date" class="input" value="${ev.date}"/></div>
    <div class="row gap"><input id="eLoc" class="input" placeholder="Location" value="${ev.location}"/></div>
    <div class="row gap"><input id="eDesc" class="input" placeholder="Description" value="${ev.desc}"/></div>
    <div class="row gap"><button id="eSave" class="btn">${id?'Save':'Create'}</button></div>
  `);
  document.getElementById('eSave').onclick = () => {
    const title=val('#eTitle'), date=val('#eDate'), location=val('#eLoc'), desc = val('#eDesc');
    if(!title||!date) return alert('Title and date are required');
    if(id){
      Object.assign(ev, {title,date,location,desc});
    }else{
      state.events.push({id:uid(), title,date,location,desc});
    }
    persist(); renderEvents(); renderDashboardEventsMini(); renderCalendar(); closeModal();
  };
}

// ---- Analytics (charts) ----
let yearChart, monthChart;
function renderCharts(){
  // Example data derived from adoptions by year/month
  const byYear = {};
  state.adoptions.forEach(a => {
    const y = a.submitted.slice(0,4);
    byYear[y] = (byYear[y]||0) + 1;
  });
  const years = Object.keys(byYear).sort();
  const yearVals = years.map(y=>byYear[y]);
  if(yearChart) yearChart.destroy();
  yearChart = new Chart(document.getElementById('adoptionYearChart'), {
    type:'line',
    data:{ labels:years, datasets:[{ label:'Adoptions', data:yearVals, fill:false }]},
    options:{ responsive:true, plugins:{ legend:{display:false} } }
  });

  const byMonth = Array(12).fill(0);
  const thisYear = new Date().getFullYear().toString();
  state.adoptions.filter(a=>a.submitted.startsWith(thisYear)).forEach(a=>{
    const m = Number(a.submitted.slice(5,7))-1; byMonth[m]++;
  });
  if(monthChart) monthChart.destroy();
  monthChart = new Chart(document.getElementById('adoptionMonthChart'), {
    type:'bar',
    data:{ labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], datasets:[{ label:'Adoptions', data:byMonth }]},
    options:{ responsive:true, plugins:{ legend:{display:false} } }
  });
}

// ---- Utilities ----
function uid(){ return Math.random().toString(36).slice(2,9); }
function val(sel){ return document.querySelector(sel).value.trim(); }
function html(strings, ...values){ return strings.map((s,i)=>s+(values[i]??'')).join(''); }
function toISO(y,m,d){ return new Date(y,m,d).toISOString().slice(0,10); }
function groupByMonth(rows){
  return rows.reduce((acc, r) => {
    const key = r.date.slice(0,7);
    acc[key] = (acc[key]||0) + 1; return acc;
  }, {});
}

// ---- Modal helpers ----
const modal = document.getElementById('modal');
function openModal(title, bodyHTML){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  modal.showModal();
}
function closeModal(){ modal.close(); }

// ---- Initial render ----
function renderAll(){
  renderDue(); renderCalendar();
  renderDashboardEventsMini(); renderDashboardDonationsMini(); renderDashboardAdoptionQueue();
  renderAdoptions(); renderRescues(); renderDonations(); renderDonationStats(); renderEvents(); renderCharts();
}
renderAll();
