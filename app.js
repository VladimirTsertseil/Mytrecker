(()=>{
const root=document.getElementById('app');
const PROGRAM=window.PROGRAM_116;
if(!PROGRAM) throw new Error('PROGRAM_116 is missing');
const P=PROGRAM.routines;
const STORAGE='tracker116-state-v1', HISTORY='tracker116-history-v1', SOUND_PREF='tracker116-sound-v1';
function mk(k){return{ex:0,set:0,edit:false,items:P[k].map(x=>({rir:'',tech:'',note:'',sets:Array.from({length:x.sets},(_,i)=>({weight:i===0?(x.w||''):'',reps:String(x.t[i]??''),done:false}))}))}}
function fresh(){return{S:{A:mk('A'),B:mk('B'),C:mk('C')},R:'C',started:null,finished:null,restEnd:null,programVersion:PROGRAM.version}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));if(!x||x.programVersion!==PROGRAM.version)return fresh();return x}catch(e){return fresh()}}
let state=load(),S=state.S,R=state.R,started=state.started,finished=state.finished,restEnd=state.restEnd;
let timer=null,restSec=120,restRun=!!(restEnd&&restEnd>Date.now()),signaled=false;
let soundEnabled=localStorage.getItem(SOUND_PREF)!=='off';
const restSound=new Audio('./yeah-buddy.mp3'); restSound.preload='auto'; restSound.volume=1;
let soundUnlocked=false;
const $=s=>root.querySelector(s),soundBtn=$('#soundBtn'),weightLabel=$('#weightLabel'),clock=$('#clock'),rclock=$('#restClock'),rlabel=$('#restLabel'),meta=$('#meta'),name=$('#name'),plan=$('#plan'),warm=$('#warm'),tabs=$('#tabs'),weight=$('#weight'),reps=$('#reps'),repLabel=$('#repLabel'),rir=$('#rir'),tech=$('#tech'),note=$('#note'),done=$('#done'),finalPanel=$('#finalPanel'),summaryPanel=$('#summaryPanel'),summary=$('#summary'),status=$('#status'),historyPanel=$('#historyPanel'),historyList=$('#historyList');
$('#version').textContent='Программа '+PROGRAM.version;

function updateSoundButton(){
  if(!soundBtn)return;
  soundBtn.textContent=soundEnabled?'🔊 Звук':'🔇 Звук';
  soundBtn.setAttribute('aria-pressed',soundEnabled?'true':'false');
}
function unlockSound(){
  if(soundUnlocked||!soundEnabled)return;
  try{
    const oldVol=restSound.volume;
    restSound.volume=0;
    restSound.currentTime=0;
    const p=restSound.play();
    if(p&&typeof p.then==='function')p.then(()=>{restSound.pause();restSound.currentTime=0;restSound.volume=oldVol;soundUnlocked=true}).catch(()=>{restSound.volume=oldVol});
    else {restSound.pause();restSound.currentTime=0;restSound.volume=oldVol;soundUnlocked=true}
  }catch(e){}
}
function playRestSound(){
  if(!soundEnabled)return;
  try{
    restSound.pause();restSound.currentTime=0;restSound.volume=1;
    const p=restSound.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{status.textContent='Отдых закончен · звук заблокирован iOS — нажми «🔊 Звук» один раз'});
  }catch(e){}
}

function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({S,R,started,finished,restEnd,programVersion:PROGRAM.version}))}catch(e){}}
function fmt(s){s=Math.max(0,Math.floor(s||0));return[Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(v=>String(v).padStart(2,'0')).join(':')}
function fmtR(s){s=Math.max(0,Math.ceil(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function cur(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex];return{r,p,item,set:item.sets[r.set]}}
function saveFields(){const c=cur();c.set.weight=weight.value.trim().replace(',','.');c.set.reps=reps.value.trim();c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();persist()}
function startClock(){if(started)return;started=Date.now();finished=null;if(!timer)timer=setInterval(tick,250);persist()}
function tick(){if(started)clock.textContent=fmt(((finished||Date.now())-started)/1000);if(restRun&&restEnd){const left=Math.max(0,(restEnd-Date.now())/1000);restSec=Math.ceil(left);rclock.textContent=fmtR(restSec);rlabel.textContent='Отдых '+fmtR(restSec).replace(/^00:/,'');if(left<=0){restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых 0:00';if(!signaled){signaled=true;status.textContent='Отдых закончен';playRestSound()}persist()}}}
function startRest(){restSec=120;restEnd=Date.now()+120000;restRun=true;signaled=false;if(!timer)timer=setInterval(tick,250);tick();persist()}
function adjust(d){if(restRun&&restEnd)restEnd=Math.max(Date.now(),restEnd+d*1000);else {restSec=Math.max(0,restSec+d);restEnd=Date.now()+restSec*1000;restRun=restSec>0}tick();persist()}
function skip(){restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых 0:00';persist()}
function render(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex],s=item.sets[r.set];root.querySelectorAll('[data-routine]').forEach(b=>b.classList.toggle('active',b.dataset.routine===R));meta.textContent=`${r.ex+1}/${P[R].length} · подход ${r.set+1}/${p.sets}`;name.textContent=p.name;plan.textContent=p.plan;warm.textContent=p.warm||'';warm.style.display=p.warm?'block':'none';repLabel.textContent=p.label||'Повторы';weightLabel.textContent=(R==='C'&&r.ex===7)?'Деления':'Вес, кг';tabs.innerHTML='';item.sets.forEach((st,i)=>{const b=document.createElement('button');b.type='button';b.className='setbtn'+(i===r.set?' active':'');b.textContent=(st.done?'✓':'')+(i+1);b.addEventListener('click',()=>{saveFields();r.set=i;r.edit=st.done;persist();render()});tabs.appendChild(b)});weight.value=s.weight||'';reps.value=s.reps||'';rir.value=item.rir||'';tech.value=item.tech||'';note.value=item.note||'';done.textContent=r.edit?'Сохранить':'✓ Готово';$('#prev').disabled=r.ex===0;$('#next').disabled=r.ex===P[R].length-1;$('#prev').classList.toggle('disabled',r.ex===0);$('#next').classList.toggle('disabled',r.ex===P[R].length-1);tick()}
$('#setForm').addEventListener('submit',e=>{e.preventDefault();unlockSound();const r=S[R],c=cur(),w=weight.value.trim().replace(',','.'),rp=reps.value.trim();if(w&&(!Number.isFinite(Number(w))||Number(w)<0)){status.textContent='Проверь вес';weight.focus();return}if(rp&&(!Number.isFinite(Number(rp))||Number(rp)<0)){status.textContent='Проверь значение';reps.focus();return}c.set.weight=w;c.set.reps=rp;c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();if(r.edit){c.set.done=true;r.edit=false;status.textContent='Подход сохранён';persist();render();return}c.set.done=true;startClock();startRest();if(r.set+1<c.item.sets.length){const n=c.item.sets[r.set+1];if(!n.done){n.weight=w;n.reps=rp}r.set++}status.textContent='Подход выполнен';persist();render()});
root.querySelectorAll('[data-routine]').forEach(b=>b.addEventListener('click',()=>{saveFields();R=b.dataset.routine;summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden');historyPanel.classList.add('hidden');persist();render()}));
$('#minus').addEventListener('click',()=>adjust(-30));$('#plus').addEventListener('click',()=>adjust(30));$('#skip').addEventListener('click',skip);
$('#prev').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex>0){r.ex--;r.set=0;r.edit=false;persist();render()}});
$('#next').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex<P[R].length-1){r.ex++;r.set=0;r.edit=false;persist();render()}});
$('#finish').addEventListener('click',()=>{saveFields();finished=Date.now();skip();tick();finalPanel.classList.remove('hidden');summaryPanel.classList.add('hidden');persist()});
function makeSummary(){const r=S[R],date=new Date().toLocaleDateString('ru-RU'),elapsed=started?((finished||Date.now())-started)/1000:0;let total=0,out=[`ТРЕНИРОВКА ${R} — ${date}`,`Время: ${fmt(elapsed)}`,''];P[R].forEach((p,ei)=>{const item=r.items[ei],d=item.sets.map((s,i)=>({s,i})).filter(x=>x.s.done);if(!d.length)return;out.push(p.name);out.push(d.map(({s,i})=>{total++;if(s.weight!==''&&s.reps!=='')return`${i+1}) ${s.weight} кг × ${s.reps}`;return`${i+1}) ${s.reps||'—'}`}).join(' · '));const details=[];if(item.rir)details.push(`RIR последнего: ${item.rir}`);if(item.tech)details.push(`техника: ${item.tech}`);if(item.note)details.push(`комментарий: ${item.note}`);if(details.length)out.push(details.join(' · '));out.push('')});out.push(`Всего рабочих подходов: ${total}`);const diff=$('#difficulty').value.trim(),hard=$('#hardest').value.trim(),pain=$('#pain').value.trim();if(diff)out.push(`Общая тяжесть: ${diff}/10`);if(hard)out.push(`Самое тяжёлое упражнение: ${hard}`);if(pain)out.push(`Боль/дискомфорт: ${pain}`);out.push('');out.push('Проанализируй эту тренировку в контексте программы «116 дней»: сравни с предыдущими результатами, оцени прогрессию и скажи, что менять в следующей тренировке.');return out.join('\n')}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY))||[]}catch(e){return[]}}
function storeHistory(text){const h=history();h.unshift({id:Date.now(),routine:R,date:new Date().toISOString(),programVersion:PROGRAM.version,text});localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,100)))}
function renderHistory(){const h=history();historyList.innerHTML='';if(!h.length){historyList.textContent='Пока нет завершённых тренировок.';return}h.forEach(x=>{const d=document.createElement('div');d.className='history-item';const title=document.createElement('div');title.innerHTML=`<b>Тренировка ${x.routine}</b><div class="history-meta">${new Date(x.date).toLocaleString('ru-RU')} · программа ${x.programVersion}</div>`;const b=document.createElement('button');b.type='button';b.textContent='Открыть сводку';b.addEventListener('click',()=>{summary.value=x.text;summaryPanel.classList.remove('hidden');historyPanel.classList.add('hidden')});d.append(title,b);historyList.appendChild(d)})}
$('#makeSummary').addEventListener('click',()=>{saveFields();const text=makeSummary();summary.value=text;summaryPanel.classList.remove('hidden');storeHistory(text);status.textContent='Сводка сохранена в истории'});
$('#selectText').addEventListener('click',()=>{summary.focus();summary.select();summary.setSelectionRange(0,summary.value.length)});
soundBtn.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem(SOUND_PREF,soundEnabled?'on':'off');updateSoundButton();if(soundEnabled){soundUnlocked=false;unlockSound();status.textContent='Звук отдыха включён'}else{restSound.pause();restSound.currentTime=0;status.textContent='Звук отдыха выключен'}});
$('#historyBtn').addEventListener('click',()=>{renderHistory();historyPanel.classList.remove('hidden');summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden')});
$('#closeHistory').addEventListener('click',()=>historyPanel.classList.add('hidden'));
window.addEventListener('pagehide',saveFields);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveFields()});
if(started&&!finished&&!timer)timer=setInterval(tick,250);if(restRun&&!timer)timer=setInterval(tick,250);updateSoundButton();render();
})();
