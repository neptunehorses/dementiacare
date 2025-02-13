let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);

// 진행도 업데이트
function updateProgress() {
    const answered = answers.filter(answer => answer !== null).length;
    const progress = document.getElementById('progress');
    const progressPercent = document.getElementById('progress-percent');
    const percentage = (answered / questions.length) * 100;
    
    progress.style.width = `${percentage}%`;
    progressPercent.textContent = Math.round(percentage);
}

// 질문 활성화 상태 업데이트
function updateActiveQuestion(index) {
    document.querySelectorAll('.question-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

// 질문 렌더링 함수
function renderQuestion() {
    const examContent = document.getElementById('exam-content');
    const nextBtn = document.getElementById('next-btn');
    
    // 마지막 질문인 경우 버튼 텍스트 변경
    if (currentQuestion === questions.length - 1) {
        nextBtn.innerHTML = `
            <span>결과 보기</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    } else {
        nextBtn.innerHTML = `
            <span>다음</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }

    examContent.innerHTML = `
        <div class="question-item active">
            <div class="question-number">질문 ${currentQuestion + 1}/${questions.length}</div>
            <p>${questions[currentQuestion]}</p>
            <div class="options">
                <button class="option-btn ${answers[currentQuestion] === 1 ? 'selected' : ''}" 
                        onclick="selectAnswer(1)">예</button>
                <button class="option-btn ${answers[currentQuestion] === 0 ? 'selected' : ''}" 
                        onclick="selectAnswer(0)">아니오</button>
            </div>
        </div>
    `;
}

// 답변 선택 함수
function selectAnswer(value) {
    answers[currentQuestion] = value;
    updateProgress();
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// 다음 버튼 처리
function handleNext() {
    if (answers[currentQuestion] === null) {
        alert('질문에 답해주세요.');
        return;
    }

    if (currentQuestion === questions.length - 1) {
        // 마지막 질문이면 결과 페이지로 이동
        const score = answers.reduce((sum, answer) => sum + answer, 0);
        localStorage.setItem('examScore', score);
        localStorage.setItem('examDate', new Date().toISOString());
        localStorage.setItem('examAnswers', JSON.stringify(answers));
        window.location.href = '/results';
    } else {
        // 다음 질문으로
        currentQuestion++;
        renderQuestion();
        document.querySelector('.question-item').style.animation = 'fadeIn 0.5s ease-out';
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 저장된 답변 복원
    const savedAnswers = localStorage.getItem('examAnswers');
    if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        if (Array.isArray(parsedAnswers) && parsedAnswers.length === questions.length) {
            answers = parsedAnswers;
        }
    }
    
    renderQuestion();
    updateProgress();
});

// 흔들림 애니메이션 스타일 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style); 