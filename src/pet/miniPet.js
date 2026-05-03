// miniPet.js v5 - MutationObserver 기반 (탭 감지 100% 신뢰)

const SPEECHES = ['...','쉿!','( ˘ ˘ )','낑낑','영차!','냠냠','( ˘▽˘)','구경중'];
const BOUNDS   = { minX:50, maxX:540, minY:30, maxY:500 };

const ROWS = [
    ['전략기획팀','12,400','11,200','14,800','13,900'],
    ['영업1팀',  '38,200','41,500','39,800','44,200'],
    ['영업2팀',  '29,100','31,400','28,700','33,600'],
    ['마케팅팀', '8,500', '9,200','11,400','10,800'],
    ['개발1팀',  '5,200', '5,800', '6,100', '6,700'],
    ['개발2팀',  '4,900', '5,100', '5,400', '5,900'],
    ['디자인팀', '3,800', '4,200', '4,100', '4,600'],
    ['인사팀',   '2,100', '2,300', '2,200', '2,400'],
    ['재무팀',   '1,800', '1,900', '2,100', '2,000'],
    ['구매팀',   '6,700', '7,100', '6,800', '7,500'],
    ['물류팀',   '9,300', '9,800','10,200','11,100'],
    ['고객서비스','4,400','4,600', '4,800', '5,200'],
    ['법무팀',   '1,200', '1,300', '1,400', '1,300'],
    ['해외영업', '22,800','24,100','26,300','28,900'],
    ['기술지원', '3,600', '3,900', '4,100', '4,300'],
    ['R&D팀',    '7,200', '7,800', '8,100', '8,700'],
    ['품질관리', '2,400', '2,600', '2,500', '2,800'],
    ['안전환경', '1,600', '1,700', '1,800', '1,900'],
    ['IT인프라', '3,100', '3,400', '3,600', '3,800'],
    ['경영지원', '2,900', '3,100', '3,300', '3,500'],
];

const BARS = [
    {label:'Q1',  h:55, val:'162억', color:'#5b9bd5'},
    {label:'Q2',  h:68, val:'174억', color:'#5b9bd5'},
    {label:'Q3',  h:74, val:'183억', color:'#5b9bd5'},
    {label:'Q4',  h:88, val:'200억', color:'#5b9bd5'},
    {label:'목표', h:95, val:'210억', color:'#70ad47'},
    {label:'합계', h:100,val:'720억', color:'#ed7d31'},
];

let active = false, domBuilt = false, wanderTimer = null;
let cx = 100, cy = 300;
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// ── 진입점 ──────────────────────────────────────────────
export function initMiniPet() {
    buildDOM();

    // MutationObserver: display 속성 변화 감지 (click보다 100% 신뢰)
    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;
    new MutationObserver(() => {
        const shown = sheet.style.display !== 'none';
        if (shown && !active) startWander();
        if (!shown && active) stopWander();
    }).observe(sheet, { attributes: true, attributeFilter: ['style'] });
}

function startWander() {
    active = true;
    // 바 입장 애니메이션
    document.querySelectorAll('#mp-bars .mp-bar').forEach((b, i) => {
        b.style.height = '0%';
        setTimeout(() => { b.style.transition = 'height .7s ease-out'; b.style.height = b.dataset.h + '%'; }, i * 120);
    });
    cx = 80; cy = 400;
    setPos(cx, cy);
    wander();
}

function stopWander() {
    active = false;
    clearTimeout(wanderTimer);
}

function wander() {
    if (!active) return;
    cx = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
    cy = BOUNDS.minY + Math.random() * (BOUNDS.maxY - BOUNDS.minY);
    setPos(cx, cy);
    if (Math.random() < .5) speak(rand(SPEECHES), 900);
    drawMap(cx, cy);
    wanderTimer = setTimeout(wander, 1300 + Math.random() * 1700);
}

// ── DOM ────────────────────────────────────────────────
function buildDOM() {
    if (domBuilt) return;
    const h = document.getElementById('mini-pet-habitat');
    if (!h) return;
    domBuilt = true;

    // 실적장표
    const tbl = el('div','mp-table'); tbl.id = 'mp-table';
    const hdr = el('div','mht-row mht-header');
    ['부서명','Q1','Q2','Q3','Q4'].forEach(t => { const c=el('div','mht-cell'); c.textContent=t; hdr.appendChild(c); });
    tbl.appendChild(hdr);
    ROWS.forEach((row,i) => {
        const r = el('div','mht-row'+(i%2===0?' mht-even':''));
        row.forEach((v,j) => { const c=el('div','mht-cell'+(j>0?' mht-num':'')); c.textContent=v; r.appendChild(c); });
        tbl.appendChild(r);
    });

    // 차트
    const cht = el('div','mp-chart'); cht.id = 'mp-chart';
    const ct  = el('div','mp-chart-title'); ct.textContent = '분기별 실적 현황 (억원)';
    const brs = el('div','mp-bars');  brs.id = 'mp-bars';
    BARS.forEach(d => {
        const col = el('div','mp-col');
        const v   = el('div','mp-val');   v.textContent = d.val;
        const b   = el('div','mp-bar');   b.style.height='0%'; b.dataset.h=d.h;
        const lbl = el('div','mp-lbl');   lbl.textContent = d.label;
        col.append(v,b,lbl); brs.appendChild(col);
    });
    cht.append(ct, brs);

    // 서식지 맵
    const map = el('div','mp-minimap');
    map.innerHTML = `
        <div class="mp-minimap-title">📍 서식지 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div style="font-size:9px;margin-top:4px;display:flex;flex-direction:column;gap:2px;">
            <span style="color:#5b9bd5">■ 실적장표</span>
            <span style="color:#ed7d31">■ 실적그래프</span>
            <span style="color:#217346;font-weight:bold">● 셀구리</span>
        </div>`;

    // 스프라이트
    const spr = el('div','mp-sprite'); spr.id='mp-sprite';
    spr.innerHTML = `
        <div class="mps-body">
            <div class="mps-antenna"></div>
            <div class="mps-eyes"><div class="mps-eye"></div><div class="mps-eye"></div></div>
            <div class="mps-cheeks"><div class="mps-cheek"></div><div class="mps-cheek"></div></div>
        </div>
        <div class="mps-feet"><div class="mps-foot"></div><div class="mps-foot"></div></div>`;

    // 말풍선
    const bub = el('div','mp-bubble'); bub.id='mp-bubble';

    h.append(tbl, cht, map, spr, bub);
    drawMap(cx, cy); // 초기 맵 그리기
}

function el(tag, cls) { const e=document.createElement(tag); e.className=cls; return e; }

// ── 이동 ──────────────────────────────────────────────
function setPos(x, y) {
    const s = document.getElementById('mp-sprite');
    const b = document.getElementById('mp-bubble');
    if (!s) return;
    s.style.left = x + 'px';
    s.style.top  = y + 'px';
    if (b) { b.style.left=(x-8)+'px'; b.style.top=(y-26)+'px'; }
}

function speak(text, dur=1000) {
    const b = document.getElementById('mp-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.add('visible');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('visible'), dur);
}

// ── 서식지 맵 ─────────────────────────────────────────
// 씬 전체 픽셀 범위: x 0~620, y 0~565
// 캔버스: 148×108
const MW=148, MH=108;
const SX=MW/620, SY=MH/565;

// 테이블 영역 (씬 내 실제 좌표: left=40, top=20, w=310, h=525)
const TL=40*SX, TT=20*SY, TW=310*SX, TH=525*SY;
// 차트 영역 (left=40+310+24=374, top=20, w=220, h=525)
const CHL=374*SX, CHT=20*SY, CHW=220*SX, CHH=TH;

function drawMap(px, py) {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,MW,MH);

    // 배경
    ctx.fillStyle='#f0f0f0'; ctx.fillRect(0,0,MW,MH);

    // ── 실적장표 ──
    ctx.fillStyle='#fff';    ctx.fillRect(TL,TT,TW,TH);
    // 헤더
    const hH = 25*SY;
    ctx.fillStyle='#dbe5f1'; ctx.fillRect(TL,TT,TW,hH);
    // 행
    for(let i=0;i<=20;i++){
        const ry=TT+hH+i*25*SY;
        ctx.fillStyle= i%2===0?'#f9f9f9':'#fff';
        ctx.fillRect(TL+.5,ry,TW-1,25*SY);
        ctx.strokeStyle='#ddd'; ctx.lineWidth=.3;
        ctx.beginPath(); ctx.moveTo(TL,ry); ctx.lineTo(TL+TW,ry); ctx.stroke();
    }
    // 열
    let colX=TL;
    [110,50,50,50].forEach(w=>{ colX+=w*SX; ctx.strokeStyle='#bbb'; ctx.lineWidth=.5; ctx.beginPath(); ctx.moveTo(colX,TT); ctx.lineTo(colX,TT+TH); ctx.stroke(); });
    // 테두리+라벨
    ctx.strokeStyle='#888'; ctx.lineWidth=1; ctx.strokeRect(TL,TT,TW,TH);
    ctx.fillStyle='#1f3864'; ctx.font='bold 7px sans-serif';
    ctx.fillText('실적장표',TL+2,TT+hH-2);

    // ── 실적그래프 ──
    ctx.fillStyle='#fff'; ctx.fillRect(CHL,CHT,CHW,CHH);
    // 타이틀
    const cTH=24*SY;
    ctx.fillStyle='#f5f5f5'; ctx.fillRect(CHL,CHT,CHW,cTH);
    ctx.fillStyle='#1f3864'; ctx.font='bold 6px sans-serif';
    ctx.fillText('분기별 실적',CHL+2,CHT+cTH-2);
    // 바
    const baTop=CHT+cTH+8*SY, baH=CHH-cTH-16*SY;
    const bW=(CHW-8*SX)/6-1.5;
    BARS.forEach((d,i)=>{
        const bX=CHL+4*SX+i*(bW+1.5);
        const bH2=baH*d.h/100;
        ctx.fillStyle=d.color;
        ctx.fillRect(bX, baTop+baH-bH2, bW, bH2);
    });
    ctx.strokeStyle='#888'; ctx.lineWidth=1; ctx.strokeRect(CHL,CHT,CHW,CHH);
    ctx.fillStyle='#1f3864'; ctx.font='bold 7px sans-serif';
    ctx.fillText('그래프',CHL+2,CHT+cTH-2);

    // ── 셀구리 점 ──
    const dotX=px*SX, dotY=py*SY;
    const grd=ctx.createRadialGradient(dotX,dotY,0,dotX,dotY,7);
    grd.addColorStop(0,'rgba(107,197,160,.9)');
    grd.addColorStop(1,'rgba(107,197,160,0)');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(dotX,dotY,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#217346';
    ctx.beginPath(); ctx.arc(dotX,dotY,3.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
}
