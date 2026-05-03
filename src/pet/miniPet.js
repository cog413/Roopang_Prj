// miniPet.js v6 - 다중 픽셀 펫 & 강화된 실정장표

const SPEECHES = ['...','쉿!','( ˘ ˘ )','낑낑','영차!','냠냠','( ˘▽˘)','구경중', '업무중...', '데이터 확인'];
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

// 추가 실정장표 데이터 (눈속임용 고도화)
const PROJECT_ROWS = [
    ['Next-Gen ERP 고도화', '85%', '진행중', '2026-12-31', '임부장'],
    ['Global Cloud Migration', '42%', '진행중', '2027-06-30', '김차장'],
    ['AI 챗봇 고객센터 연동', '100%', '완료', '2026-04-15', '이과장'],
    ['보안 취약점 정기 점검', '10%', '대기', '2026-05-20', '박대리'],
    ['전사 데이터 거버넌스 수립', '65%', '진행중', '2026-09-15', '최팀장'],
];

let active = false, domBuilt = false, wanderTimer = null;
let pets = []; // 다중 펫 지원

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// ── 진입점 ──────────────────────────────────────────────
export function initMiniPet() {
    buildDOM();

    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    const checkDisplay = () => {
        const shown = sheet.style.display !== 'none';
        if (shown && !active) startWander();
        if (!shown && active) stopWander();
    };

    // 초기 상태 체크
    checkDisplay();

    // MutationObserver: display 속성 변화 감지
    new MutationObserver(checkDisplay).observe(sheet, { attributes: true, attributeFilter: ['style'] });
}

function startWander() {
    active = true;
    // 바 입장 애니메이션
    document.querySelectorAll('#mp-bars .mp-bar').forEach((b, i) => {
        b.style.height = '0%';
        setTimeout(() => { 
            b.style.transition = 'height .7s ease-out'; 
            b.style.height = b.dataset.h + '%'; 
        }, i * 120);
    });
    
    pets.forEach(pet => {
        pet.cx = 50 + Math.random() * 100;
        pet.cy = 200 + Math.random() * 200;
        updatePetPos(pet);
    });
    
    wander();
}

function stopWander() {
    active = false;
    clearTimeout(wanderTimer);
}

function wander() {
    if (!active) return;
    
    pets.forEach(pet => {
        pet.cx = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
        pet.cy = BOUNDS.minY + Math.random() * (BOUNDS.maxY - BOUNDS.minY);
        updatePetPos(pet);
        
        if (Math.random() < 0.3) {
            speak(pet, rand(SPEECHES), 1200);
        }
    });
    
    // 첫 번째 펫 기준으로 맵 그리기
    if (pets.length > 0) {
        drawMap(pets[0].cx, pets[0].cy);
    }
    
    wanderTimer = setTimeout(wander, 2000 + Math.random() * 3000);
}

// ── DOM ────────────────────────────────────────────────
function buildDOM() {
    if (domBuilt) return;
    const h = document.getElementById('mini-pet-habitat');
    if (!h) return;
    domBuilt = true;

    // 1. 기존 실적장표 (Table 1)
    const tbl = el('div','mp-table'); tbl.id = 'mp-table';
    const hdr = el('div','mht-row mht-header');
    ['부서명','Q1','Q2','Q3','Q4'].forEach(t => { const c=el('div','mht-cell'); c.textContent=t; hdr.appendChild(c); });
    tbl.appendChild(hdr);
    ROWS.forEach((row,i) => {
        const r = el('div','mht-row'+(i%2===0?' mht-even':''));
        row.forEach((v,j) => { const c=el('div','mht-cell'+(j>0?' mht-num':'')); c.textContent=v; r.appendChild(c); });
        tbl.appendChild(r);
    });

    // 2. 신규 프로젝트 실정장표 (Table 2 - 눈속임 강화)
    const projTbl = el('div','mp-table proj-table');
    const projHdr = el('div','mht-row mht-header');
    ['주요 프로젝트명','진척률','상태','마감기한','담당자'].forEach(t => { const c=el('div','mht-cell'); c.textContent=t; projHdr.appendChild(c); });
    projTbl.appendChild(projHdr);
    PROJECT_ROWS.forEach((row,i) => {
        const r = el('div','mht-row'+(i%2===0?' mht-even':''));
        row.forEach((v,j) => { 
            const c=el('div','mht-cell'); 
            c.textContent=v; 
            if (v === '완료') c.style.color = '#217346';
            if (v === '진행중') c.style.color = '#0052cc';
            r.appendChild(c); 
        });
        projTbl.appendChild(r);
    });

    // 3. 차트
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

    // 4. 서식지 맵
    const map = el('div','mp-minimap');
    map.innerHTML = `
        <div class="mp-minimap-title">📍 실시간 분석 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div style="font-size:9px;margin-top:4px;display:flex;flex-direction:column;gap:2px;">
            <span style="color:#5b9bd5">■ 실적 데이터</span>
            <span style="color:#ed7d31">■ 요약 그래프</span>
            <span style="color:#217346;font-weight:bold">● 분석 에이전트</span>
        </div>`;

    h.append(tbl, projTbl, cht, map);

    // 5. 다중 펫 생성 (3마리)
    for (let i = 0; i < 3; i++) {
        createPet(h, i);
    }
}

function createPet(parent, id) {
    const spr = el('div','mp-sprite'); spr.id=`mp-sprite-${id}`;
    spr.innerHTML = `
        <div class="mps-body">
            <div class="mps-antenna"></div>
            <div class="mps-eyes"><div class="mps-eye"></div><div class="mps-eye"></div></div>
            <div class="mps-cheeks"><div class="mps-cheek"></div><div class="mps-cheek"></div></div>
        </div>
        <div class="mps-feet"><div class="mps-foot"></div><div class="mps-foot"></div></div>`;

    const bub = el('div','mp-bubble'); bub.id=`mp-bubble-${id}`;
    
    parent.append(spr, bub);
    
    pets.push({
        id,
        element: spr,
        bubble: bub,
        cx: 100 + id * 50,
        cy: 300,
        _t: null
    });
}

function el(tag, cls) { const e=document.createElement(tag); e.className=cls; return e; }

// ── 이동 ──────────────────────────────────────────────
function updatePetPos(pet) {
    if (!pet.element) return;
    pet.element.style.left = pet.cx + 'px';
    pet.element.style.top  = pet.cy + 'px';
    if (pet.bubble) { 
        pet.bubble.style.left = (pet.cx - 8) + 'px'; 
        pet.bubble.style.top  = (pet.cy - 26) + 'px'; 
    }
}

function speak(pet, text, dur=1000) {
    const b = pet.bubble;
    if (!b) return;
    b.textContent = text;
    b.classList.add('visible');
    clearTimeout(pet._t);
    pet._t = setTimeout(() => b.classList.remove('visible'), dur);
}

// ── 서식지 맵 ─────────────────────────────────────────
const MW=148, MH=108;
const SX=MW/800, SY=MH/600; // 가상 캔버스 크기 조정

function drawMap(px, py) {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,MW,MH);

    // 배경
    ctx.fillStyle='#f0f0f0'; ctx.fillRect(0,0,MW,MH);

    // ── 실적영역 ──
    ctx.fillStyle='#fff';    ctx.fillRect(10,10,60,80);
    ctx.strokeStyle='#ddd';  ctx.strokeRect(10,10,60,80);
    
    // ── 그래프영역 ──
    ctx.fillStyle='#fff';    ctx.fillRect(80,10,50,40);
    ctx.strokeStyle='#ddd';  ctx.strokeRect(80,10,50,40);

    // ── 펫 위치 (첫 번째 펫) ──
    const dotX = px * SX + 10;
    const dotY = py * SY + 10;
    
    ctx.fillStyle='#217346';
    ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
}

