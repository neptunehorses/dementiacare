let answers = new Array(5).fill(null);
let currentQuestionIndex = 0;

// 진행도 업데이트
function updateProgress() {
    const answered = answers.filter(answer => answer !== null).length;
    const progress = document.getElementById('progress');
    const percentage = (answered / 5) * 100;
    progress.style.width = `${percentage}%`;
}

// 답변 선택
function selectAnswer(questionIndex, value) {
    // 이전 선택 초기화
    const questionItem = document.querySelectorAll('.question-item')[questionIndex];
    const buttons = questionItem.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    // 현재 선택 표시
    const selectedButton = value === 1 ? buttons[0] : buttons[1];
    selectedButton.classList.add('selected');
    
    // 답변 저장
    answers[questionIndex] = value;
    
    // 진행도 업데이트
    updateProgress();
    
    // 자동 스크롤 (마지막 질문이 아닌 경우)
    if (questionIndex < 4) {
        setTimeout(() => {
            const nextQuestion = document.querySelectorAll('.question-item')[questionIndex + 1];
            nextQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        unansweredQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    
    // 질문 순차적 애니메이션
    const questions = document.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        question.style.animationDelay = `${index * 0.2}s`;
    });
    
    // 초기 진행도 표시
    updateProgress();
    
    // 버튼 클릭 이벤트 리스너 추가
    document.querySelectorAll('.option-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const questionItem = this.closest('.question-item');
            const questionIndex = Array.from(document.querySelectorAll('.question-item')).indexOf(questionItem);
            const value = this.textContent.trim() === '예' ? 1 : 0;
            selectAnswer(questionIndex, value);
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