const CATS={out:[["Makanan","🍜"],["Transportasi","🛵"],["Belanja","🛍️"],["Tagihan","💡"],["Kesehatan","💊"],["Hiburan","🎬"],["Pendidikan","📚"],["Lainnya","📦"]],in:[["Gaji","💼"],["Bonus","🎁"],["Usaha","🏪"],["Lainnya","💰"]]};
const ICON={};Object.values(CATS).flat().forEach(([n,i])=>ICON[n]=i);
const $=id=>document.getElementById(id);
const rp=n=>"Rp"+Math.round(n).toLocaleString("id-ID");
const num=s=>parseInt(String(s).replace(/\D/g,""),10)||0;
const fmtInput=e=>{const n=num(e.target.value);e.target.value=n?n.toLocaleString("id-ID"):""};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let S={tx:[],budgets:{}},type="out",editId=null,month=today().slice(0,7);
try{const r=localStorage.getItem("catatan-keuangan-v1");if(r){const p=JSON.parse(r);if(p&&Array.isArray(p.tx))S=p}}catch(e){}
const persist=()=>{try{localStorage.setItem("catatan-keuangan-v1",JSON.stringify(S))}catch(e){}};
let tt;const toast=m=>{const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),1800)};

try{const th=localStorage.getItem("catatan-theme");if(th)document.documentElement.dataset.theme=th}catch(e){}
$("theme").onclick=()=>{const dark=matchMedia("(prefers-color-scheme:dark)").matches;const cur=document.documentElement.dataset.theme||(dark?"dark":"light");const n=cur==="dark"?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("catatan-theme",n)}catch(e){}};

function fillCats(){
  $("cat").innerHTML=CATS[type].map(([n,i])=>`<option value="${n}">${i} ${n}</option>`).join("");
  const all=[...new Set([...CATS.out,...CATS.in].map(c=>c[0]))];
  const v=$("fCat").value;
  $("fCat").innerHTML='<option value="">Semua kategori</option>'+all.map(n=>`<option>${n}</option>`).join("");
  $("fCat").value=v;
}
function setType(t){type=t;$("tOut").classList.toggle("on",t==="out");$("tIn").classList.toggle("on",t==="in");fillCats()}
$("tOut").onclick=()=>setType("out");$("tIn").onclick=()=>setType("in");
$("amount").oninput=fmtInput;$("budget").oninput=fmtInput;

function resetForm(){editId=null;$("amount").value="";$("note").value="";$("date").value=today();$("formTitle").textContent="Tambah transaksi";$("save").textContent="Simpan transaksi";$("cancel").hidden=true;setType("out")}
$("cancel").onclick=resetForm;

$("save").onclick=()=>{
  const a=num($("amount").value);
  if(!a){toast("Isi jumlah lebih dari nol");$("amount").focus();return}
  if(!$("date").value){toast("Pilih tanggal");return}
  const t={id:editId||Date.now().toString(36)+Math.random().toString(36).slice(2,5),type,amount:a,cat:$("cat").value,date:$("date").value,note:$("note").value.trim()};
  if(editId){S.tx=S.tx.map(x=>x.id===editId?t:x);toast("Transaksi diperbarui")}else{S.tx.push(t);toast("Transaksi disimpan")}
  month=t.date.slice(0,7);$("month").value=month;
  persist();resetForm();render();
};

$("saveBudget").onclick=()=>{const b=num($("budget").value);if(b)S.budgets[month]=b;else delete S.budgets[month];persist();render();toast(b?"Anggaran disimpan":"Anggaran dihapus")};

const shift=d=>{const [y,m]=month.split("-").map(Number);const dt=new Date(y,m-1+d,1);month=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");$("month").value=month;render()};
$("prev").onclick=()=>shift(-1);$("next").onclick=()=>shift(1);
$("month").onchange=e=>{if(e.target.value){month=e.target.value;render()}};
["q","fType","fCat"].forEach(i=>$(i).oninput=render);

function edit(id){
  const t=S.tx.find(x=>x.id===id);if(!t)return;
  editId=id;setType(t.type);$("amount").value=t.amount.toLocaleString("id-ID");$("cat").value=t.cat;$("date").value=t.date;$("note").value=t.note;
  $("formTitle").textContent="Ubah transaksi";$("save").textContent="Simpan perubahan";$("cancel").hidden=false;
  $("form").scrollIntoView({behavior:"smooth",block:"center"});
}
function del(id){if(confirm("Hapus transaksi ini?")){S.tx=S.tx.filter(x=>x.id!==id);persist();render();toast("Transaksi dihapus")}}
$("list").onclick=e=>{const b=e.target.closest("button[data-a]");if(!b)return;b.dataset.a==="e"?edit(b.dataset.id):del(b.dataset.id)};

$("clear").onclick=()=>{if(confirm("Hapus semua transaksi dan anggaran? Tindakan ini tidak bisa dibatalkan.")){S={tx:[],budgets:{}};persist();render();toast("Semua data dihapus")}};
$("copy").onclick=async()=>{
  const rows=S.tx.filter(t=>t.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  if(!rows.length){toast("Belum ada transaksi bulan ini");return}
  const csv="tanggal,jenis,kategori,jumlah,catatan\n"+rows.map(t=>[t.date,t.type==="in"?"pemasukan":"pengeluaran",t.cat,t.amount,'"'+t.note.replace(/"/g,'""')+'"'].join(",")).join("\n");
  try{await navigator.clipboard.writeText(csv);toast("CSV tersalin. Tempel di Excel atau Sheets")}catch(e){toast("Browser tidak mengizinkan menyalin")}
};

function render(){
  const mt=S.tx.filter(t=>t.date.startsWith(month));
  const inc=mt.filter(t=>t.type==="in").reduce((s,t)=>s+t.amount,0);
  const exp=mt.filter(t=>t.type==="out").reduce((s,t)=>s+t.amount,0);
  const bal=inc-exp;
  $("sBal").textContent=(bal<0?"-":"")+rp(Math.abs(bal));$("sBal").className="big "+(bal<0?"out":"");
  $("sIn").textContent=rp(inc);$("sOut").textContent=rp(exp);

  const bg=S.budgets[month],f=$("bFill");
  $("budget").value=bg?bg.toLocaleString("id-ID"):"";
  if(bg){const p=exp/bg*100;f.style.width=Math.min(p,100)+"%";f.className=p>=100?"over":p>=80?"warn":"";
    $("bText").textContent=exp>bg?`Melebihi anggaran ${rp(exp-bg)} (terpakai ${rp(exp)} dari ${rp(bg)})`:`Terpakai ${rp(exp)} dari ${rp(bg)}. Sisa ${rp(bg-exp)} (${Math.round(p)}%)`}
  else{f.style.width="0";f.className="";$("bText").textContent="Belum ada batas anggaran untuk bulan ini."}

  const by={};mt.filter(t=>t.type==="out").forEach(t=>by[t.cat]=(by[t.cat]||0)+t.amount);
  const ent=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  $("cats").innerHTML=ent.length?ent.map(([n,v])=>`<div class="cat"><div class="t"><span>${ICON[n]||"📦"} ${esc(n)}</span><span><b>${rp(v)}</b> <span class="lbl">${Math.round(v/exp*100)}%</span></span></div><div class="bar"><i style="width:${v/ent[0][1]*100}%"></i></div></div>`).join(""):'<div class="empty">Belum ada pengeluaran bulan ini.</div>';

  const q=$("q").value.toLowerCase(),ft=$("fType").value,fc=$("fCat").value;
  const rows=mt.filter(t=>(!ft||t.type===ft)&&(!fc||t.cat===fc)&&(!q||(t.note+" "+t.cat).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  $("list").innerHTML=rows.length?rows.map(t=>{const d=new Date(t.date+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
    return `<div class="tx"><div class="dot">${ICON[t.cat]||"📦"}</div><div class="m"><b>${esc(t.note||t.cat)}</b><span>${esc(t.cat)} · ${d}</span></div><div class="amt ${t.type==="in"?"in":"out"}">${t.type==="in"?"+":"-"}${rp(t.amount)}</div><button class="sm" data-a="e" data-id="${t.id}" aria-label="Ubah">Ubah</button><button class="sm" data-a="d" data-id="${t.id}" aria-label="Hapus">Hapus</button></div>`}).join(""):`<div class="empty">${mt.length?"Tidak ada transaksi yang cocok dengan filter.":"Belum ada transaksi. Tambahkan yang pertama lewat formulir di atas."}</div>`;
}

$("month").value=month;fillCats();resetForm();render();
