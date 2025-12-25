/* WORD SEARCH ENGINE — RESPONSIVE GRID (NO SCALING) */

/* ========= LS_KEY ========= */
function determineWSKey(){
  const path = location.pathname.toLowerCase();
  const d = path.match(/day\d{3}/);
  if(d) return "ws_"+d[0];
  const t = path.match(/trial-day\d{2}/);
  if(t) return "ws_"+t[0].replace("-","_");
  return "ws_default";
}
const LS_KEY = determineWSKey();

/* ========= CONFIG ========= */
const { title, subtitle, gridRows, gridCols, seed: INITIAL_SEED, words: WORDS } = PUZZLE_CONFIG;

document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* ========= RNG ========= */
let seed = INITIAL_SEED;
function rand(){
  seed = (seed*1103515245+12345)%2147483648;
  return seed/2147483648;
}
function choice(a){ return a[Math.floor(rand()*a.length)]; }

const DIRS=[
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid=Array.from({length:gridRows},()=>Array(gridCols).fill(""));

function inBounds(r,c){ return r>=0&&r<gridRows&&c>=0&&c<gridCols; }

function canPlace(w,r,c,dr,dc){
  for(let i=0;i<w.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] && grid[rr][cc]!==w[i]) return false;
  }
  return true;
}

function placeWord(w){
  for(let t=0;t<2000;t++){
    const {dr,dc}=choice(DIRS);
    const r=Math.floor(rand()*gridRows);
    const c=Math.floor(rand()*gridCols);
    if(canPlace(w,r,c,dr,dc)){
      for(let i=0;i<w.length;i++) grid[r+dr*i][c+dc*i]=w[i];
      return;
    }
  }
}

function generatePuzzle(){
  [...WORDS].map(w=>w.toUpperCase()).sort((a,b)=>b.length-a.length).forEach(placeWord);
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      if(!grid[r][c]) grid[r][c]=ABC[Math.floor(rand()*26)];
    }
  }
}

/* ========= RENDER ========= */
const gridEl=document.getElementById("grid");
gridEl.style.gridTemplateColumns=`repeat(${gridCols}, 1fr)`;

let cellEls=[], foundWords=new Set(), foundCells=new Set();

function renderGrid(){
  gridEl.innerHTML="";
  cellEls=[];
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      const d=document.createElement("div");
      d.className="cell";
      d.textContent=grid[r][c];
      d.dataset.r=r; d.dataset.c=c;
      gridEl.appendChild(d);
      cellEls.push(d);
    }
  }
}

function renderWordList(){
  const box=document.getElementById("wordList");
  box.innerHTML="";
  WORDS.forEach(w=>{
    const d=document.createElement("div");
    d.className="word"+(foundWords.has(w.toUpperCase())?" found":"");
    d.textContent=w.toUpperCase();
    box.appendChild(d);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    el.classList.toggle("prefound",foundCells.has(el.dataset.r+","+el.dataset.c));
  });
}

/* ========= SELECTION ========= */
let startCell=null, previewCells=[], selecting=false, tapStart=null;

function clearPreview(){
  previewCells.forEach(el=>el.classList.remove("preview"));
  previewCells=[];
}

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0||dc===0)||Math.abs(r2-r1)===Math.abs(c2-c1))) return [];
  const out=[[r1,c1]];
  while(r1!==r2||c1!==c2){
    r1+=dr; c1+=dc;
    if(!inBounds(r1,c1)) return [];
    out.push([r1,c1]);
  }
  return out;
}

function previewTo(cell){
  clearPreview();
  const r1=+startCell.dataset.r, c1=+startCell.dataset.c;
  const r2=+cell.dataset.r, c2=+cell.dataset.c;
  lineCells(r1,c1,r2,c2).forEach(([r,c])=>{
    const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el&&!el.classList.contains("prefound")){
      el.classList.add("preview");
      previewCells.push(el);
    }
  });
}

function commit(){
  const w=previewCells.map(e=>e.textContent).join("");
  const rev=w.split("").reverse().join("");
  const hit=WORDS.map(x=>x.toUpperCase()).find(x=>x===w||x===rev);
  if(!hit||foundWords.has(hit)) return;
  foundWords.add(hit);
  previewCells.forEach(e=>foundCells.add(e.dataset.r+","+e.dataset.c));
  renderWordList(); applyFound(); save();
  showToast(`Found: ${hit}`);
}

/* Tap */
gridEl.addEventListener("click",e=>{
  const cell=e.target.closest(".cell");
  if(!cell) return;
  if(!tapStart){ tapStart=cell; startCell=cell; previewTo(cell); }
  else{ startCell=tapStart; previewTo(cell); commit(); clearPreview(); tapStart=null; startCell=null; }
});

/* Drag */
gridEl.addEventListener("pointerdown",e=>{
  const cell=e.target.closest(".cell");
  if(!cell) return;
  selecting=true; startCell=cell; previewTo(cell);
});
gridEl.addEventListener("pointermove",e=>{
  if(!selecting) return;
  const el=document.elementFromPoint(e.clientX,e.clientY)?.closest(".cell");
  if(el) previewTo(el);
});
gridEl.addEventListener("pointerup",()=>{
  if(!selecting) return;
  selecting=false; commit(); clearPreview(); startCell=null;
});

/* ========= SAVE ========= */
function save(){
  localStorage.setItem(LS_KEY,JSON.stringify({foundWords:[...foundWords],foundCells:[...foundCells]}));
}
function restore(){
  const raw=localStorage.getItem(LS_KEY);
  if(!raw) return;
  try{
    const d=JSON.parse(raw);
    (d.foundWords||[]).forEach(w=>foundWords.add(w));
    (d.foundCells||[]).forEach(c=>foundCells.add(c));
  }catch{}
}

/* ========= TOAST ========= */
let timer=null;
function showToast(m){
  const t=document.getElementById("toast");
  t.textContent=m;
  t.classList.add("show");
  clearTimeout(timer);
  timer=setTimeout(()=>t.classList.remove("show"),1800);
}

/* ========= CLEAR ========= */
document.getElementById("clearBtn").onclick=()=>{
  localStorage.removeItem(LS_KEY);
  location.reload();
};

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restore();
renderWordList();
applyFound();
