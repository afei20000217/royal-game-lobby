/* 山海經：神啟之境 — 原創高波動展示版。 */
const SYMBOLS = {
  /* Table order: 8–9, 10–11, 12+; exact proposal-table credits at bet 10. */
  /* Raw public pay-table values for the formula: (bet ÷ 20) × table value. */
  eye:{file:'18.jpg',name:'燭龍之眼',pay:[200,500,1000]}, dragon:{file:'10.jpg',name:'應龍',pay:[50,200,500]},
  baize:{file:'39.jpg',name:'白澤',pay:[40,100,300]}, bifang:{file:'40.jpg',name:'畢方',pay:[30,40,240]},
  fire:{file:'16.jpg',name:'赤炎玉',pay:[20,30,200]}, black:{file:'14.jpg',name:'黑玄玉',pay:[16,24,160]},
  jade:{file:'15.jpg',name:'白金玉',pay:[10,20,100]}, gold:{file:'17.jpg',name:'黃土玉',pay:[8,18,80]}, green:{file:'13.jpg',name:'青木玉',pay:[5,15,40]},
  fox:{file:'12.jpg',name:'九尾狐 Scatter',pay:null}, qingqiu:{file:'11.jpg',name:'青丘覺醒 Scatter',pay:null},
  orb:{file:'19.jpg',name:'倍率球',pay:null}, nuwa:{file:'45.jpg',name:'女媧',pay:null},
  fuxi:{file:'46.jpg',name:'伏羲',pay:null}, jp:{file:'48.jpg',name:'神秘寶箱',pay:null}
};
/* All reel symbols use edge-matte-cleaned transparent PNGs.  The original
   JPEG artwork stays untouched in assets as the source archive. */
for(const [id,file] of Object.entries({
  eye:'symbol-eye.png',dragon:'symbol-dragon.png',baize:'symbol-baize.png',
  bifang:'symbol-bifang.png',fire:'symbol-fire.png',black:'symbol-black.png',
  jade:'symbol-jade.png',gold:'symbol-gold.png',green:'symbol-green.png',
  fox:'symbol-fox.png',qingqiu:'symbol-qingqiu.png',orb:'symbol-orb.png',
  nuwa:'symbol-nuwa.png',fuxi:'symbol-fuxi.png',jp:'symbol-jp.png'
}))SYMBOLS[id].file=file;
/* Original high-volatility weights tuned by public symbol roles, not unpublished third-party math. */
/* Original high-volatility weights.  Feature entries are intentionally more
   visible than the earlier build, while the two 3-symbol awakening powers
   remain special moments rather than appearing every bonus round. */
/* Each mode has its own normalized relative-drop design; do not simply remove
   unavailable symbols from one common pool.  Low jade symbols carry the base
   hit rate, while feature symbols and character powers stay distinct. */
/* RTP calibration: preserve the approved paytable and all feature rules;
   these are relative drop weights, tuned for a high-volatility demo near a
   96% long-run return rather than a player-positive return. */
/* Base Game deliberately spreads its ordinary stones more evenly than the
   feature scenes.  This lowers the frequency of 8+ matches without changing
   the approved pay table or making the board feel empty. */
// 展示版數學設定：以長期約 96% 回報為目標，保留特殊模式的稀有爆發感。
const BASE={eye:1.05,dragon:5.4,baize:5.1,bifang:5.2,fire:7.8,black:7.8,jade:7.8,gold:7.8,green:7.8,fox:1.50,qingqiu:.20,orb:.25,jp:.05};
/* Mode-only symbols from the proposal:
   Base: 九尾狐 / 青丘天狐 may trigger features, but no 女媧 or 伏羲.
   Free: 九尾狐 only; no 青丘天狐、女媧、伏羲.
   Awakening: 青丘天狐、女媧、伏羲 only; no 九尾狐. */
const FREE={eye:1.4,dragon:5.5,baize:5.2,bifang:5.3,fire:10.5,black:10.5,jade:10.5,gold:10.5,green:10.5,fox:.99,orb:.3};
const AWAKEN={eye:2.2,dragon:7.2,baize:6.8,bifang:6.8,fire:11,black:11,jade:11,gold:11,green:11,qingqiu:1.08,orb:.34,nuwa:.62,fuxi:.62};
/* The original showcase has no access to a proprietary reel strip.  These
   are explicitly authored demonstration rates: Base is calmer; Awakening
   receives more visible cascades and a meaningful chance to reveal either
   three Nüwa or three Fuxi during its 15 automatic rounds. */
const BONUS_WIN_ASSIST_CHANCE=.21;
const BONUS_DEITY_EVENT_CHANCE=.022;
const BONUS_CLUSTER_SYMBOLS=['dragon','baize','bifang','fire','black','jade','gold','green'];
/* Ordinary multiplier balls are common low values; red/purple balls are genuinely rare. */
/* 95%-target calibration: all authored values remain available, but x2 is
   intentionally dominant.  This keeps the new art set without turning the
   wider value range into an RTP increase. */
const NORMAL_ORBS=[
  ...Array(100).fill(2),...Array(10).fill(3),...Array(5).fill(4),
  ...Array(3).fill(6),...Array(2).fill(8),10,12,15,18,25
];
const RARE_ORBS=[50,55,60,80,100,150,200,250,500];
const ORB_STEPS=[2,3,4,6,8,10,12,15,18,25,50,55,60,80,100,150,200,250,500];
const COLS=6, ROWS=5, MIN=8, START_FREE=15, RETRIGGER=5, BUY=100;
/* Keep ordinary multiplier-ball appearances sparse.  Awakening powers may
   still deliberately create their special split result. */
const ORB_CAP={base:1,free:2,bonus:2};
/* ATG's exact reel strips and RNG tables are not public.  These original
   display-demo probabilities are calibrated to the public high-volatility
   behaviour: balls are occasional in Base, more visible in Free/Awakening,
   but never expected on most spins. */
const ORB_SPAWN_CHANCE={base:.095,free:.24,bonus:.15};
const ORB_RARE_CHANCE=.001;
/* Three matching deity symbols form a paid special group before the skill
   animation.  Keep this explicit and easy to tune with the rest of the
   display-demo maths: each 3-symbol Nüwa/Fuxi group awards 10× the bet. */
const DEITY_TRIGGER_PAYOUT_MULTIPLIER=4.0;
/* Win grades are expressed as a multiple of the current bet.  They are
   deliberately high-volatility presentation thresholds, not payout odds. */
const WIN_TIERS=[
  {min:15,name:'BIG WIN',art:'win-big.jpg',duration:2400},
  {min:30,name:'SUPER WIN',art:'win-super.jpg',duration:2800},
  {min:60,name:'MEGA WIN',art:'win-mega.jpg',duration:3300},
  {min:150,name:'ULTRA WIN',art:'win-ultra.jpg',duration:3900},
  {min:500,name:'LEGENDARY WIN',art:'win-legendary.jpg',duration:4800}
];
/* Demo wallet only: every page load starts a new 10,000-credit play session.
   Wins and wagers still accumulate normally until the page is reloaded. */
const WALLET_KEY='shanHaiJingDemoWalletV3', INITIAL_BALANCE=10000;
function cents(value){return Math.round((Number(value)||0)*100)/100;}
function loadWallet(){
  return {balance:INITIAL_BALANCE,totalStake:0,totalWon:0};
}
const wallet=loadWallet();
function saveWallet(){
  wallet.balance=cents(balance);
  try{localStorage.setItem(WALLET_KEY,JSON.stringify(wallet));}catch(error){/* Play remains available without storage. */}
}
function debit(amount){const value=cents(amount);balance=cents(balance-value);wallet.totalStake=cents(wallet.totalStake+value);saveWallet();}
function credit(amount){const value=cents(amount);balance=cents(balance+value);wallet.totalWon=cents(wallet.totalWon+value);saveWallet();}
function walletNet(){return cents(wallet.totalWon-wallet.totalStake);}
let board=[],balance=cents(wallet.balance),bet=100,freeSpins=0,featureSpinLimit=0,globalMultiplier=0,roundWin=0,baseWin=0,spinning=false,skip=false,ante=false,autoPlay=false,autoRemaining=0,gameMode=document.body.dataset.mode||'base',featureWin=0,featureRoundCommitted=false,lockedOrbs=[],spinId=0,cellNodes=[],winCloseTimer=0,roundWinAnimation=0,roundWinAnimating=false,displayedRoundWin=0,featureIntroPending=false,featureReturnPending=false,returnAfterSpin=false, fuxiOrbCasts=0,nuwaOrbCasts=0;
let tumbleTestPending=new URLSearchParams(location.search).get('test')==='tumble';
const $=selector=>document.querySelector(selector);
/* BGM starts only after a real player gesture.  This satisfies browser
   autoplay rules while keeping the soundtrack looping through scene changes. */
function startBgm(){
  const bgm=$('#bgm');
  if(!bgm||!bgm.paused)return;
  bgm.volume=.42;
  bgm.play().catch(()=>{/* The next player gesture retries automatically. */});
}
/* The supplied reel sound loops only while the six reel belts are moving.
   It is separate from BGM, so stopping a spin never interrupts the music. */
function startReelSfx(){
  const sfx=$('#reelSfx');
  if(!sfx)return;
  sfx.pause();sfx.currentTime=0;sfx.volume=.5;
  sfx.play().catch(()=>{/* A later SPIN gesture retries if the browser blocks audio. */});
}
function stopReelSfx(){
  const sfx=$('#reelSfx');
  if(!sfx)return;
  const fade=()=>{sfx.volume=Math.max(0,sfx.volume-.1);if(sfx.volume>0){setTimeout(fade,28);return;}sfx.pause();sfx.currentTime=0;sfx.volume=.5;};
  fade();
}
/* A short, independent confirmation sound for a manual SPIN press.  It uses
   its own audio element, so it never pauses or replaces the looping BGM. */
function playSpinClickSfx(){
  const sfx=$('#spinClickSfx');
  if(!sfx)return;
  sfx.pause();
  sfx.currentTime=0;
  sfx.muted=false;
  sfx.volume=1;
  const playback=sfx.play();
  if(playback&&typeof playback.catch==='function'){
    playback.catch(()=>{
      /* Some servers identify .m4r only after the first media load.  Reload
         the element so the next real SPIN press can play it immediately. */
      sfx.load();
    });
  }
}
/* Start immediately when the browser permits autoplay.  Browsers that block
   unmuted autoplay fall back to the pointer listener below. */
startBgm();
document.addEventListener('pointerdown',startBgm,{passive:true});
/* Named feature panels avoid relying on fragile DOM child positions. */
$('#multi').closest('.feature')?.classList.add('multiplierFeature');
$('#free').closest('.feature')?.classList.add('roundsFeature');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,skip?0:ms));
const money=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const cleanArtCache=new Map();

/* The engraved panel above the reels is the only in-game round-win display.
   A settled win counts up inside that panel; a new SPIN immediately resets it
   to 0.00 and cancels the previous count cleanly. */
function paintRoundWin(value){
  displayedRoundWin=value;
  const output=$('#roundWin');
  output.textContent=money(value);
  const totalWinHud=$('#totalWinHud');
  if(totalWinHud){
    totalWinHud.textContent=money(totalWinForHud());
    applyDigitArtwork(totalWinHud);
  }
  /* The source value remains text until it changes; artwork is only the
     display layer, so the score can safely count up many times per second. */
  applyDigitArtwork(output);
}
/* The upper plaque is deliberately local to the current spin in every mode.
   The lower information bar alone displays the running feature total. */
function visibleWinTotal(){return roundWin;}
/* During a feature spin, roundWin is live and is added to the previously
   committed feature total.  Once that round has been committed, do not add
   the same roundWin a second time while its upper-plaque value remains on
   screen. */
function totalWinForHud(){
  if(gameMode==='base')return roundWin;
  return featureWin+(featureRoundCommitted?0:roundWin);
}
function resetRoundWinDisplay(){
  cancelAnimationFrame(roundWinAnimation);roundWinAnimation=0;roundWinAnimating=false;
  const ticker=$('.winTicker');ticker?.classList.remove('isCounting','isSettled');
  paintRoundWin(0);
}
function animateRoundWin(value,durationOverride=0){
  cancelAnimationFrame(roundWinAnimation);roundWinAnimation=0;roundWinAnimating=false;
  const ticker=$('.winTicker');ticker?.classList.remove('isCounting','isSettled');
  if(!(value>0)){paintRoundWin(0);return Promise.resolve();}
  /* Continue from the score already shown in the plaque.  This makes each
     cascade visibly add to the prior win instead of restarting from zero. */
  const from=Math.min(displayedRoundWin,value);
  if(value===from){ticker?.classList.add('isSettled');setTimeout(()=>ticker?.classList.remove('isSettled'),480);return Promise.resolve();}
  const duration=durationOverride||Math.min(1150,600+Math.log10(Math.max(1,value-from))*170);
  const started=performance.now();roundWinAnimating=true;ticker?.classList.add('isCounting');paintRoundWin(from);
  return new Promise(resolve=>{
    const tick=now=>{
      const progress=Math.min(1,(now-started)/duration);
      paintRoundWin(from+(value-from)*(1-Math.pow(1-progress,3)));
      if(progress<1){roundWinAnimation=requestAnimationFrame(tick);return;}
      roundWinAnimation=0;roundWinAnimating=false;
      ticker?.classList.remove('isCounting');ticker?.classList.add('isSettled');
      setTimeout(()=>ticker?.classList.remove('isSettled'),480);
      resolve();
    };
    roundWinAnimation=requestAnimationFrame(tick);
  });
}

/* Proposal symbol exports use a pure-black matte. Convert only that matte to alpha at runtime. */
function cleanSymbolMatte(image,file){
  /* All active symbol files are already white-matte-cleaned PNGs.  Assigning
     them directly avoids a canvas conversion at the exact instant a reel
     stops, which was the source of the brief final-reel hitch. */
  image.src=cleanArtCache.get(file)||`assets/${file}`;
}

/* The supplied standalone spin crest is exported on white.  Clean only that
   paper matte so the same authored crest can sit on the Free/Awakening scenes. */
function cleanSpinMatte(){
  const spin=$('#spin'),source=new Image();
  source.onload=()=>{
    try{
      const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4)if(data[i]>238&&data[i+1]>238&&data[i+2]>238)data[i+3]=0;
      context.putImageData(pixels,0,0);spin.style.setProperty('--spin-clean',`url(${canvas.toDataURL('image/png')})`);
    }catch(error){/* CSS retains the supplied source if a local preview blocks canvas. */}
  };
  source.src='assets/31.jpg';
}

/* The supplied press glow includes a white export matte.  Keep the gold
   cloud ring and button, but turn neutral white pixels transparent. */
function cleanSpinGlowMatte(){
  const stage=document.querySelector('main'),source=new Image();
  source.onload=()=>{
    try{
      const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){
        const r=data[i],g=data[i+1],b=data[i+2];
        if(r>238&&g>238&&b>238&&Math.max(r,g,b)-Math.min(r,g,b)<12)data[i+3]=0;
      }
      context.putImageData(pixels,0,0);stage.style.setProperty('--spin-press-glow',`url(${canvas.toDataURL('image/png')})`);
    }catch(error){/* CSS has the supplied image as a safe fallback. */}
  };
  source.src='assets/spin-press-glow.png';
}

/* The supplied equidistant board is used unchanged inside the game.  Only
   its flat white export paper is made transparent, preserving the green
   texture, gold frame, and the five painted separators at their true places. */
function cleanBoardMatte(){
  const reels=$('#reels'),source=new Image();
  source.onload=()=>{
    try{
      const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){
        const r=data[i],g=data[i+1],b=data[i+2];
        if(r>244&&g>244&&b>244&&Math.max(r,g,b)-Math.min(r,g,b)<10)data[i+3]=0;
      }
      context.putImageData(pixels,0,0);
      reels.style.setProperty('--board-equidistant',`url(${canvas.toDataURL('image/png')})`);
    }catch(error){/* The source asset remains a safe fallback. */}
  };
  source.src='assets/board-current.png';
}

function multiplierMarkup(symbol){
  const value=Number(symbol.orb)||2,rare=Boolean(symbol.rare),frame=symbol.frame||'a';
  /* One value, one directly supplied/generated PNG.  Never crop 03.png or
     derive a visual from a sprite sheet: that was the source of the wrong
     multiplier artwork in the live board. */
  const source=`assets/orb-${value}-frame-${frame}.png`;
  return `<img class="orbSprite value${value} frame${frame.toUpperCase()}${rare?' rare':''}" src="${source}" data-orb-value="${value}" data-orb-rare="${rare?'1':'0'}" alt="${value} 倍倍率球">`;
}

function preloadArt(){
  const files=[...new Set([...Object.values(SYMBOLS).map(symbol=>symbol.file),'03.png'])];
  const tasks=files.map(file=>{
    /* Decode before a spin begins.  The sixth reel must never pause just to
       decode a symbol that happens to first appear in its final landing row. */
    const image=new Image();image.decoding='async';image.src=`assets/${file}`;
    return (image.decode?image.decode().catch(()=>{}):new Promise(resolve=>{image.onload=image.onerror=resolve;}));
  });
  return Promise.all(tasks);
}

function weightPick(table){
  let roll=Math.random()*Object.values(table).reduce((a,b)=>a+b,0);
  for(const [id,weight] of Object.entries(table)){roll-=weight;if(roll<=0)return id;}
  return 'green';
}
function newSymbol(allowOrb=true){
  const table={...(gameMode==='bonus'?AWAKEN:gameMode==='free'?FREE:BASE)};
  if(!allowOrb)delete table.orb;
  if(ante&&gameMode==='base'){table.fox*=1.8;table.qingqiu*=1.8;}
  const id=weightPick(table),rare=id==='orb'&&Math.random()<ORB_RARE_CHANCE;
  const orb=id==='orb'?(rare?RARE_ORBS:NORMAL_ORBS)[Math.floor(Math.random()*(rare?RARE_ORBS:NORMAL_ORBS).length)]:0;
  return {id,orb,rare,frame:Math.random()<.5?'a':'b',rareStep:id==='orb'?[1,2,3][Math.floor(Math.random()*3)]:0,uid:crypto.randomUUID()};
}
function newOrbSymbol(caster=null){
  const rare=Math.random()<ORB_RARE_CHANCE;
  const values=rare?RARE_ORBS:NORMAL_ORBS;
  return {id:'orb',orb:values[Math.floor(Math.random()*values.length)],rare,frame:caster==='fuxi'?'a':caster==='nuwa'?'b':(Math.random()<.5?'a':'b'),rareStep:[1,2,3][Math.floor(Math.random()*3)],uid:crypto.randomUUID()};
}
function injectSpinOrb(target){
  if(target.some(symbol=>symbol?.id==='orb'))return false;
  if(Math.random()>= (ORB_SPAWN_CHANCE[gameMode]??.42))return false;
  const slot=Math.floor(Math.random()*target.length);
  target[slot]=newOrbSymbol();
  return true;
}
function randomSlots(count){
  const slots=Array.from({length:COLS*ROWS},(_,index)=>index);
  for(let index=slots.length-1;index>0;index--){
    const pick=Math.floor(Math.random()*(index+1));[slots[index],slots[pick]]=[slots[pick],slots[index]];
  }
  return slots.slice(0,count);
}
function makeSymbol(id){return {id,orb:0,rare:false,rareStep:0,uid:crypto.randomUUID()};}
/* An authored bonus-only distribution assist.  It does not alter the public
   pay table or awards; it only makes the special scene visibly more generous.
   The deity branch deliberately creates one ordinary 8-stone win plus a
   three-symbol deity set and a ball.  That gives the existing Fuxi/Nüwa
   mechanics an actual opportunity to run instead of requiring three very
   rare independent draws in the same 30-cell board. */
function applyBonusDistribution(result){
  if(gameMode!=='bonus')return result;
  const slots=randomSlots(COLS*ROWS);
  const normalId=BONUS_CLUSTER_SYMBOLS[Math.floor(Math.random()*BONUS_CLUSTER_SYMBOLS.length)];
  if(Math.random()<BONUS_DEITY_EVENT_CHANCE){
    const deity=Math.random()<.5?'nuwa':'fuxi';
    slots.slice(0,3).forEach(index=>{result[index]=makeSymbol(deity);});
    /* A deity event is its own clean wave.  The former version deliberately
       planted an 8-stone normal group here, which made ordinary symbols
       disappear immediately after the three deities and visually looked as
       though they were being removed by the deity skill.  Keep only the
       three deity symbols and their guaranteed multiplier ball. */
    result[slots[3]]=newOrbSymbol(deity);
    return result;
  }
  if(Math.random()<BONUS_WIN_ASSIST_CHANCE){
    /* Seven matching stones make a real 8+ hit likely after the remaining
       random draw, without forcing every assisted board to pay. */
    slots.slice(0,7).forEach(index=>{result[index]=makeSymbol(normalId);});
  }
  return result;
}
function makeBoard(){
  /* Keep balls out of the ordinary symbol weight draw.  A separate fresh
     spin draw decides their appearance, so one lucky first spin cannot make
     later spins look permanently empty or permanently full. */
  const result=Array.from({length:COLS*ROWS},()=>{
    return newSymbol(false);
  });
  applyBonusDistribution(result);
  injectSpinOrb(result);
  return result;
}
function makeTumbleTestBoard(){
  /* Test-only board: exactly eight matching stones, ensuring the next SPIN
     reaches the live Tumble code without changing normal game weights. */
  const ids=['eye','dragon','baize','bifang','fire','black','jade','gold','green'];
  return Array.from({length:COLS*ROWS},(_,index)=>({id:index<8?'green':ids[(index-8)%ids.length],orb:0,rare:false,rareStep:0,uid:crypto.randomUUID()}));
}
/* Portfolio opening board: before the first SPIN, show every authored
   multiplier value plus the approved premium/scatter/chest symbols.  The five
   low jade symbols and the mode-exclusive Nüwa/Fuxi symbols are intentionally
   omitted; remaining cells repeat premium symbols.  This board is
   presentation-only: spin() replaces it before any win detection, wager
   settlement or elimination can run. */
function makeOpeningShowcaseBoard(){
  const featuredIds=['eye','dragon','baize','bifang','fox','qingqiu','jp','eye','dragon','baize','bifang'];
  const featuredSymbols=featuredIds.map(makeSymbol);
  const multiplierSymbols=ORB_STEPS.map((orb,index)=>({
    id:'orb',orb,rare:orb>=50,frame:index%2?'b':'a',rareStep:0,uid:crypto.randomUUID()
  }));
  return [...featuredSymbols,...multiplierSymbols];
}
function ensureGrid(){
  if(cellNodes.length===COLS*ROWS)return;
  const reels=$('#reels');reels.innerHTML='';cellNodes=[];
  for(let index=0;index<COLS*ROWS;index++){const cell=document.createElement('div');cell.className='cell empty';cell.dataset.index=index;reels.append(cell);cellNodes.push(cell);}
}
function render(hit=[],falling=[],rolling=[]){
  /* Frozen multiplier balls are game-state, not a visual overlay.  Restore
     them before every render so a temporary cascade board can never erase
     their cell while the panel is advancing. */
  if(lockedOrbs.length)applyLocks(board);
  ensureGrid();
  board.forEach((symbol,index)=>{
    const cell=cellNodes[index],col=index%COLS;
    if(!symbol){cell.className='cell empty';cell.replaceChildren();cell.style.removeProperty('--drop-distance');cell.dataset.artKey='';return;}
    const fall=falling.find(item=>typeof item==='object'&&item.index===index);
    cell.className=`cell ${symbol.id}${symbol.rare?' rare':''}${hit.includes(index)?' win':''}${(fall||falling.includes(index))?' dropping':''}${rolling.includes(col)?' rolling':''}${lockedOrbs.some(lock=>lock.position===index)?' locked':''}`;
    if(fall)cell.style.setProperty('--drop-distance',`${Math.min(112,Math.max(28,fall.distance*25))}px`);else cell.style.removeProperty('--drop-distance');
    /* Frame is visual state too.  Without it a Nüwa/Fuxi ball could retain
       the old cached outer frame even after the symbol changed sources. */
    const artKey=`${symbol.uid}:${symbol.id}:${symbol.orb}:${symbol.rare}:${symbol.frame||'a'}`;
    if(cell.dataset.artKey===artKey)return;
    cell.dataset.artKey=artKey;
    /* The multiplier value is already drawn into the supplied ball sprite.
       Do not add a second HTML label beside it. */
    if(symbol.id==='orb'){cell.innerHTML=multiplierMarkup(symbol);}
    else{cell.innerHTML=`<img class="symbolArt ${symbol.id}" alt="${SYMBOLS[symbol.id].name}">`;cleanSymbolMatte(cell.querySelector('img'),SYMBOLS[symbol.id].file);}
  });
}
/* Update one completed reel only.  During overlapping stops this must never
   rebuild the other five columns, because one of them may still be hidden
   underneath its travelling reel belt. */
function renderColumn(col){
  /* Reels are rebuilt one column at a time during the first spin.  Restore
     sealed balls before that partial render too; otherwise a locked position
     can temporarily become null until the next full board render. */
  if(lockedOrbs.length)applyLocks(board);
  for(let row=0;row<ROWS;row++){
    const index=row*COLS+col,symbol=board[index],cell=cellNodes[index];
    if(!symbol){cell.className='cell empty';cell.replaceChildren();cell.dataset.artKey='';continue;}
    cell.className=`cell ${symbol.id}${symbol.rare?' rare':''}${lockedOrbs.some(lock=>lock.position===index)?' locked':''}`;
    const artKey=`${symbol.uid}:${symbol.id}:${symbol.orb}:${symbol.rare}:${symbol.frame||'a'}`;
    if(cell.dataset.artKey===artKey)continue;
    cell.dataset.artKey=artKey;
    if(symbol.id==='orb')cell.innerHTML=multiplierMarkup(symbol);
    else{cell.innerHTML=`<img class="symbolArt ${symbol.id}" alt="${SYMBOLS[symbol.id].name}">`;cleanSymbolMatte(cell.querySelector('img'),SYMBOLS[symbol.id].file);}
  }
}
/* All reel movement uses the exact inner content box of the painted frame.
   This keeps clearing and refill animations joined to the same lower border
   in base, Free Games and Awakening scenes. */
function reelInnerBounds(){
  const reels=$('#reels'),rect=reels.getBoundingClientRect();
  /* Every scene has one frame-owned clipping box.  It is deliberately
     independent of row one / row five: the grid may be inset within the
     frame, while travelling stones enter at the top inner rail and disappear
     at the bottom inner rail. */
  /* The artwork has a thicker top/bottom ornamental rail than its left/right
     rail.  9.5% is the measured inner edge of that painted rail in the three
     frame assets; 5% was the outer decorative edge and let clear stones show
     on top of the frame. */
  const insetByMode={base:{y:.095},free:{y:.095},bonus:{y:.095}};
  const inset=insetByMode[gameMode]||insetByMode.base;
  /* The vertical rails are not estimated: the rendered first and sixth
     columns already sit exactly inside them in all three scenes.  Using
     their outer edges prevents the base scene from clipping columns 1/6. */
  const first=cellNodes[0]?.getBoundingClientRect();
  const sixth=cellNodes[COLS-1]?.getBoundingClientRect();
  const last=cellNodes[(ROWS-1)*COLS]?.getBoundingClientRect();
  if(rect.width>0 && rect.height>0){
    const verticalInset=rect.height*inset.y;
    /* These are the two painted inner rails in awakening-board-frame-clean
       itself (1083 x 802 source pixels), measured from the user's red-line
       reference.  Do not derive Awakening's motion mask from a symbol cell:
       a special symbol can change its own artwork, but never the frame edge. */
    /* The supplied reference places the upper playable edge directly below
       the thin gold top rail.  Source y=76 was too low: reel stones first
       became visible inside the board rather than at that rail.  Only this
       upper source edge changes; the approved lower edge remains y=726. */
    const awakeningFrame={width:1083,height:802,top:48,bottom:726};
    const awakeningScaleY=rect.height/awakeningFrame.height;
    const top=gameMode==='bonus'
      ? rect.top+awakeningFrame.top*awakeningScaleY
      : rect.top+verticalInset;
    /* The Free Games artwork has a much thinner lower inner rail than the
       other two frames.  Its fifth-row cell bottom is the painted rail's
       upper edge, so using a percentage inset lets clearing stones travel
       visibly across the lower gold frame.  Anchor only that lower limit to
       the measured last-row edge; all moving objects share this same mask. */
    /* Free Games retains its separately measured lower edge.  Awakening uses
       the matching lower source-pixel rail from the board art, never row 5. */
    const bottom=gameMode==='bonus'
      ? rect.top+awakeningFrame.bottom*awakeningScaleY
      : (gameMode==='free' && last?.bottom)
        ? last.bottom
        : rect.bottom-verticalInset;
    return {
      reels,rect,
      left:first?.left??rect.left+(rect.width*.055),
      right:sixth?.right??rect.right-(rect.width*.055),
      top,
      bottom,
      height:bottom-top
    };
  }
  /* Safe pre-grid fallback used only during initial page construction. */
  const right=cellNodes[COLS-1]?.getBoundingClientRect();
  if(first&&last&&last.bottom>first.top){
    return {reels,rect,left:first.left,right:right?.right??rect.right,top:first.top,bottom:last.bottom,height:last.bottom-first.top};
  }
  const style=getComputedStyle(reels);
  const top=rect.top+Number.parseFloat(style.paddingTop||0);
  const bottom=rect.bottom-Number.parseFloat(style.paddingBottom||0);
  return {reels,rect,left:rect.left,right:rect.right,top,bottom,height:bottom-top};
}
/* The one and only clipping window for every moving board object.  It is
   measured from the real 6 x 5 cell window, so frame art is never used as a
   guessed animation boundary and cannot be accidentally covered or clipped. */
function ensureReelViewport(){
  const inner=reelInnerBounds(),reels=inner.reels;
  let viewport=reels.querySelector('.reelViewport');
  if(!viewport){viewport=document.createElement('div');viewport.className='reelViewport';reels.append(viewport);}
  viewport.style.left=`${inner.left-inner.rect.left}px`;
  viewport.style.top=`${inner.top-inner.rect.top}px`;
  viewport.style.width=`${inner.right-inner.left}px`;
  viewport.style.height=`${inner.height}px`;
  /* This is an inline hard mask, not a visual guideline.  A few historical
     stylesheet experiments set travelling strips to overflow:visible; the
     viewport itself must nevertheless always crop every child at the exact
     painted inner rails, especially at the Awakening top rail. */
  viewport.style.overflow='clip';
  viewport.style.overflowClipMargin='0px';
  viewport.style.clipPath='inset(0px)';
  viewport.style.contain='paint';
  return {viewport,rect:viewport.getBoundingClientRect(),inner};
}
/* A falling stone is a temporary copy of the actual symbol artwork.  It lets
   retained symbols travel from their previous cell to their new cell rather
   than replacing the destination with a new image before the motion begins. */
function cascadeStone(html,from,to,reelRect){
  /* Cascade artwork must be clipped to the true 6 x 5 playable window, not
     merely to the larger painted board image.  This prevents a stone from
     ever travelling over the lower ornamental rail or HUD. */
  const {viewport,rect:viewportRect}=ensureReelViewport();
  const stone=document.createElement('div');
  stone.className='cascadeStone';stone.innerHTML=html;
  stone.style.left=`${from.left-viewportRect.left}px`;stone.style.top=`${from.top-viewportRect.top}px`;
  stone.style.width=`${to.width}px`;stone.style.height=`${to.height}px`;
  /* Store the physical landing box.  At the end of the fall the very same
     element is moved into this box with transform:none; it is not swapped for
     a separately rendered cell image. */
  stone.dataset.finalLeft=`${to.left-viewportRect.left}px`;
  stone.dataset.finalTop=`${to.top-viewportRect.top}px`;
  stone.style.setProperty('--cascade-y',`${to.top-from.top}px`);
  viewport.append(stone);
  return stone;
}
function stripSymbolMarkup(symbol){
  /* Multiplier balls are intentionally held back from the travelling reel.
     Their target looks empty until the reel sequence finishes, then the ball
     is revealed in its own moment. */
  if(!symbol)return '<span class="reelEmpty" aria-hidden="true"></span>';
  if(symbol.id==='orb')return multiplierMarkup(symbol);
  return `<img class="symbolArt ${symbol.id}" src="assets/${SYMBOLS[symbol.id].file}" alt="${SYMBOLS[symbol.id].name}" decoding="sync" draggable="false">`;
}
/* Each travelling belt uses the exact live geometry of its five destination
   cells.  Do not divide a strip into five mathematically equal rows: the
   painted board can resolve fractional pixels differently, which causes a
   visible 1px nudge when the belt hands back to the fixed grid. */
function reelSlotMarkup(symbol,top,height,preview=false){
  return `<span class="reelSymbolSlot"${preview?' data-preview="1"':''} style="top:${top}px;height:${height}px">${stripSymbolMarkup(symbol)}</span>`;
}

/* This is presentation only.  The existing orb result, probability and payout
   are already fixed before this runs; the two deities merely take turns
   casting its visual arrival, with a small random bias to feel natural. */
function chooseOrbCaster(){
  let caster;
  if(fuxiOrbCasts===nuwaOrbCasts)caster=Math.random()<.5?'fuxi':'nuwa';
  else{
    const lessUsed=fuxiOrbCasts<nuwaOrbCasts?'fuxi':'nuwa';
    const moreUsed=lessUsed==='fuxi'?'nuwa':'fuxi';
    caster=Math.random()<.82?lessUsed:moreUsed;
  }
  if(caster==='fuxi')fuxiOrbCasts++;else nuwaOrbCasts++;
  return caster;
}
/* 神明倍率球演繹：神明手中法器與盤面目標格的法器同時旋轉。
   duration + transformDuration 必須等於落石帶的移動時間，讓兩者同時結束。 */
function commitMultiplierBall({symbol,index}){
  /* This is the exact visual handoff frame: put the real ball into both the
     resident reel belt and its fixed cell before the rotating artefact is
     removed.  It avoids a blank frame between artefact and multiplier. */
  board[index]=symbol;
  const col=index%COLS,row=Math.floor(index/COLS);
  const strip=$('#reels').querySelector(`.reelStrip[data-reel-col="${col}"]`);
  const slot=strip?.querySelectorAll('.reelSymbolSlot:not([data-preview="1"])')[row];
  if(slot)slot.innerHTML=multiplierMarkup(symbol);
  renderColumn(col);
  cellNodes[index]?.classList.add('orbReveal');
}
function clearMultiplierReveal(placements){
  placements.forEach(({index})=>cellNodes[index]?.classList.remove('orbReveal'));
}
async function castOrbToBoard(symbol,index,{duration=620,transformDuration=100,onComplete}={}){
  const caster=chooseOrbCaster();
  const deity=document.querySelector(caster==='fuxi'?'.deityFuxi':'.deityNuwa');
  const target=cellNodes[index];
  if(!deity||!target)return;
  const sourceRect=deity.getBoundingClientRect(),targetRect=target.getBoundingClientRect();
  if(!sourceRect.width||!targetRect.width)return;
  /* Hand locations follow the supplied deity art: Fuxi's yin-yang disk and
     Nuwa's five-colour stone. */
  const origin={
    x:sourceRect.left+sourceRect.width*(caster==='fuxi'?.26:.76),
    y:sourceRect.top+sourceRect.height*(caster==='fuxi'?.31:.28)
  };
  /* This is intentionally not a flying ball.  The held artefact and a
     second copy in the preselected blank board slot rotate together; the
     board copy becomes the already-authored multiplier on the landing frame. */
  const focusAsset=caster==='fuxi'?'fuxi-bagua-focus.png':'nuwa-fivecolor-focus.png';
  const boardFocusSize=Math.min(targetRect.width*1.08,sourceRect.height*.18);
  /* The hand-layer is intentionally larger than the board copy: it must
     completely cover the same artefact already painted in the deity art, so
     the player sees one clean rotating five-colour stone / yin-yang disk. */
  const handFocusSize=Math.max(boardFocusSize*1.34,Math.min(sourceRect.width*.44,sourceRect.height*.29));
  const makeFocus=(className,x,y,size)=>{
    const focus=document.createElement('div');
    focus.className=`deityFocus ${className} ${caster}`;
    focus.style.left=`${x-size/2}px`;focus.style.top=`${y-size/2}px`;
    focus.style.width=`${size}px`;focus.style.height=`${size}px`;
    focus.style.backgroundImage=`url('assets/${focusAsset}')`;
    return focus;
  };
  deity.classList.add('deityCasting');
  const handFocus=makeFocus('handFocus',origin.x,origin.y,handFocusSize);
  const boardFocus=makeFocus('boardFocus',targetRect.left+targetRect.width/2,targetRect.top+targetRect.height/2,boardFocusSize);
  document.body.append(handFocus,boardFocus);void boardFocus.offsetWidth;
  handFocus.classList.add('spinning');boardFocus.classList.add('spinning');
  await pause(duration);
  handFocus.classList.add('transforming');boardFocus.classList.add('transforming');
  await pause(transformDuration);
  /* Commit on the same frame the board artefact finishes fading, not in a
     later batch after the other reels have finished. */
  onComplete?.({symbol,index});
  handFocus.remove();boardFocus.remove();deity.classList.remove('deityCasting');
}

async function revealMultiplierBalls(placements){
  if(!placements.length)return;
  placements.forEach(commitMultiplierBall);
  await pause(520);
  clearMultiplierReveal(placements);
}
/* First phase of a paid spin: the existing five symbols leave as one vertical
   reel belt.  The cell artwork is hidden only while its copied belt travels
   out of the bottom, so no symbol is replaced or flashed in place. */
async function clearReelStrip(col,onIncoming){
  const reels=$('#reels');
  /* A stopped reel uses a two-belt landing track.  Reusing that track for a
     clear made CSS restore its default -50% transform before the outgoing
     motion began, which is why Free Game stones could jump or use the wrong
     lower edge.  Replace it with one purpose-built clear belt in the same
     frame; the new belt is positioned from the shared reelViewport. */
  const settled=reels.querySelector(`.reelStrip[data-reel-col="${col}"]`);
  const strip=document.createElement('div');
  const frozenPositions=new Set(lockedOrbs.map(lock=>lock.position));
  /* A Nüwa-sealed ball is a stationary board object.  Its clear-belt slot
     stays blank so the moving reel never carries it below the inner frame. */
  const outgoing=Array.from({length:ROWS},(_,row)=>{
    const index=row*COLS+col;
    return frozenPositions.has(index)?null:board[index];
  });
  const {viewport,reelRect,inner}=(()=>{const view=ensureReelViewport();return {viewport:view.viewport,reelRect:view.rect,inner:view.inner};})(),first=cellNodes[col].getBoundingClientRect();
  const rowRects=Array.from({length:ROWS},(_,row)=>cellNodes[row*COLS+col].getBoundingClientRect());
  /* The target is the board's own lower gold rail, not the bottom of the
     surrounding game interface.  Only the narrow painted rail below row 5
     is included in the clear-animation window. */
  const beltHeight=inner.height;
  /* The bottom of row 5 is the board's inner lower-frame boundary.  Clip the
     belt exactly there: it may leave the final row, but never becomes visible
     on top of the gold lower frame, the HUD, or the scene behind the board. */
  const lowerRail=0;
  const slotTops=rowRects.map(rowRect=>rowRect.top-reelRect.top);
  strip.className='reelClearStrip';strip.style.left=`${first.left-reelRect.left}px`;strip.style.top='0px';strip.style.width=`${first.width}px`;strip.style.height=`${beltHeight}px`;
  strip.style.setProperty('--clear-track-top','0px');
  strip.style.setProperty('--clear-belt-height',`${beltHeight}px`);
  strip.style.setProperty('--clear-travel',`${beltHeight+lowerRail}px`);
  strip.innerHTML=`<div class="reelClearTrack">${outgoing.map((symbol,row)=>reelSlotMarkup(symbol,slotTops[row],rowRects[row].height)).join('')}</div>`;
  /* Both belts occupy identical cell coordinates for this paint.  Removing
     the settled one after the clear belt is attached prevents a visible gap
     while ensuring no inherited reel-track transform can affect clearing. */
  viewport.append(strip);
  settled?.remove();
  for(let row=0;row<ROWS;row++)cellNodes[row*COLS+col]?.classList.add('reelClearing');
  void strip.offsetHeight;
  await new Promise(requestAnimationFrame);
  strip.classList.add('falling');
  /* Match the incoming reel's full 0.68-second travel, so clearing and
     refilling feel like the two directions of the same physical reel. */
  /* Do not show two symbol belts in one reel.  The incoming belt begins on
     the same frame the old belt reaches the board's lower rail: no blank gap,
     but also no premature overlap or flashing symbols. */
  await pause(680);
  strip.remove();
  for(let row=0;row<ROWS;row++){
    const cell=cellNodes[row*COLS+col];
    if(!cell)continue;
    delete cell.dataset.residentReel;
    cell.classList.remove('reelClearing');
    cell.classList.add('reelCleared');
  }
  if(onIncoming)onIncoming();
}
async function playReelStrip(col,final,stopped,onMotionStart){
  const reels=$('#reels'),strip=document.createElement('div');
  const landing=Array.from({length:ROWS},(_,row)=>final[row*COLS+col]);
  const preview=Array.from({length:ROWS},()=>newSymbol(false));
  /* Use the live cell geometry, not equal screen percentages.  The supplied
     frame has padding and divider gaps, so percentage strips can drift over
     symbols instead of occupying one exact reel. */
  const {viewport,reelRect,inner}=(()=>{const view=ensureReelViewport();return {viewport:view.viewport,reelRect:view.rect,inner:view.inner};})(),first=cellNodes[col].getBoundingClientRect();
  const rowRects=Array.from({length:ROWS},(_,row)=>cellNodes[row*COLS+col].getBoundingClientRect());
  const beltHeight=inner.height;
  /* The clipping window begins at the upper inner rail, above row one.  The
     old strip started exactly at the row-one box, so preview stones visibly
     appeared at that lower line instead of entering through the true top
     boundary. Preserve the same pixels-per-second over this added clearance. */
  const slotTops=rowRects.map(rowRect=>rowRect.top-reelRect.top);
  const entryClearance=slotTops[0];
  const travelDistance=beltHeight+entryClearance;
  const travelDuration=Math.round(720*(travelDistance/beltHeight));
  strip.className='reelStrip';strip.dataset.reelCol=col;strip.style.left=`${first.left-reelRect.left}px`;strip.style.top='0px';strip.style.width=`${first.width}px`;strip.style.height=`${beltHeight}px`;
  /* This belt contains only its final five symbols.  It enters from above
     and, once stopped, remains as those exact same DOM nodes.  There is no
     second "fixed" belt to reveal or remove at the stopping frame. */
  strip.style.setProperty('--reel-start-y',`-${travelDistance}px`);
  strip.style.setProperty('--reel-duration',`${travelDuration}ms`);
  strip.innerHTML=`<div class="reelStripTrack">${landing.map((symbol,row)=>reelSlotMarkup(symbol,slotTops[row],rowRects[row].height)).join('')}${preview.map((symbol,row)=>reelSlotMarkup(symbol,beltHeight+slotTops[row],rowRects[row].height,true)).join('')}</div>`;
  /* Prepare the fixed landing artwork before the belt starts.  It remains
     completely hidden under the travelling strip, but its decoded image,
     exact size and calibrated scale are already present for the full travel
     duration.  The stop therefore reveals existing pixels instead of
     constructing a second image on the final frame (the source of the
     occasional one-symbol nudge). */
  for(let row=0;row<ROWS;row++)board[row*COLS+col]=landing[row];
  renderColumn(col);
  for(let row=0;row<ROWS;row++){
    const cell=cellNodes[row*COLS+col];
    if(!cell)continue;
    cell.classList.remove('reelCleared');
    cell.classList.add('reelLanding');
    /* This survives ordinary render() class updates.  The visible artwork is
       the resident reel belt, never a second cell image underneath it. */
    cell.dataset.residentReel='1';
  }
  /* Commit the belt's off-screen start position before adding its falling
     state.  Without this frame boundary the first reel can jump straight to
     its final symbols instead of visibly travelling down the board. */
  viewport.append(strip);void strip.offsetHeight;
  await new Promise(requestAnimationFrame);
  /* The board slot is already blank.  Start the paired deity ritual on this
     exact animation frame so its transformation ends with this reel landing. */
  onMotionStart?.();
  strip.classList.add('falling');
  await pause(travelDuration);
  /* Do not remove, re-render or reveal another copy here.  The same moving
     belt is now simply at translateY(0) and is the settled symbol display. */
  stopped.add(col);
  /* No per-reel hold here: the next visual state may begin immediately after
     the belt reaches its final position. */
}
function ui(){
  document.body.dataset.mode=gameMode;
  $('#balance').textContent=money(balance);$('#bet').textContent=money(bet);
  const balanceHud=$('#balanceHud'),betHud=$('#betHud');
  if(balanceHud)balanceHud.textContent=money(balance);
  if(betHud)betHud.textContent=money(bet);
  const totalWinHud=$('#totalWinHud');
  if(totalWinHud)totalWinHud.textContent=money(totalWinForHud());
  $('#modeLabel').textContent=gameMode==='free'?'FREE GAMES':gameMode==='bonus'?'神啟之境':'';
  const roundLabel=$('#free').closest('.feature').querySelector('small');
  if(gameMode==='base'){roundLabel.textContent='虛擬餘額';$('#free').textContent=money(balance);}else{roundLabel.textContent='剩餘回合';$('#free').textContent=freeSpins;}
  /* The medallion reads value first (6X), centred in the supplied circular
     artwork.  It must never use the legacy x6 order. */
  $('#multi').textContent=`${Math.max(1,globalMultiplier)}X`;if(!roundWinAnimating)paintRoundWin(visibleWinTotal());
  const net=walletNet(),netText=`${net>=0?'+':''}${money(net)}`;
  if(gameMode!=='base')$('#roundWin').title=`累積彩金 ${money(featureWin)}・本回合 ${money(roundWin)}`;
  $('#roundWin').title=`累積下注 ${money(wallet.totalStake)}｜累積得分 ${money(wallet.totalWon)}｜淨輸贏 ${netText}`;
  if(!roundWin)$('#chainInfo').textContent=`累積下注 ${money(wallet.totalStake)}・淨輸贏 ${netText}`;
  $('#eventBanner').textContent=gameMode==='bonus'?`神啟覺醒：剩餘 ${freeSpins} 回合・累積倍率 x${Math.max(1,globalMultiplier)}`:gameMode==='free'?`免費遊戲：剩餘 ${freeSpins} 回合・累積倍率 x${Math.max(1,globalMultiplier)}`:ante?'特別投注：下注 x1.25，Scatter 機率提高':'主遊戲：任意位置 8 個相同符號即可得獎';
}
const updateUi=ui;
ui=function(){
  updateUi();
  const locked=spinning||gameMode!=='base';
  $('#spin').disabled=locked;
  const hudDown=$('#hudBetDown'),hudUp=$('#hudBetUp');
  if(hudDown)hudDown.disabled=locked;
  if(hudUp)hudUp.disabled=locked;
  /* ui() is the common write path for balance, bet, counters and multiplier.
     Apply the supplied 0–9 art after those values have settled. */
  applyDigitArtwork(document.body);
};
function status(text){$('#message').textContent=text;}
/* During Free Games / Awakening, the engraved win plaque keeps displaying the
   current round while the small status line tracks the persistent prize pot. */
function featurePrizeStatus(){
  if(gameMode==='base')return;
  $('#chainInfo').textContent=`累積彩金：${money(featureWin)} ・ 本回合：${money(roundWin)}`;
}
function groups(){
  /* During the short post-clear score/skill presentation, winning cells are
     intentionally null.  Ignore those empty slots; a bonus skill must never
     attempt to read `id` from a removed symbol and freeze the auto-spin. */
  const map={};board.forEach((s,i)=>{if(s)(map[s.id]??=[]).push(i);});return map;
}
function wins(){return Object.entries(groups()).filter(([id,indexes])=>Array.isArray(SYMBOLS[id].pay)&&indexes.length>=MIN);}
/* Public pay-table formula:
   group win = (current bet ÷ 20) × symbol pay-table value.
   All groups from a cascade are added first; settle() then applies the
   final board multiplier (or the accumulated feature multiplier, x1 minimum). */
function payFor(id,count){const tier=count>=12?2:count>=10?1:0;return (bet/20)*SYMBOLS[id].pay[tier];}
function deityPay(triggers){return triggers.length*bet*DEITY_TRIGGER_PAYOUT_MULTIPLIER;}
function count(id){return(groups()[id]||[]).length;}
function orbs(){return board.filter(s=>s.id==='orb').reduce((sum,s)=>sum+s.orb,0);}
function multiplierSymbols(){return board.map((symbol,index)=>symbol?.id==='orb'?{symbol,index}:null).filter(Boolean);}
async function collectMultipliers(symbols,{keepIndexes=new Set()}={}){
  if(!symbols.length)return;
  const target=$('#multi').getBoundingClientRect(),effects=[];
  for(const {symbol,index} of symbols){
    const source=cellNodes[index]?.getBoundingClientRect();if(!source)continue;
    /* A locked ball remains on the board while its copy adds to total. */
    if(!keepIndexes.has(index))cellNodes[index]?.classList.add('collecting');
    const token=document.createElement('div');token.className='multiplierCollect';
    token.innerHTML=multiplierMarkup(symbol);
    token.style.left=`${source.left}px`;token.style.top=`${source.top}px`;token.style.width=`${source.width}px`;token.style.height=`${source.height}px`;
    token.style.setProperty('--collect-x',`${target.left+target.width/2-source.left-source.width/2}px`);
    token.style.setProperty('--collect-y',`${target.top+target.height/2-source.top-source.height/2}px`);
    document.body.append(token);effects.push(token);
  }
  if(!effects.length)return;
  requestAnimationFrame(()=>effects.forEach(token=>token.classList.add('flying')));
  await pause(620);effects.forEach(token=>token.remove());
}
function applyLocks(target){lockedOrbs.forEach(lock=>target[lock.position]={...lock.symbol});}
function clearUnfrozen(target,indexes){
  /* A Nüwa seal is authoritative: no clear path, including a later rule
     change or a defensive cascade call, may delete a frozen ball. */
  const frozen=new Set(lockedOrbs.map(lock=>lock.position));
  indexes.forEach(index=>{if(!frozen.has(index))target[index]=null;});
  applyLocks(target);
}
function tickLocks(){lockedOrbs=lockedOrbs.filter(lock=>{if(lock.created===spinId)return true;lock.rounds--;return lock.rounds>0;});}
function nextAuthoredOrbValue(symbol){
  const current=ORB_STEPS.indexOf(Number(symbol.orb));
  const fallback=ORB_STEPS.findIndex(value=>value>=Number(symbol.orb));
  const index=current>=0?current:Math.max(0,fallback);
  return ORB_STEPS[Math.min(ORB_STEPS.length-1,index+Math.max(1,Number(symbol.rareStep)||1))];
}
function growRare(){
  /* Never invent x51/x152 etc: every upgraded ball must map to an authored
     image and to the agreed multiplier ladder. */
  board.forEach(symbol=>{if(symbol?.id==='orb'&&symbol.rare){symbol.orb=nextAuthoredOrbValue(symbol);symbol.rare=symbol.orb>=50;}});
  /* A locked rare ball must keep its authored value when restored next round. */
  lockedOrbs.forEach(lock=>{if(lock.symbol?.id==='orb'&&lock.symbol.rare){lock.symbol.orb=nextAuthoredOrbValue(lock.symbol);lock.symbol.rare=lock.symbol.orb>=50;}});
}
/* Awakening split: the parent ball stays untouched.  Each child inherits it,
   but may jump to a higher authored ball value.  This recreates the visible
   "sudden upgrade" moment without pretending to know an unpublished table. */
function splitChildOrb(source,caster='fuxi'){
  const sourceStep=Math.max(0,ORB_STEPS.indexOf(source.orb));
  const rareSource=source.rare||source.orb>=50;
  const upgradeChance=rareSource?.60:.32;
  let step=sourceStep;
  if(step<ORB_STEPS.length-1&&Math.random()<upgradeChance){
    const maxJump=rareSource?2:1;
    step=Math.min(ORB_STEPS.length-1,step+1+Math.floor(Math.random()*maxJump));
  }
  const orb=ORB_STEPS[step],rare=rareSource||orb>=50;
  return {...source,orb,rare,frame:caster==='nuwa'?'b':'a',rareStep:rare?(source.rareStep||1):0,uid:crypto.randomUUID()};
}
function drop(hit){
  clearUnfrozen(board,hit); const changed=[];
  for(let col=0;col<COLS;col++){
    const kept=[];for(let row=ROWS-1;row>=0;row--){const i=row*COLS+col;if(board[i])kept.push(board[i]);}
    for(let row=ROWS-1,k=0;row>=0;row--,k++){const i=row*COLS+col;board[i]=kept[k]||newSymbol();changed.push(i);}
  }
  applyLocks(board); return changed;
}
/* A Nüwa-frozen multiplier is a physical stop in its reel, not merely an
   artwork restored after gravity.  Build the next board in independent
   segments above and below each frozen position, so every other stone still
   falls naturally while the frozen ball never changes its cell. */
function buildGravityBoard(source,orbCount){
  const nextBoard=source.slice(),changesByColumn=Array.from({length:COLS},()=>[]);
  const frozenByIndex=new Map(lockedOrbs.map(lock=>[lock.position,{...lock.symbol}]));
  for(let col=0;col<COLS;col++){
    const frozenRows=new Set([...frozenByIndex.keys()]
      .filter(index=>index%COLS===col).map(index=>Math.floor(index/COLS)));
    let segmentBottom=ROWS-1;
    for(let marker=ROWS-1;marker>=-1;marker--){
      if(marker!==-1&&!frozenRows.has(marker))continue;
      const segmentTop=marker+1;
      if(segmentTop<=segmentBottom){
        const kept=[];
        for(let row=segmentBottom;row>=segmentTop;row--){
          const index=row*COLS+col;
          if(source[index])kept.push({symbol:source[index],sourceRow:row});
        }
        for(let row=segmentBottom,k=0;row>=segmentTop;row--,k++){
          const index=row*COLS+col,item=kept[k];
          const landed=item?item.symbol:newSymbol(orbCount.value<(ORB_CAP[gameMode]??1));
          if(!item&&landed.id==='orb')orbCount.value++;
          nextBoard[index]=landed;
          if(!item||item.sourceRow!==row)changesByColumn[col].push({
            index,distance:item?item.sourceRow-row:row-segmentTop+1,
            sourceIndex:item?item.sourceRow*COLS+col:null
          });
        }
      }
      if(marker>=0){
        const frozenIndex=marker*COLS+col;
        nextBoard[frozenIndex]=frozenByIndex.get(frozenIndex);
        segmentBottom=marker-1;
      }
    }
  }
  return {nextBoard,changesByColumn};
}
async function dropCascade(hit){
  /* Prior settled stones are the visible final result of the previous tumble.
     Clear them only at the beginning of a new tumble, never at the preceding
     landing frame.  Keep the underlying cells hidden during this setup. */
  const priorStones=[...document.querySelectorAll('.cascadeStone.settledCascade')];
  priorStones.forEach(stone=>{
    const cell=cellNodes[Number(stone.dataset.targetIndex)];
    if(cell){cell.classList.add('cascadeLanding');delete cell.dataset.residentCascade;}
    stone.remove();
  });
  clearUnfrozen(board,hit);
  render();
  await pause(120);
  /* Build the complete gravity result first, then animate every affected
     column together.  This is intentionally different from the first spin's
     left-to-right reel stop sequence. */
  const gravity=buildGravityBoard(board,{value:board.filter(symbol=>symbol?.id==='orb').length});
  const {nextBoard,changesByColumn}=gravity;
  const changed=changesByColumn.flat();
  /* Newly-created multiplier balls do not fall in as finished balls.  Their
     destination remains blank while the stone fall and deity artefact ritual
     run together; the board artefact transforms at the same landing frame. */
  const lockedIndexes=new Set(lockedOrbs.map(lock=>lock.position));
  const cascadeMultiplierPlacements=changed
    .filter(item=>!lockedIndexes.has(item.index)&&item.sourceIndex===null&&nextBoard[item.index]?.id==='orb')
    .map(item=>({index:item.index,symbol:nextBoard[item.index]}));
  const visibleBoard=nextBoard.slice();
  cascadeMultiplierPlacements.forEach(({index})=>visibleBoard[index]=null);
  /* Preserve visual copies before any destination cell is updated. */
  const retainedArt=new Map(changed.filter(item=>item.sourceIndex!==null).map(item=>[
    item.index,cellNodes[item.sourceIndex]?.innerHTML||''
  ]));
  board=visibleBoard;
  /* A locked orb must be visible even while newly created, non-frozen orb
     destinations are intentionally blanked for their own reveal ritual. */
  applyLocks(board);
  if(changed.length){
    render();
    const reelRect=$('#reels').getBoundingClientRect(),stones=[];
    changed.forEach(item=>{
      const destination=cellNodes[item.index];if(!destination)return;
      const destinationRect=destination.getBoundingClientRect();
      destination.classList.add('cascadeLanding');
      const html=item.sourceIndex===null?destination.innerHTML:retainedArt.get(item.index);
      const from=item.sourceIndex===null
        ?{left:destinationRect.left,top:destinationRect.top-item.distance*destinationRect.height,width:destinationRect.width,height:destinationRect.height}
        :cellNodes[item.sourceIndex].getBoundingClientRect();
      const stone=cascadeStone(html,from,destinationRect,reelRect);
      stone.dataset.targetIndex=item.index;
      stones.push(stone);
    });
    let cascadeRitual=Promise.resolve();
    requestAnimationFrame(()=>{
      stones.forEach(stone=>stone.classList.add('falling'));
      cascadeRitual=Promise.all(cascadeMultiplierPlacements.map(({symbol,index})=>
        castOrbToBoard(symbol,index,{duration:620,transformDuration:100,onComplete:commitMultiplierBall})
      ));
    });
    await pause(720);
    await cascadeRitual;
    /* The travelling stones themselves become the settled display.  Commit
       their physical top/left first, then clear transform in the same style
       update.  No static-cell reveal, no duplicate image and no post-stop
       position handoff can occur here. */
    stones.forEach(stone=>{
      stone.classList.remove('falling');
      stone.style.transition='none';
      stone.style.left=stone.dataset.finalLeft;
      stone.style.top=stone.dataset.finalTop;
      stone.style.setProperty('--cascade-y','0px');
      stone.classList.add('settledCascade');
    });
    /* A normal settled stone owns its cell through a travelling overlay.  A
       multiplier target is different: its travelling stone was deliberately
       blank so that the rotating artefact could appear there.  Do not mark
       that cell as residentCascade (which hides its children), and discard
       the now-empty overlay so the committed multiplier remains visible. */
    const multiplierIndexes=new Set(cascadeMultiplierPlacements.map(({index})=>index));
    stones.forEach(stone=>{
      if(multiplierIndexes.has(Number(stone.dataset.targetIndex)))stone.remove();
    });
    changed.forEach(item=>{
      const cell=cellNodes[item.index];
      if(cell&&!multiplierIndexes.has(item.index))cell.dataset.residentCascade='1';
      else if(cell)delete cell.dataset.residentCascade;
    });
    /* Commit multiplier artwork only after its matching rotating artefact
       reaches the end of the same fall. */
    if(cascadeMultiplierPlacements.length){
      await pause(520);
      clearMultiplierReveal(cascadeMultiplierPlacements);
    }
  }
  applyLocks(board);render();
}
/* A settled cascade stone is kept as the static display after one tumble.
   Before a new winning-wave highlight, hand display ownership back to the
   real cell; otherwise that old overlay covers `.cell.win` and makes a
   correctly selected stone appear not to play its elimination effect. */
function releaseSettledCascadeDisplay(){
  document.querySelectorAll('.cascadeStone.settledCascade').forEach(stone=>{
    const cell=cellNodes[Number(stone.dataset.targetIndex)];
    if(cell){
      delete cell.dataset.residentCascade;
      cell.classList.remove('cascadeLanding');
    }
    stone.remove();
  });
}
async function showAwakeningPower(kind,targets,duration=3500){
  const stage=document.querySelector('.reelStage'),effect=document.createElement('div');
  const label=kind==='fuxi'?'伏羲・分裂神啟':'女媧・鎖定神啟',art=kind==='fuxi'?'46.jpg':'45.jpg';
  effect.className=`awakeningPower ${kind}`;
  effect.innerHTML=`<img src="assets/${art}" alt="${label}"><strong>${label}</strong><span>${kind==='fuxi'?'倍率球分裂中':'倍率球鎖定中'}</span>`;
  const targetClass=kind==='fuxi'?'fuxiPowerTarget':'nuwaPowerTarget';
  targets.forEach(index=>cellNodes[index]?.classList.add('powerTarget',targetClass));
  stage.append(effect);requestAnimationFrame(()=>effect.classList.add('active'));
  await pause(duration);effect.remove();targets.forEach(index=>cellNodes[index]?.classList.remove('powerTarget',targetClass));
}
async function awakeningPowers(used){
  if(gameMode!=='bonus')return;const orbIndexes=groups().orb||[];if(!orbIndexes.length)return;
  /* Three Fuxi symbols trigger the split power.  Select unique landing cells
     so the promised 2/4/6 additional balls are never overwritten. */
  if(!used.fuxi&&count('fuxi')>=3){
    const source=board[orbIndexes[Math.floor(Math.random()*orbIndexes.length)]],requested=[2,4,6][Math.floor(Math.random()*3)],copies=Math.min(requested,Math.max(0,6-orbIndexes.length));
    if(!copies)return;
    const choices=board.map((symbol,index)=>symbol?.id!=='orb'?index:null).filter(index=>index!==null).sort(()=>Math.random()-.5).slice(0,copies);
    choices.forEach(pos=>board[pos]={...source,uid:crypto.randomUUID()});render();
    await showAwakeningPower('fuxi',choices);used.fuxi=true;status(`伏羲分裂神啟：3 個伏羲觸發，x${source.orb} 倍率球新增 ${choices.length} 顆。`);
  }
  /* Three Nüwa symbols trigger the lock power.  The selected ball is then
     restored after every cascade for 2, 4, or 6 feature rounds. */
  if(!used.nuwa&&count('nuwa')>=3){
    const currentOrbs=groups().orb||[];if(!currentOrbs.length)return;
    const pos=currentOrbs[Math.floor(Math.random()*currentOrbs.length)],symbol=board[pos],rounds=[2,4,6][Math.floor(Math.random()*3)];
    if(!lockedOrbs.some(lock=>lock.position===pos))lockedOrbs.push({position:pos,symbol:{...symbol},rounds,created:spinId});
    render();await showAwakeningPower('nuwa',[pos]);used.nuwa=true;status(`女媧鎖定神啟：3 個女媧觸發，x${symbol.orb} 倍率球鎖定 ${rounds} 回合。`);
  }
}
/* Final Awakening rules agreed for the playable version.  This runs after a
   winning wave has paid, never as a substitute for that wave's destruction. */
function deityTriggers(used){
  if(gameMode!=='bonus')return [];
  const found=[];
  const byKind=groups();
  if(!used.fuxi&&(byKind.fuxi||[]).length>=3)found.push({kind:'fuxi',indexes:[...byKind.fuxi]});
  if(!used.nuwa&&(byKind.nuwa||[]).length>=3)found.push({kind:'nuwa',indexes:[...byKind.nuwa]});
  return found;
}
/* A deity skill is never presented without a multiplier ball to affect.
   This is a deterministic safety rule for the three-symbol awakening event,
   not an extra ordinary orb-roll: if a skill trigger is present and the
   board has no ball, one neutral non-deity position becomes its target. */
function ensureDeityMultiplier(triggers){
  if(!triggers.length||multiplierSymbols().length)return false;
  const deityIndexes=new Set(triggers.flatMap(trigger=>trigger.indexes));
  const candidates=board.map((symbol,index)=>symbol&&!deityIndexes.has(index)?index:null)
    .filter(index=>index!==null);
  const target=candidates[Math.floor(Math.random()*candidates.length)];
  if(target===undefined)return false;
  board[target]=newOrbSymbol(triggers[0]?.kind);
  return true;
}
async function awakeningPowersV2(used,triggers=[]){
  if(gameMode!=='bonus')return;
  const fuxiTrigger=triggers.find(trigger=>trigger.kind==='fuxi');
  const nuwaTrigger=triggers.find(trigger=>trigger.kind==='nuwa');
  const orbIndexes=groups().orb||[];
  if(fuxiTrigger&&orbIndexes.length){
    const source=board[orbIndexes[Math.floor(Math.random()*orbIndexes.length)]];
    /* Three public-style split tiers: each new ball inherits its source's
       multiplier and rarity. */
    const requested=[2,4,6][Math.floor(Math.random()*3)];
    const targets=board.map((symbol,index)=>symbol?.id!=='orb'?index:null)
      .filter(index=>index!==null).sort(()=>Math.random()-.5).slice(0,requested);
    await showAwakeningPower('fuxi',targets,3500);
    const children=targets.map(index=>({index,symbol:splitChildOrb(source,'fuxi')}));
    children.forEach(({index,symbol})=>board[index]=symbol);
    render();await pause(650);used.fuxi=true;
    status(`伏羲分裂神啟：x${source.orb} 倍率球新增 ${targets.length} 顆。`);
  }
  const currentOrbs=groups().orb||[];
  if(nuwaTrigger&&currentOrbs.length){
    /* Nüwa seals every multiplier already on the grid.  The frozen entries
       remain at their exact grid indexes for 4–5 future feature rounds and
       are treated as fixed gravity stops by buildGravityBoard(). */
    const rounds=Math.random()<.5?4:5;
    currentOrbs.forEach(position=>{
      const existing=lockedOrbs.find(lock=>lock.position===position);
      if(existing){
        existing.symbol={...board[position]};
        existing.rounds=Math.max(existing.rounds,rounds);
        existing.created=spinId;
      }else lockedOrbs.push({position,symbol:{...board[position]},rounds,created:spinId});
    });
    applyLocks(board);render();
    await showAwakeningPower('nuwa',currentOrbs,3500);
    render();await pause(420);used.nuwa=true;
    status(`女媧鎖定神啟：${currentOrbs.length} 顆倍率球冰封鎖定，持續 ${rounds} 回合。`);
  }
}
/* Calculate a single winning wave in two visible beats: first the basic win,
   then multiplier balls join the total multiplier and add only the bonus
   portion.  This keeps the plaque cumulative across every tumble wave. */
async function settleWaveBase(basePay){
  roundWin+=basePay;credit(basePay);
  await animateRoundWin(visibleWinTotal(),340);
}
async function applyWaveMultiplier(basePay,inFeature){
  const lockedIndexes=new Set(lockedOrbs.map(lock=>lock.position));
  /* Frozen balls are deliberately excluded from every live cascade wave.
     Nüwa's seal is resolved only after the last possible tumble below. */
  const balls=multiplierSymbols().filter(({index})=>!lockedIndexes.has(index));
  /* In Free Games and Awakening the accumulated total multiplier persists.
     Every later paid wave must use it even when that wave reveals no new
     multiplier ball.  Previously the early return below silently settled
     such waves at x1. */
  if(!balls.length&&!inFeature)return {multiplier:1,extra:0};
  if(balls.length)await collectMultipliers(balls);
  const added=balls.reduce((sum,{symbol})=>sum+symbol.orb,0);
  let multiplier;
  if(inFeature){
    globalMultiplier=Math.min(5000,globalMultiplier+added);
    multiplier=Math.max(1,globalMultiplier);
    balls.forEach(({index})=>{board[index]=null;});
    ui();
  }else{
    multiplier=Math.max(1,added);
    balls.forEach(({index})=>board[index]=null);
  }
  const panel=document.querySelector('.game>aside:first-child .feature:first-child');
  panel?.classList.remove('multiplierPulse');void panel?.offsetWidth;panel?.classList.add('multiplierPulse');
  /* Feature modes settle their complete SPIN only after every cascade ends.
     Here we only collect new balls into the persistent total multiplier. */
  if(inFeature)return {multiplier,extra:0};
  const extra=basePay*Math.max(0,multiplier-1);
  if(extra>0){roundWin+=extra;credit(extra);await animateRoundWin(visibleWinTotal(),440);}
  return {multiplier,extra};
}
/* Nüwa's frozen balls stay visibly sealed throughout every cascade.  Only
   after the board has no further winning groups do they enter the total
   multiplier and multiply this completed round once. */
async function settleFrozenMultipliers(basePay,inFeature){
  if(!inFeature||!(basePay>0))return {multiplier:1,extra:0};
  const lockedIndexes=new Set(lockedOrbs.map(lock=>lock.position));
  const frozen=multiplierSymbols().filter(({index})=>lockedIndexes.has(index));
  if(!frozen.length)return {multiplier:1,extra:0};
  await collectMultipliers(frozen,{keepIndexes:lockedIndexes});
  const added=frozen.reduce((sum,{symbol})=>sum+symbol.orb,0);
  globalMultiplier=Math.min(5000,globalMultiplier+added);
  const multiplier=Math.max(1,globalMultiplier);
  ui();
  const panel=document.querySelector('.game>aside:first-child .feature:first-child');
  panel?.classList.remove('multiplierPulse');void panel?.offsetWidth;panel?.classList.add('multiplierPulse');
  status(`女媧冰封倍率結算：${frozen.length} 顆倍率球於連消結束後加入總倍率。`);
  return {multiplier,extra:0};
}
async function tumble(inFeature){
  let chain=1,used={fuxi:false,nuwa:false},collectedMultiplier=0,initialReelsReleased=false;baseWin=0;
  /* Continue every cascade until the board contains no new winning group. */
  while(true){
    const result=wins(),triggers=deityTriggers(used);
    if(!result.length&&!triggers.length)break;
    /* Three Nüwa / Fuxi are a dedicated skill event.  Do not clear an
       ordinary 8+ group on that same wave: only the deity symbols disappear.
       A multiplier ball is guaranteed before the event animation begins. */
    const deityOnly=triggers.length>0;
    if(deityOnly)ensureDeityMultiplier(triggers);
    const awardedGroups=deityOnly?[]:result;
    /* Change presentation layers once, before the first winning group is
       highlighted.  All following tumbles already use the fixed grid. */
    if(!initialReelsReleased){releaseStoppedReelStrips();initialReelsReleased=true;}
    const hit=[...new Set([...awardedGroups.flatMap(([,indexes])=>indexes),...triggers.flatMap(trigger=>trigger.indexes)])];
    const pay=awardedGroups.reduce((sum,[id,indexes])=>sum+payFor(id,indexes.length),0)
      +(deityOnly?deityPay(triggers):0);
    baseWin+=pay;
    /* Show this cascade's points immediately.  A later cascade continues the
       same counter, so the score visibly accumulates until no more wins exist. */
    $('#chainInfo').textContent=deityOnly
      ?`神明技能觸發：${hit.length} 個神明符號消除・贏得 ${money(pay)}・倍率球已就位`
      :`第 ${chain} 次連消：${hit.length} 個得獎符號`;
    /* A prior tumble leaves one settled travelling overlay above each cell.
       Remove those overlays before this wave receives its win class, so every
       matched symbol is visibly highlighted for the entire elimination beat. */
    releaseSettledCascadeDisplay();
    render(hit);await pause(650);
    /* First the winning symbols disappear.  In Free/Awakening only, every
       multiplier ball then flies into the permanent total before stones fall. */
    /* Clearing already produces its own visual beat.  The old extra 150 ms
       wait froze every surviving symbol after the winners disappeared and
       made all three modes feel as if the board had stalled. */
    clearUnfrozen(board,hit);render();
    await settleWaveBase(pay);
    /* A Nüwa-locked ball can be shown across several rounds, but is collected
       into the global multiplier at most once. */
    await awakeningPowersV2(used,triggers);
    /* Skills alter the live balls before this wave contributes them to the
       feature total.  Fuxi copies therefore count immediately; Nuwa's new
       locks remain visible and can count again on later winning waves. */
    /* A deity-only trigger has no normal-symbol award of its own.  It seals
       the balls for a later paid wave instead of immediately consuming them
       into the total multiplier. */
    const wave=pay>0?await applyWaveMultiplier(pay,inFeature):{multiplier:1,extra:0};
    collectedMultiplier+=wave.multiplier>1?wave.multiplier:0;
    /* dropCascade resolves only after every travelling stone has landed.
       Keep one short paint hand-off instead of the former 320 ms full-board
       hold, so the next cascade evaluation remains smooth without allowing
       two animation layers to overlap. */
    await dropCascade([]);await pause(34);chain++;
  }
  /* The only permitted frozen-ball settlement point: the while loop has
     ended, so no symbol is being removed or falling any longer. */
  const frozenResult=await settleFrozenMultipliers(baseWin,inFeature);
  collectedMultiplier+=frozenResult.multiplier>1?frozenResult.multiplier:0;
  /* One feature SPIN has one final multiplication.  The upper plaque first
     holds the sum of all cascade base wins, then changes to the complete
     round result.  Only that complete result is later committed once to the
     lower total-win field. */
  const applied=inFeature&&baseWin>0?Math.max(1,globalMultiplier):1;
  if(inFeature&&baseWin>0&&applied>1){
    await presentMultiplierSettlement({applied});
    const extra=baseWin*(applied-1);
    roundWin+=extra;
    credit(extra);
    await animateRoundWin(visibleWinTotal(),560);
  }
  return{chains:chain-1,collectedMultiplier,applied};
}
function settle(inFeature,collectedMultiplier=0,applied=1){
  return {spinMultiplier:inFeature?collectedMultiplier:0,applied};
}
/* Keep score counting and multiplier conversion as two readable beats.
   The plaque first holds the completed base total, then displays a dedicated
   multiplier step, and only afterwards counts toward the final round total. */
async function presentMultiplierSettlement(result){
  if(!(baseWin>0)||!(result.applied>1))return;
  const ticker=$('.winTicker'),multiplierPanel=document.querySelector('.game>aside:first-child .feature:first-child');
  ticker?.classList.remove('isCounting','isSettled');ticker?.classList.add('isMultiplying');
  $('#chainInfo').textContent=`基本贏分 ${money(baseWin)} ・倍率結算 x${result.applied}`;
  multiplierPanel?.classList.remove('multiplierPulse');void multiplierPanel?.offsetWidth;multiplierPanel?.classList.add('multiplierPulse');
  await pause(720);
  ticker?.classList.remove('isMultiplying');
}
function modal(title,value,text,art){
  clearTimeout(winCloseTimer);winCloseTimer=0;$('#modal').classList.remove('winCelebration');
  $('#modal').classList.remove('featureIntro');$('#modal button').textContent='繼續';
  $('#modalTitle').textContent=title;$('#modalWin').textContent=value;$('#modalText').textContent=text;
  const image=$('#modalArt');image.src=art?`assets/${art}`:'';image.classList.toggle('hidden',!art);$('#modal').classList.remove('hidden');
}
/* Simple hold screen for now.  A supplied Free-Game illustration can replace
   this text treatment later without changing the click-to-start flow. */
function showFeatureIntro(mode){
  /* The feature entrance must release its modal reliably.  Keep autoPlay
     paused until the player dismisses this panel, then closeModal starts the
     automatic 15-round sequence. */
  featureIntroPending=true;
  const title=mode==='bonus'?'神啟之境':'免費遊戲';
  modal(title,`${freeSpins} 回合`,'點擊畫面任意處，開始自動免費遊戲。');
  $('#modal').classList.add('featureIntro');$('#modal button').textContent='點擊任意處開始';
}
function winTier(win){return[...WIN_TIERS].reverse().find(tier=>win>=bet*tier.min);}
function showWin(win,{returnToBase=false,subtitle=''}={}){
  /* One final classification per completed spin: the total includes every
     cascade, orb and feature multiplier before we choose the highest tier. */
  /* A feature can have many automatic rounds.  Its BIG-WIN classification is
     deliberately deferred to the final feature total, not opened mid-run. */
  if(gameMode!=='base'&&!returnToBase)return false;
  const tier=winTier(win);if(!tier)return false;
  const popup=$('#modal'),image=$('#modalArt'),counter=$('#modalWin'),ratio=win/bet;
  popup.classList.add('winCelebration');popup.classList.remove('hidden');
  $('#modalTitle').textContent=tier.name;image.src=`assets/${tier.art}`;image.classList.remove('hidden');
  $('#modalText').textContent=subtitle||`x${ratio.toFixed(2)} 下注獎勵・點擊繼續`;
  if(returnToBase)$('#modalText').textContent=`獲得彩金 ${money(win)} ・ ${tier.name} ・ x${ratio.toFixed(2)} ・ 點擊繼續回到一般遊戲。`;
  const started=performance.now();
  const tick=now=>{const progress=Math.min(1,(now-started)/(tier.duration*.72));counter.textContent=money(win*(1-Math.pow(1-progress,3)));if(progress<1&&!popup.classList.contains('hidden'))requestAnimationFrame(tick);};
  counter.textContent=money(0);requestAnimationFrame(tick);
  /* Big-win results are deliberately player-dismissed.  The full count-up is
     still allowed to finish, but no timeout may skip the presentation. */
  clearTimeout(winCloseTimer);winCloseTimer=0;
  if(returnToBase)featureReturnPending=true;
  return true;
}
/* A completed feature always receives a dedicated prize summary.  This is
   intentionally separate from BIG WIN: even a small result must not jump
   straight back to the base game. */
function showFeatureResult(win,mode){
  const popup=$('#modal'),image=$('#modalArt'),counter=$('#modalWin');
  popup.classList.add('winCelebration');popup.classList.remove('hidden','featureIntro');
  image.classList.add('hidden');image.removeAttribute('src');
  $('#modalTitle').textContent='獲得彩金';
  $('#modalText').textContent=`${mode==='bonus'?'神啟之境':'免費遊戲'}結束，點擊畫面返回一般遊戲。`;
  $('#modal button').textContent='繼續';
  const started=performance.now(),duration=720;
  const tick=now=>{
    const progress=Math.min(1,(now-started)/duration);
    counter.textContent=money(win*(1-Math.pow(1-progress,3)));
    if(progress<1&&!popup.classList.contains('hidden'))requestAnimationFrame(tick);
  };
  counter.textContent=money(0);requestAnimationFrame(tick);
  clearTimeout(winCloseTimer);winCloseTimer=0;featureReturnPending=true;
}
function enter(mode){
  /* Changing scenes must not animate the main/reel-stage geometry.  The
     legacy sceneShift scale was the source of the bonus board's sudden jump. */
  document.body.dataset.mode=gameMode=mode;
  document.body.classList.remove('sceneShift');
}
function resolveFeatures(inFeature){
  const awakening=count('qingqiu'),scatters=count('fox')+awakening;
  if(!inFeature&&scatters>=4){
    freeSpins=START_FREE;featureSpinLimit=START_FREE;globalMultiplier=0;featureWin=0;
    autoPlay=true;
    if(awakening){enter('bonus');showFeatureIntro('bonus');return'feature';}
    enter('free');showFeatureIntro('free');return'feature';
  }
  /* A final free round may pay, but cannot restart after its counter has
     reached zero.  This guarantees a feature eventually returns to base. */
  if(inFeature&&freeSpins>0&&featureSpinLimit<START_FREE+RETRIGGER&&scatters>=3){
    const grant=Math.min(RETRIGGER,START_FREE+RETRIGGER-featureSpinLimit);
    freeSpins+=grant;featureSpinLimit+=grant;
    modal('免費遊戲追加',`+${grant} 回合`,`出現 ${scatters} 個 Scatter，增加 ${grant} 回合。`,gameMode==='bonus'?'02.jpg':'01.png');setTimeout(()=>window.closeModal(),1400);return'retrigger';
  }
  return '';
}
function jackpot(allow){
  if(!allow)return false;const n=count('jp');if(n<2)return false;
  const win=bet*[0,0,20,50,150,500][Math.min(5,n)];roundWin+=win;credit(win);return{count:n,win};
}
function mysteryChest(allow){
  if(!allow||Math.random()>=.004)return false;
  const multiplier=[5,5,10,10,20,50][Math.floor(Math.random()*6)],win=bet*multiplier;
  roundWin+=win;credit(win);return{multiplier,win};
}
/* Settled cascade stones are kept only until their own cascade is complete.
   Before a fresh SPIN, reveal the already-correct board cells and remove every
   temporary overlay so no old symbol can cover the new reel result. */
function clearSettledCascadeOverlays(){
  document.querySelectorAll('.cascadeStone.settledCascade').forEach(stone=>stone.remove());
  cellNodes.forEach(cell=>{delete cell.dataset.residentCascade;});
}
/* The first stop is painted by reusable reel belts.  Once it wins, every
   belt must leave before cascade stones appear, otherwise its old symbols
   remain behind the new result and two symbols occupy one position. */
function releaseStoppedReelStrips(){
  document.querySelectorAll('.reelStrip[data-reel-col]').forEach(strip=>strip.remove());
  cellNodes.forEach(cell=>{
    delete cell.dataset.residentReel;
    cell.classList.remove('reelLanding','reelCleared');
  });
}
async function spin(automatic=false){
  /* A spin, tumble and win settlement are one uninterrupted sequence. */
  if(spinning||(!automatic&&gameMode!=='base'))return;
  const inFeature=gameMode!=='base',cost=inFeature?0:bet*(ante?1.25:1);if(balance<cost){status('虛擬餘額不足。');return;}
  clearSettledCascadeOverlays();
  const stage=document.querySelector('main');stage.style.cursor='default';stage.classList.remove('spinPressed');void stage.offsetWidth;stage.classList.add('spinPressed');setTimeout(()=>stage.classList.remove('spinPressed'),1000);
  spinning=true;skip=false;$('#spin').disabled=true;featureRoundCommitted=false;roundWin=0;resetRoundWinDisplay();spinId++;if(inFeature)freeSpins--;else{debit(cost);if(autoPlay&&autoRemaining>0)autoRemaining--;}$('#spin').textContent='SPIN';ui();
  startReelSfx();
  /* Keep the existing symbols in place while reels roll.  Replacing the full
     board every 135 ms caused artwork to flash and re-load during a spin. */
  const settledFinal=tumbleTestPending?makeTumbleTestBoard():makeBoard();tumbleTestPending=false;applyLocks(settledFinal);
  /* Do not put multiplier balls on the rotating strips.  Their cells are
     blank during the stop sequence and are filled only by revealMultiplierBalls. */
  const multiplierPlacements=settledFinal.map((symbol,index)=>symbol?.id==='orb'?{index,symbol}:null).filter(Boolean);
  const final=settledFinal.map(symbol=>symbol?.id==='orb'?null:symbol);
  const reels=$('#reels'),stopped=new Set();reels.classList.add('spinning');
  /* Each multiplier ritual is started by its own reel on the same frame that
     reel begins to descend.  The 720 ms ritual therefore resolves exactly
     when that reel lands, including reels 1–5 (not only the final reel). */
  const orbRituals=[];
  /* Each column is a continuous two-part motion: its old belt leaves, then
     that same reel immediately receives the new belt.  Do not leave a blank
     board-wide pause between clearing and refilling. */
  const reelTasks=[];
  for(let col=0;col<COLS;col++){
    reelTasks.push((async()=>{
      /* A callback is fragile here: an already-settled column can finish
         before `incoming` is assigned, leaving `await incoming` unresolved
         on some browsers.  Run clear then incoming in one explicit promise
         chain so feature auto-spins cannot freeze after the first round. */
      await clearReelStrip(col);
      await playReelStrip(col,final,stopped,()=>{
        multiplierPlacements
          .filter(({index})=>index%COLS===col)
          .forEach(({symbol,index})=>orbRituals.push(
            castOrbToBoard(symbol,index,{duration:620,transformDuration:100,onComplete:commitMultiplierBall})
          ));
      });
    })());
    /* The next reel follows 0.1 seconds after the previous one starts. */
    if(col<COLS-1)await pause(100);
  }
  await Promise.all(reelTasks);
  if(false){
    /* Reel 1 lands and settles before reel 2 begins, continuing left to
       right through reel 6.  This prevents the overlapping pop-in effect. */
    /* Start the next reel while the prior belt is still travelling, producing
       the familiar left-to-right overlapping stop cadence. */
    await pause(480+col*360);await playReelStrip(col,final,stopped);return;
    // Legacy per-cell landing remains unreachable below and is pending deletion.
    for(let row=0;row<ROWS;row++)board[row*COLS+col]=final[row*COLS+col];
    stopped.add(col);
    /* Each reel lands from top to bottom: lower rows travel farther, while
       reels 1–6 still stop in sequence. */
    const landing=Array.from({length:ROWS},(_,row)=>({index:row*COLS+col,distance:row+1}));
    render([],landing,Array.from({length:COLS},(_,n)=>n).filter(n=>!stopped.has(n)));
  }
  reels.classList.remove('spinning');
  stopReelSfx();
  /* The six settled reel strips are deliberately retained as the visible
     symbols until the next spin.  Calling render() here rebuilt the cells
     underneath them and could leave one hidden/duplicate symbol behind in a
     feature scene.  Reveal balls first, then let tumble own its next render. */
  await Promise.all(orbRituals);
  if(multiplierPlacements.length){await pause(520);clearMultiplierReveal(multiplierPlacements);}
  growRare();
  const tumbleResult=await tumble(inFeature);
  const result=settle(inFeature,tumbleResult.collectedMultiplier,tumbleResult.applied);
  /* Jackpot/chest awards are a separate additive result.  Add and animate
     them before the final status/modal so every displayed total matches the
     credited balance.  Do not allow both bonus awards on the same spin. */
  const jp=jackpot(!inFeature),chest=jp?false:mysteryChest(!inFeature);
  if(jp||chest)await animateRoundWin(visibleWinTotal(),360);
  const feature=resolveFeatures(inFeature);
  if(inFeature){featureWin+=roundWin;featureRoundCommitted=true;}
  const netText=`${walletNet()>=0?'+':''}${money(walletNet())}`;
  $('#chainInfo').textContent=roundWin?`連消 ${tumbleResult.chains} 次・基本 ${money(baseWin)} × x${result.applied}・淨輸贏 ${netText}`:`本局未中獎・淨輸贏 ${netText}`;if(!roundWin&&!feature)status('本局未中獎。');
  if(jp&&!feature)modal('Jackpot 寶箱',money(jp.win),`出現 ${jp.count} 個 JP 符號；本局合計 ${money(roundWin)}。`,'48.jpg');else if(chest&&!feature)modal('神秘寶箱',money(chest.win),`隨機寶箱開出 x${chest.multiplier} 下注獎勵。`,'mystery-chest-transparent.png');else if(!feature)showWin(roundWin);
  featurePrizeStatus();
  if(inFeature&&!freeSpins){
    const special=gameMode==='bonus',finalWin=featureWin,tier=winTier(finalWin);
    /* Normal feature results return straight to the main game.  BIG WIN and
       above deliberately hold their result screen until the reviewer clicks
       Continue, so the achievement can be read before the scene changes. */
    autoPlay=false;globalMultiplier=0;featureWin=0;featureSpinLimit=0;lockedOrbs=[];
    if(tier){
      /* The feature finale keeps its accumulated prize explicit, while
         showWin selects only this total's single highest WIN class. */
      $('#modalText').textContent=`獲得彩金 ${money(finalWin)} ・ ${tier.name}`;
      showWin(finalWin,{returnToBase:true,subtitle:`${special?'神啟之境':'免費遊戲'}結束・x${(finalWin/bet).toFixed(2)}・點擊繼續回到一般遊戲。`});
    }else showFeatureResult(finalWin,special?'bonus':'free');
  }
tickLocks();spinning=false;skip=false;$('#spin').textContent='SPIN';if(returnAfterSpin){returnAfterSpin=false;returnToBaseGame();return;}if(gameMode==='base'&&autoPlay&&autoRemaining===0)autoPlay=false;$('#auto').textContent=autoPlay&&gameMode==='base'?`AUTO：${autoRemaining}`:'AUTO ×10';ui();if(autoPlay&&((gameMode==='base'&&autoRemaining>0)||(gameMode!=='base'&&freeSpins))&&$('#modal').classList.contains('hidden'))setTimeout(()=>spin(true),700);
}
function buyFeature(){
  if(spinning||gameMode!=='base')return;const cost=bet*BUY;if(balance<cost){status('虛擬餘額不足以購買免費遊戲。');return;}
  debit(cost);freeSpins=START_FREE;featureSpinLimit=START_FREE;globalMultiplier=0;featureWin=0;autoPlay=true;const special=Math.random()<.15;enter(special?'bonus':'free');ui();showFeatureIntro(special?'bonus':'free');
}
function toggleAnte(){if(spinning||gameMode!=='base')return;ante=!ante;$('#ante').textContent=ante?'特別投注：開':'特別投注：關';ui();}
/* Portfolio test entrance: start the standard 15-round Free Game without
   charging demo credits.  It never chooses the separate awakening mode. */
function startFreeGames(){
  if(spinning||gameMode!=='base')return;
  freeSpins=START_FREE;featureSpinLimit=START_FREE;globalMultiplier=0;featureWin=0;autoPlay=true;
  enter('free');ui();showFeatureIntro('free');
}
/* Portfolio test entrance: lets reviewers inspect Awakening without changing
   its normal 4+ Scatter / Qingqiu trigger rule. */
function startAwakening(){
  if(spinning||gameMode!=='base')return;
  freeSpins=START_FREE;featureSpinLimit=START_FREE;globalMultiplier=0;featureWin=0;lockedOrbs=[];
  /* Do not mark the game as spinning here.  The intro remains clickable and
     closeModal can immediately launch the first automatic feature spin. */
  autoPlay=true;
  enter('bonus');ui();showFeatureIntro('bonus');
}
/* The normal-game entrance is available only while a feature is showing.
   It is an explicit, safe return path for the demo — never a fourth mode. */
function returnToBaseGame(){
  /* Feature rounds run automatically. A return request finishes the current
     atomic cascade, then returns without starting another feature round. */
  if(spinning){autoPlay=false;returnAfterSpin=true;status('本回合結束後返回一般遊戲。');return;}
  freeSpins=0;featureSpinLimit=0;globalMultiplier=0;featureWin=0;lockedOrbs=[];autoPlay=false;featureReturnPending=false;
  featureIntroPending=false;clearTimeout(winCloseTimer);winCloseTimer=0;
  $('#modal').classList.add('hidden');$('#modal').classList.remove('winCelebration','featureIntro');
  releaseStoppedReelStrips();releaseSettledCascadeDisplay();
  enter('base');board=makeBoard();render();resetRoundWinDisplay();ui();
}
window.gameAssetsReady=preloadArt();board=makeOpeningShowcaseBoard();render();ui();cleanSpinMatte();cleanSpinGlowMatte();cleanBoardMatte();
function adjustBet(delta){if(spinning||gameMode!=='base')return;bet=Math.max(100,Math.min(500,bet+delta));ui();}
/* The three portfolio entrances are actual buttons. Capture their click in
   the target phase so the scenic main-stage handler cannot steal it. */
for(const [selector,action] of [['#baseEntry',returnToBaseGame],['#freeEntry',startFreeGames],['#bonusEntry',startAwakening]]){
  $(selector).addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();action();
  },true);
}
/* Play the click sample on pointerdown, inside the original user gesture.
   Waiting for the later click/spin handler allowed some browsers to reject
   the short M4R sample while simultaneously unlocking the looping BGM. */
$('#spin').addEventListener('pointerdown',()=>{
  if(!spinning&&!$('#spin').disabled)playSpinClickSfx();
});
$('#spin').onclick=()=>spin(false);$('#betDown').onclick=()=>adjustBet(-10);$('#betUp').onclick=()=>adjustBet(10);
$('#hudBetDown').onclick=()=>adjustBet(-10);$('#hudBetUp').onclick=()=>adjustBet(10);
$('#auto').onclick=()=>{if(spinning)return;if(autoPlay){autoPlay=false;autoRemaining=0;$('#auto').textContent='AUTO ×10';return;}autoPlay=true;autoRemaining=10;spin();};$('#ante').onclick=toggleAnte;$('#buyFeature').onclick=buyFeature;
$('#rulesBtn').onclick=()=>modal('玩法說明','6 輪 × 5 列','任意位置 8 個相同符號得獎。大獎分級：BIG x15、SUPER x30、MEGA x60、ULTRA x150、LEGENDARY x500。4+ Scatter 進入 15 回合；功能內 3+ Scatter 追加 5 回合。','57.png');
/* The portfolio guide is separate from the win/feature modal so it cannot
   accidentally start, cancel or advance a spin.  It simply presents the
   supplied authored reference sheets. */
const GUIDE_PAGES={
  gameplay:{src:'assets/guide-gameplay.png',alt:'遊戲說明：基本玩法與贏分公式'},
  modes:{src:'assets/guide-modes.png',alt:'免費遊戲與神啟之境說明'},
  paytable:{src:'assets/guide-paytable.png',alt:'賠率表'},
  symbols:{src:'assets/guide-feature-symbols.png',alt:'免費遊戲與神啟之境符號'},
  multipliers:{src:'assets/guide-multipliers.png',alt:'倍率特色'}
};
function setGuidePage(page){
  const item=GUIDE_PAGES[page]||GUIDE_PAGES.gameplay;
  $('#guideArt').src=item.src;$('#guideArt').alt=item.alt;
  document.querySelectorAll('[data-guide]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.guide===page)));
}
function openGuide(){if(spinning)return;setGuidePage('gameplay');$('#guideModal').classList.remove('hidden');}
function closeGuide(){$('#guideModal').classList.add('hidden');}
$('#guideBtn').addEventListener('click',openGuide);
$('#guideClose').addEventListener('click',closeGuide);
document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>setGuidePage(button.dataset.guide)));
$('#guideModal').addEventListener('click',event=>{if(event.target===$('#guideModal'))closeGuide();});
window.closeModal=()=>{
  const popup=$('#modal');if(popup.classList.contains('hidden'))return;
  /* A feature intro is a distinct state: once the player dismisses it, the
     very first Free / Awakening round must begin automatically.  This is not
     left to the generic autoplay condition, which also services result and
     retrigger popups. */
  const launchingFeature=featureIntroPending&&gameMode!=='base'&&freeSpins>0;
  clearTimeout(winCloseTimer);winCloseTimer=0;featureIntroPending=false;
  popup.classList.add('hidden');popup.classList.remove('winCelebration','featureIntro');
  if(featureReturnPending){returnToBaseGame();return;}
  if(launchingFeature){autoPlay=true;setTimeout(()=>{if(!spinning&&gameMode!=='base'&&freeSpins>0)spin(true);},350);return;}
  if(autoPlay&&!spinning&&((gameMode==='base'&&autoRemaining>0)||(gameMode!=='base'&&freeSpins>0)))setTimeout(()=>spin(true),500);
};
/* Only the feature-introduction hold screen is dismissible by clicking
   anywhere.  Other dialogs retain their existing Continue button behavior. */
$('#modal').addEventListener('click',()=>{
  if(featureIntroPending||$('#modal').classList.contains('winCelebration'))window.closeModal();
});

/* Keep the scenic/visible crest and the real button on one exact hit area.
   Reading the live button rectangle avoids stale percentage coordinates when
   its supplied artwork is resized or moved. */
function isSpinCrestPoint(clientX,clientY){
  const rect=$('#spin').getBoundingClientRect();
  return clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom;
}
document.querySelector('main').addEventListener('click',event=>{
  if(event.target===$('#spin'))return;
  if(spinning)return;
  const withinSpin=gameMode==='base'&&isSpinCrestPoint(event.clientX,event.clientY);
  if(withinSpin)spin();
});

/* The visible base-game SPIN crest is embedded in the supplied landscape.
   Give that exact artwork a hand cursor even if an invisible overlay is not
   the event target in a local file preview. */
document.querySelector('main').addEventListener('mousemove',event=>{
  const withinSpin=gameMode==='base'&&isSpinCrestPoint(event.clientX,event.clientY);
  /* While the spin is locked, the painted crest must not advertise itself as
     clickable even though the scenic click-area listener still receives the
     mouse movement. */
  const active=withinSpin&&!spinning&&!$('#spin').disabled;
  event.currentTarget.style.cursor=active?'pointer':'default';
});

/* Keep the two decorative wolves anchored to their board corners if the
   preview window is resized or the supplied PNGs finish decoding after a
   scene transition.  This affects decoration only, never the reel grid. */

/* Render every visible Arabic digit with the supplied gold numeral artwork.
   UI values remain normal text in the data model, so balance, score, bet and
   counters can still update normally; only their final display is replaced. */
function applyDigitArtwork(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const parent=node.parentElement;
    if(!parent||!/[0-9]/.test(node.nodeValue)||parent.closest('script,style,textarea,code,pre,.digitArt'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }}),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const fragment=document.createDocumentFragment();
    node.nodeValue.split(/(\d+)/).forEach(part=>{
      if(!part)return;
      if(/^\d+$/.test(part)){
        const digits=document.createElement('span');digits.className='digitArt';digits.setAttribute('aria-label',part);
        [...part].forEach(digit=>{const image=document.createElement('img');image.src=`assets/digit-${digit}.png`;image.alt='';image.setAttribute('aria-hidden','true');digits.append(image);});
        fragment.append(digits);
      }else fragment.append(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
}
applyDigitArtwork();
