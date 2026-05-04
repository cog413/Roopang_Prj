const BUTTON_TYPES = {
    'btn-pet-stress': 'STRESS',
    'btn-pet-manager': 'MANAGER',
    'btn-pet-tired': 'TIRED',
    'btn-pet-hard': 'HARD',
    'btn-pet-encourage': 'ENCOURAGE',
    'btn-pet-secret': 'SECRET',
};

export const petEngine = {
    _bubbleTimer: null,
    scripts: {
        GREETING: [
            '관리시트 접속 확인. 오늘도 조용히 추진력을 충전해요.',
            '오셨어요? 저는 천천히 순찰하면서 실적표를 지키고 있었어요.',
            '반갑습니다. 지금부터 이 시트는 공식적으로 휴식 관리 구역입니다.',
            '어서 오세요. 급하면 Esc, 평소에는 심호흡입니다.',
            '오늘의 업무 위장 상태는 양호합니다. 잠깐 쉬어도 됩니다.',
        ],
        STRESS: [
            '그분은 추진력을 이해하지 못합니다. 지금은 한 칸 쉬어가세요.',
            '스트레스가 높으면 수식도 꼬입니다. 물 한 잔 먼저요.',
            '보고는 천천히, 마음은 더 천천히. 제가 옆에서 지켜볼게요.',
            '방금 건 업무 난이도가 아니라 감정 노동 난이도였습니다.',
            '괜찮습니다. 지금은 숨을 고르는 것도 작업입니다.',
            '셀 하나를 선택하듯이, 할 일도 하나만 고르세요.',
        ],
        MANAGER: [
            '팀장님이 오시면 표정은 엑셀, 마음은 휴게실입니다.',
            '지시가 많을수록 우선순위 표가 필요합니다. 전부 한 번에 하지 마세요.',
            '그 요청은 잠시 B열 대기열에 넣어두겠습니다.',
            '팀장님 말풍선은 제가 대신 접수했습니다. 당신은 커피를 접수하세요.',
            '급한 일과 크게 말한 일은 다릅니다. 먼저 진짜 마감부터 확인해요.',
            '오늘의 방어 전략: 짧게 답하고, 천천히 처리하기.',
        ],
        TIRED: [
            '추진력 게이지가 낮습니다. 3분만 눈을 쉬게 해주세요.',
            '피곤함은 버그가 아니라 신호입니다. 잠깐 멈춰도 됩니다.',
            '지금은 속도보다 배터리 관리가 우선입니다.',
            '눈꺼풀이 무거우면 화면 밝기보다 업무량을 낮춰야 합니다.',
            '당분 보충 또는 산책 5분. 둘 중 하나를 승인합니다.',
            '오늘의 권장 함수: =REST(5분)',
        ],
        HARD: [
            '힘든 날은 일단 작은 일 하나만 끝내도 충분합니다.',
            '오늘은 성과보다 생존 로그를 남기는 날입니다.',
            '제가 천천히 걸을 테니, 당신도 천천히 가도 됩니다.',
            '한 번에 다 버티지 말고, 한 줄씩 처리해요.',
            '지금 느린 건 실패가 아니라 과부하 방지 모드입니다.',
            '오늘의 목표를 낮추면 내일의 복구 속도가 올라갑니다.',
        ],
        ENCOURAGE: [
            '지금까지 온 것만으로도 충분히 많은 셀을 채웠습니다.',
            '당신은 생각보다 잘 버티고 있고, 저는 그 기록을 저장 중입니다.',
            '작은 진척도 진척입니다. 1%도 표에는 표시됩니다.',
            '오늘의 당신은 합계 행에 반영될 가치가 있습니다.',
            '느려도 됩니다. 방향이 맞으면 실적표는 결국 채워집니다.',
            '지금 클릭한 건 응원 버튼이지만, 사실은 재시작 버튼입니다.',
        ],
        SECRET: [
            '비밀작전 개시: 표정은 진지하게, 마음은 잠깐 로그아웃.',
            '현재 위장률 97%. 리본 메뉴가 우리 편입니다.',
            '작전명은 관리시트입니다. 아무도 귀여움을 의심하지 않습니다.',
            '긴급 상황이면 Esc. 평시에는 천천히 순찰합니다.',
            '셀구리 보고: 주변 이상 없음. 5분 휴식 가능.',
            '이 대화는 감사 로그에 남지 않습니다. 아마도요.',
        ],
    },
    talk(type) {
        const pool = this.scripts[type] || this.scripts.GREETING;
        const randomMsg = pool[Math.floor(Math.random() * pool.length)];
        const sprite = document.getElementById('mp-sprite-0');
        const isManual = type !== 'GREETING';

        if (isManual) window.refresheetManualPetSpeechUntil = Date.now() + 5000;
        clearTimeout(this._bubbleTimer);
        this._bubbleTimer = setTimeout(() => {
            if (isManual) window.refresheetManualPetSpeechUntil = 0;
        }, isManual ? 5000 : 0);

        document.dispatchEvent(new CustomEvent('refresheet:pet-say', {
            detail: { text: randomMsg, duration: isManual ? 5000 : 4200, manual: isManual },
        }));

        if (sprite) {
            sprite.classList.add('mps-listen');
            setTimeout(() => sprite.classList.remove('mps-listen'), 700);
        }

        const formulaInput = document.getElementById('formula-input');
        if (formulaInput) {
            formulaInput.value = `=PET.TALK("${type}")`;
        }
    },
    init() {
        document.addEventListener('click', event => {
            const type = BUTTON_TYPES[event.target.id];
            if (type) {
                this.talk(type);
                if (window.refresheetAuth?.authenticated) {
                    fetch('/api/minime/interact', { method: 'POST', credentials: 'include' }).catch(() => {});
                    document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
                }
            }
        });

        document.querySelectorAll('.tab[data-sheet]').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.sheet === 'mini-pet') {
                    setTimeout(() => this.talk('GREETING'), 600);
                }
            });
        });
    },
};
