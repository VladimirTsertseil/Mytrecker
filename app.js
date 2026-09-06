(()=>{
const root=document.getElementById('app');
const PROGRAM=window.PROGRAM_116;
if(!PROGRAM) throw new Error('PROGRAM_116 is missing');
const P=PROGRAM.routines;


// --- Audio overlay mode v1.6 ---
// On supporting iOS/WebKit builds, "transient" lets a short app sound mix with
// music from another app instead of taking over the phone's playback session.
const restAudio = new Audio('rest-whistle-v13.wav');
restAudio.preload = 'auto';

let previousAudioSessionType = null;

function enterTransientAudioSession() {
  try {
    if ('audioSession' in navigator && navigator.audioSession) {
      previousAudioSessionType = navigator.audioSession.type || 'auto';
      navigator.audioSession.type = 'transient';
    }
  } catch (e) {}
}

function leaveTransientAudioSession() {
  try {
    if ('audioSession' in navigator && navigator.audioSession) {
      navigator.audioSession.type = previousAudioSessionType || 'auto';
    }
  } catch (e) {}
  previousAudioSessionType = null;
}

async function playRestSignal(){
  if (!soundEnabled) return;
  try{
    enterTransientAudioSession();
    restAudio.currentTime = 0;
    await restAudio.play();
  }catch(e){
    leaveTransientAudioSession();
  }
}

restAudio.addEventListener('ended', leaveTransientAudioSession);
restAudio.addEventListener('pause', () => {
  if (restAudio.currentTime === 0 || restAudio.ended) leaveTransientAudioSession();
});

const STORAGE='tracker116-state-v1', HISTORY='tracker116-history-v1', SOUND_PREF='tracker116-sound-v1', PENDING='tracker116-pending-finish-v1';
function mk(k){return{ex:0,set:0,edit:false,items:P[k].map(x=>({rir:'',tech:'',note:'',sets:Array.from({length:x.sets},(_,i)=>({weight:i===0?(x.w||''):'',reps:String(x.t[i]??''),done:false}))}))}}
function fresh(){return{S:{A:mk('A'),B:mk('B'),C:mk('C')},R:'C',started:null,finished:null,restEnd:null,programVersion:PROGRAM.version}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));if(!x||x.programVersion!==PROGRAM.version)return fresh();return x}catch(e){return fresh()}}
let state=load(),S=state.S,R=state.R,started=state.started,finished=state.finished,restEnd=state.restEnd;
let pendingFinish=null;
try{pendingFinish=JSON.parse(localStorage.getItem(PENDING))||null}catch(e){pendingFinish=null}
let timer=null,restSec=120,restRun=!!(restEnd&&restEnd>Date.now()),signaled=false;
let soundEnabled=localStorage.getItem(SOUND_PREF)!=='off';
let soundUnlocked=false;
const $=s=>root.querySelector(s),soundBtn=$('#soundBtn'),startWorkoutBtn=$('#startWorkout'),weightLabel=$('#weightLabel'),clock=$('#clock'),rclock=$('#restClock'),rlabel=$('#restLabel'),meta=$('#meta'),name=$('#name'),plan=$('#plan'),warm=$('#warm'),tabs=$('#tabs'),weight=$('#weight'),reps=$('#reps'),repLabel=$('#repLabel'),rir=$('#rir'),tech=$('#tech'),note=$('#note'),done=$('#done'),finalPanel=$('#finalPanel'),summaryPanel=$('#summaryPanel'),summary=$('#summary'),status=$('#status'),historyPanel=$('#historyPanel'),historyList=$('#historyList'),restControls=$('#restControls');
$('#version').textContent='Программа '+PROGRAM.version;

function updateSoundButton(){
  if(!soundBtn)return;
  soundBtn.textContent=soundEnabled?'🔊 Звук':'🔇 Звук';
  soundBtn.setAttribute('aria-pressed',soundEnabled?'true':'false');
}
function unlockSound(){
  if(soundUnlocked||!soundEnabled)return;
  try{
    enterTransientAudioSession();
    const oldVol=restAudio.volume;
    restAudio.volume=0;
    restAudio.currentTime=0;
    const p=restAudio.play();
    if(p&&typeof p.then==='function')p.then(()=>{
      restAudio.pause();restAudio.currentTime=0;restAudio.volume=oldVol;
      soundUnlocked=true;leaveTransientAudioSession();
    }).catch(()=>{
      restAudio.volume=oldVol;leaveTransientAudioSession();
    });
    else{
      restAudio.pause();restAudio.currentTime=0;restAudio.volume=oldVol;
      soundUnlocked=true;leaveTransientAudioSession();
    }
  }catch(e){leaveTransientAudioSession();}
}
function playRestSound(){playRestSignal();}

function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({S,R,started,finished,restEnd,programVersion:PROGRAM.version}))}catch(e){}}
function clearTimerLoop(){if(timer){clearInterval(timer);timer=null}}
function syncLifecycleUI(){
  const active=!!(started&&!finished);
  if(startWorkoutBtn) startWorkoutBtn.style.display=active?'none':'inline-flex';
  const finishBtn=$('#finish');
  if(finishBtn){
    finishBtn.disabled=!active;
    finishBtn.classList.toggle('disabled',!active);
    finishBtn.setAttribute('aria-disabled',active?'false':'true');
  }
  if(restControls) restControls.style.display=restRun?'flex':'none';
  if(!restRun){
    if(restSec===0){
      rclock.textContent='00:00';
      rlabel.textContent='Отдых закончен';
    }else{
      rclock.textContent='02:00';
      rlabel.textContent='Отдых 2:00';
    }
  }
}

function resetLiveWorkout(preserveRoutine=true){
  const keepR=preserveRoutine?R:'C';
  S={A:mk('A'),B:mk('B'),C:mk('C')};
  R=keepR;
  started=null;finished=null;restEnd=null;restSec=120;restRun=false;signaled=false;
  clearTimerLoop();
  clock.textContent='00:00:00';
  rclock.textContent='02:00';
  rlabel.textContent='Отдых 2:00';
  $('#difficulty').value='';$('#hardest').value='';$('#pain').value='';
  finalPanel.classList.add('hidden');
  persist();
  syncLifecycleUI();
}
function beginWorkout(){
  if(started&&!finished){
    if(!confirm('Текущая тренировка уже идёт. Сбросить её и начать заново?'))return;
    resetLiveWorkout(true);
  }else if(finished){
    resetLiveWorkout(true);
  }
  started=Date.now();
  finished=null;
  restRun=false;restEnd=null;restSec=120;signaled=false;
  clearTimerLoop();
  timer=setInterval(tick,250);
  persist();
  syncLifecycleUI();
  status.textContent=`Тренировка ${R} начата`;
  tick();
  render();
}

function fmt(s){s=Math.max(0,Math.floor(s||0));return[Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(v=>String(v).padStart(2,'0')).join(':')}
function fmtR(s){s=Math.max(0,Math.ceil(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function cur(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex];return{r,p,item,set:item.sets[r.set]}}
function saveFields(){const c=cur();c.set.weight=weight.value.trim().replace(',','.');c.set.reps=reps.value.trim();c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();persist()}
function startClock(){if(started&&!finished)return;started=Date.now();finished=null;if(!timer)timer=setInterval(tick,250);persist()}
function tick(){if(started)clock.textContent=fmt(((finished||Date.now())-started)/1000);if(restRun&&restEnd){const left=Math.max(0,(restEnd-Date.now())/1000);restSec=Math.ceil(left);rclock.textContent=fmtR(restSec);rlabel.textContent='Отдых '+fmtR(restSec).replace(/^00:/,'');if(left<=0){restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых закончен';if(restControls)restControls.style.display='none';if(!signaled){signaled=true;status.textContent='Отдых закончен';playRestSound()}persist()}}}
function startRest(){restSec=120;restEnd=Date.now()+120000;restRun=true;signaled=false;if(restControls)restControls.style.display='flex';if(!timer)timer=setInterval(tick,250);tick();persist()}
function adjust(d){if(!restRun||!restEnd)return;restEnd=Math.max(Date.now(),restEnd+d*1000);tick();persist()}
function skip(){if(!restRun)return;restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых закончен';if(restControls)restControls.style.display='none';persist()}
function render(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex],s=item.sets[r.set];root.querySelectorAll('[data-routine]').forEach(b=>b.classList.toggle('active',b.dataset.routine===R));meta.textContent=`${r.ex+1}/${P[R].length} · подход ${r.set+1}/${p.sets}`;name.textContent=p.name;plan.textContent=p.plan;warm.textContent=p.warm||'';warm.style.display=p.warm?'block':'none';repLabel.textContent=p.label||'Повторы';weightLabel.textContent=(R==='C'&&r.ex===7)?'Деления':'Вес, кг';tabs.innerHTML='';item.sets.forEach((st,i)=>{const b=document.createElement('button');b.type='button';b.className='setbtn'+(i===r.set?' active':'');b.textContent=(st.done?'✓':'')+(i+1);b.addEventListener('click',()=>{saveFields();r.set=i;r.edit=st.done;persist();render()});tabs.appendChild(b)});weight.value=s.weight||'';reps.value=s.reps||'';rir.value=item.rir||'';tech.value=item.tech||'';note.value=item.note||'';done.textContent=r.edit?'Сохранить':'✓ Готово';$('#prev').disabled=r.ex===0;$('#next').disabled=r.ex===P[R].length-1;$('#prev').classList.toggle('disabled',r.ex===0);$('#next').classList.toggle('disabled',r.ex===P[R].length-1);tick();syncLifecycleUI();}
$('#setForm').addEventListener('submit',e=>{e.preventDefault();unlockSound();const r=S[R],c=cur(),w=weight.value.trim().replace(',','.'),rp=reps.value.trim();if(w&&(!Number.isFinite(Number(w))||Number(w)<0)){status.textContent='Проверь вес';weight.focus();return}if(rp&&(!Number.isFinite(Number(rp))||Number(rp)<0)){status.textContent='Проверь значение';reps.focus();return}c.set.weight=w;c.set.reps=rp;c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();if(r.edit){c.set.done=true;r.edit=false;status.textContent='Подход сохранён';persist();render();return}if(!started||finished){status.textContent='Сначала нажми «Начать тренировку»';return}c.set.done=true;startRest();if(r.set+1<c.item.sets.length){const n=c.item.sets[r.set+1];if(!n.done){n.weight=w;n.reps=rp}r.set++}status.textContent='Подход выполнен';persist();render()});
root.querySelectorAll('[data-routine]').forEach(b=>b.addEventListener('click',()=>{
  const nextR=b.dataset.routine;
  if(nextR===R)return;
  if(started&&!finished){
    const ok=confirm(`Сейчас идёт тренировка ${R}. Переключиться на ${nextR}? Текущая тренировка останется незавершённой.`);
    if(!ok)return;
  }
  saveFields();R=nextR;summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden');historyPanel.classList.add('hidden');persist();render();
}));
$('#minus').addEventListener('click',()=>adjust(-30));$('#plus').addEventListener('click',()=>adjust(30));$('#skip').addEventListener('click',skip);
$('#prev').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex>0){r.ex--;r.set=0;r.edit=false;persist();render()}});
$('#next').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex<P[R].length-1){r.ex++;r.set=0;r.edit=false;persist();render()}});
$('#finish').addEventListener('click',()=>{
  if(!started||finished){
    status.textContent='Сначала начни тренировку';
    syncLifecycleUI();
    return;
  }
  if(!confirm(`Завершить тренировку ${R}?`))return;
  saveFields();
  const ended=Date.now();
  const effectiveStart=started||ended;
  pendingFinish={S:JSON.parse(JSON.stringify(S)),R,started:effectiveStart,finished:ended,programVersion:PROGRAM.version};
  try{localStorage.setItem(PENDING,JSON.stringify(pendingFinish))}catch(e){}
  restRun=false;restEnd=null;restSec=120;signaled=false;clearTimerLoop();
  resetLiveWorkout(true);
  clock.textContent='00:00:00';rclock.textContent='02:00';rlabel.textContent='Отдых 2:00';
  finalPanel.classList.remove('hidden');
  summaryPanel.classList.add('hidden');
  status.textContent='Тренировка завершена · таймер и рабочие поля сброшены';
  syncLifecycleUI();
  render();
});
function makeSummary(){
  const snap=pendingFinish||{S,R,started,finished,programVersion:PROGRAM.version};
  const rr=snap.R,r=snap.S[rr],date=new Date(snap.finished||Date.now()).toLocaleDateString('ru-RU');
  const elapsed=snap.started?((snap.finished||Date.now())-snap.started)/1000:0;
  let total=0,out=[`ТРЕНИРОВКА ${rr} — ${date}`,`Время: ${fmt(elapsed)}`,''];
  P[rr].forEach((p,ei)=>{
    const item=r.items[ei],d=item.sets.map((s,i)=>({s,i})).filter(x=>x.s.done);
    if(!d.length)return;
    out.push(p.name);
    out.push(d.map(({s,i})=>{total++;if(s.weight!==''&&s.reps!=='')return`${i+1}) ${s.weight} кг × ${s.reps}`;return`${i+1}) ${s.reps||'—'}`}).join(' · '));
    const details=[];
    if(item.rir)details.push(`RIR последнего: ${item.rir}`);
    if(item.tech)details.push(`техника: ${item.tech}`);
    if(item.note)details.push(`комментарий: ${item.note}`);
    if(details.length)out.push(details.join(' · '));
    out.push('');
  });
  out.push(`Всего рабочих подходов: ${total}`);
  const diff=$('#difficulty').value.trim(),hard=$('#hardest').value.trim(),pain=$('#pain').value.trim();
  if(diff)out.push(`Общая тяжесть: ${diff}/10`);
  if(hard)out.push(`Самое тяжёлое упражнение: ${hard}`);
  if(pain)out.push(`Боль/дискомфорт: ${pain}`);
  out.push('');
  out.push('Проанализируй эту тренировку в контексте программы «116 дней»: сравни с предыдущими результатами, оцени прогрессию и скажи, что менять в следующей тренировке.');
  return out.join('\n');
}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY))||[]}catch(e){return[]}}
function storeHistory(text){
  const h=history(),snap=pendingFinish||{S,R,started,finished:Date.now(),programVersion:PROGRAM.version};
  const raw={
    routine:snap.R,
    started:snap.started||null,
    finished:snap.finished||Date.now(),
    programVersion:snap.programVersion||PROGRAM.version,
    exercises:P[snap.R].map((p,ei)=>{
      const item=snap.S[snap.R].items[ei];
      return {
        name:p.name,
        plan:p.plan||'',
        rir:item.rir||'',
        technique:item.tech||'',
        note:item.note||'',
        sets:item.sets.map((s,i)=>({set:i+1,weight:s.weight,reps:s.reps,done:!!s.done}))
      };
    })
  };
  h.unshift({id:Date.now(),routine:snap.R,date:new Date(snap.finished||Date.now()).toISOString(),programVersion:snap.programVersion||PROGRAM.version,text,data:raw});
  localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,100)));
}
function deleteHistoryItem(id){
  const h=history().filter(x=>x.id!==id);
  localStorage.setItem(HISTORY,JSON.stringify(h));
  renderHistory();
  status.textContent='Запись удалена из истории';
}
function renderHistory(){
  const h=history();historyList.innerHTML='';
  if(!h.length){historyList.textContent='Пока нет завершённых тренировок.';return}
  h.forEach(x=>{
    const d=document.createElement('div');d.className='history-item';
    const title=document.createElement('div');
    title.innerHTML=`<b>Тренировка ${x.routine}</b><div class="history-meta">${new Date(x.date).toLocaleString('ru-RU')} · программа ${x.programVersion}</div>`;
    const actions=document.createElement('div');actions.className='history-actions';
    const openBtn=document.createElement('button');openBtn.type='button';openBtn.textContent='Открыть сводку';
    openBtn.addEventListener('click',()=>{summary.value=x.text;summaryPanel.classList.remove('hidden');historyPanel.classList.add('hidden')});
    const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='history-delete';delBtn.textContent='Удалить';
    delBtn.addEventListener('click',()=>{if(confirm(`Удалить тренировку ${x.routine} от ${new Date(x.date).toLocaleString('ru-RU')}?`))deleteHistoryItem(x.id)});
    actions.append(openBtn,delBtn);d.append(title,actions);historyList.appendChild(d);
  });
}

function exportHistory(){
  try{
    const payload={
      exportedAt:new Date().toISOString(),
      app:'116 дней',
      appVersion:'1.7.1',
      programVersion:PROGRAM.version,
      history:history()
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`tracker-116-history-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='История экспортирована';
  }catch(e){
    status.textContent='Не удалось экспортировать историю';
  }
}

$('#makeSummary').addEventListener('click',()=>{
  const text=makeSummary();
  summary.value=text;summaryPanel.classList.remove('hidden');storeHistory(text);
  pendingFinish=null;try{localStorage.removeItem(PENDING)}catch(e){}
  finalPanel.classList.add('hidden');
  $('#difficulty').value='';$('#hardest').value='';$('#pain').value='';
  status.textContent='Сводка сохранена в истории · трекер готов к новой тренировке';
});
$('#selectText').addEventListener('click',()=>{summary.focus();summary.select();summary.setSelectionRange(0,summary.value.length)});
soundBtn.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem(SOUND_PREF,soundEnabled?'on':'off');updateSoundButton();if(soundEnabled){soundUnlocked=false;unlockSound();status.textContent='Звук отдыха включён'}else{restAudio.pause();restAudio.currentTime=0;leaveTransientAudioSession();status.textContent='Звук отдыха выключен'}});
$('#historyBtn').addEventListener('click',()=>{renderHistory();historyPanel.classList.remove('hidden');summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden')});
$('#closeHistory').addEventListener('click',()=>historyPanel.classList.add('hidden'));
$('#exportHistoryBtn').addEventListener('click',exportHistory);
startWorkoutBtn.addEventListener('click',beginWorkout);
window.addEventListener('pagehide',saveFields);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveFields()});
if(started&&!finished&&!timer)timer=setInterval(tick,250);
if(restRun&&!timer)timer=setInterval(tick,250);
if(pendingFinish){finalPanel.classList.remove('hidden');clock.textContent='00:00:00';rclock.textContent='02:00';rlabel.textContent='Отдых 2:00'}
updateSoundButton();syncLifecycleUI();render();
})();


// --- PWA update controls v1.3 ---
const TRACKER_APP_VERSION = '1.7.1';

async function forceTrackerUpdate() {
  const btn = document.getElementById('trackerUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Проверяю…'; }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      }
    }
    // Reload from the server; SW v1.3 uses network-first for navigation/assets.
    window.location.reload();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Обновить';
    }
    alert('Не удалось проверить обновление. Проверь интернет и попробуй ещё раз.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector('header') || document.body;
  if (!document.getElementById('trackerUpdateBtn')) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:8px 0;';
    const ver = document.createElement('span');
    ver.textContent = 'v' + TRACKER_APP_VERSION;
    ver.style.cssText = 'font-size:12px;opacity:.65;';
    const btn = document.createElement('button');
    btn.id = 'trackerUpdateBtn';
    btn.type = 'button';
    btn.textContent = '↻ Обновить';
    btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid currentColor;background:transparent;color:inherit;';
    btn.addEventListener('click', forceTrackerUpdate);
    wrap.append(ver, btn);
    host.appendChild(wrap);
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('tracker116-reloaded-v171')) {
      sessionStorage.setItem('tracker116-reloaded-v171', '1');
      window.location.reload();
    }
  });
}
