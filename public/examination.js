let answers = new Array(5).fill(null);
let currentQuestionIndex = 0;

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

// 답변 선택
function selectAnswer(questionIndex, value) {
    const questionItems = document.querySelectorAll('.question-item');
    const currentQuestion = questionItems[questionIndex];
    const buttons = currentQuestion.querySelectorAll('.option-btn');
    
    // 이전 선택 초기화
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    // 현재 선택 표시
    const selectedButton = value === 1 ? buttons[0] : buttons[1];
    selectedButton.classList.add('selected');
    
    // 답변 저장
    answers[questionIndex] = value;
    
    // 진행도 업데이트
    updateProgress();
    
    // 다음 질문으로 자동 스크롤 (마지막 질문이 아닌 경우)
    if (questionIndex < 4) {
        setTimeout(() => {
            currentQuestionIndex = questionIndex + 1;
            const nextQuestion = questionItems[currentQuestionIndex];
            nextQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateActiveQuestion(currentQuestionIndex);
        }, 500);
    }
}

// 결과 계산
function calculateResults() {
    // 모든 질문에 답변했는지 확인
    if (answers.includes(null)) {
        const unansweredIndex = answers.findIndex(answer => answer === null);
        const unansweredQuestion = document.querySelectorAll('.question-item')[unansweredIndex];
        
        // 경고 메시지 표시
        alert('모든 질문에 답해주세요.');
        
        // 미답변 질문으로 스크롤
        currentQuestionIndex = unansweredIndex;
        unansweredQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateActiveQuestion(unansweredIndex);
        
        // 흔들림 효과
        unansweredQuestion.style.animation = 'none';
        unansweredQuestion.offsetHeight; // 리플로우 트리거
        unansweredQuestion.style.animation = 'shake 0.5s ease-in-out';
        return;
    }

    // 점수 계산 (예=1점)
    const score = answers.reduce((total, answer) => total + answer, 0);
    
    // 결과 저장
    localStorage.setItem('examScore', score);
    localStorage.setItem('examDate', new Date().toISOString());
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    
    // 결과 페이지로 이동
    window.location.href = '/results';
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 이전 답변 복원
    const savedAnswers = localStorage.getItem('examAnswers');
    if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        parsedAnswers.forEach((answer, index) => {
            if (answer !== null) {
                selectAnswer(index, answer);
            }
        });
    }
    
    // 첫 번째 질문 활성화
    updateActiveQuestion(0);
    
    // 버튼 클릭 이벤트 리스너 추가
    document.querySelectorAll('.option-btn').forEach(button => {
        button.addEventListener('click', function() {
            const questionItem = this.closest('.question-item');
            const questionIndex = Array.from(document.querySelectorAll('.question-item')).indexOf(questionItem);
            const value = parseInt(this.dataset.value);
            selectAnswer(questionIndex, value);
        });
    });

    // 스크롤 이벤트로 활성 질문 업데이트
    window.addEventListener('scroll', function() {
        const questions = document.querySelectorAll('.question-item');
        const windowMiddle = window.scrollY + window.innerHeight / 2;
        
        questions.forEach((question, index) => {
            const rect = question.getBoundingClientRect();
            const questionMiddle = rect.top + rect.height / 2;
            
            if (Math.abs(questionMiddle - window.innerHeight / 2) < rect.height / 2) {
                currentQuestionIndex = index;
                updateActiveQuestion(index);
            }
        });
    });
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