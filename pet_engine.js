const petEngine = {
    scripts: {
        STRESS: [
            "그분은 추진력을 이해하지 못합니다. 무시하세요.",
            "누구나 휴식할 권리는 있습니다. 설령 직장인일지라도요.",
            "지금은 무릎을 굽히고 에너지를 모을 시간입니다."
        ],
        TIRED: [
            "추진력 게이지가 낮습니다. 잠시 눈을 붙이...는 척 하세요.",
            "대학원생도 쉬는데 직장인이라고 못 쉴 거 있나요?",
            "Gathering Momentum... 거의 다 모았습니다."
        ]
    },
    talk: function(type) {
        const pool = this.scripts[type];
        const randomMsg = pool[Math.floor(Math.random() * pool.length)];
        const dialogueBox = document.getElementById('pet-dialogue');
        const avatar = document.getElementById('pet-avatar');
        
        dialogueBox.textContent = randomMsg;
        avatar.style.transform = "scale(1.2)";
        setTimeout(() => avatar.style.transform = "scale(1)", 300);

        // Update the formula bar to look like an excel formula execution
        const formulaInput = document.getElementById('formula-input');
        if (formulaInput) {
            formulaInput.value = `=PET.TALK("${type}")`;
        }
    }
};
