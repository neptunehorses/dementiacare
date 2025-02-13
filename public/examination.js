let currentQuestion = 0;
let answers = new Array(5).fill(null);
let selectedButtons = new Array(5).fill(null);

// 진행도 업데이트
function updateProgress() {
    const answered = answers.filter(answer => answer !== null).length;
    const progress = document.getElementById('progress');
    const progressPercent = document.getElementById('progress-percent');
    const percentage = (answered / 5) * 100;
    
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
                <button class="option-btn" onclick="selectAnswer(${currentQuestion}, 1)">예</button>
                <button class="option-btn" onclick="selectAnswer(${currentQuestion}, 0)">아니오</button>
            </div>
        </div>
    `;

    // 현재 질문에 대한 이전 답변이 있으면 버튼 스타일 복원
    if (answers[currentQuestion] !== null) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons[answers[currentQuestion] === 1 ? 0 : 1].classList.add('selected');
    }
}

// 답변 선택 함수
function selectAnswer(questionIndex, answer) {
    answers[questionIndex] = answer;
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // 진행도 업데이트
    updateProgress();
}

// 다음 버튼 처리
function handleNext() {
    // 현재 질문에 답하지 않았으면 경고
    if (answers[currentQuestion] === null) {
        alert('질문에 답해주세요.');
        document.querySelector('.question-item').style.animation = 'shake 0.5s';
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

// 초기화 함수
function initializeExam() {
    // 무조건 새로운 검사 시작
    localStorage.removeItem('examAnswers');
    localStorage.removeItem('examScore');
    localStorage.removeItem('examDate');
    
    currentQuestion = 0;
    answers = new Array(5).fill(null);
    selectedButtons = new Array(5).fill(null);
    
    renderQuestion();
    updateProgress();
}

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

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', initializeExam); 