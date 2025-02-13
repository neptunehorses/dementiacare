let answers = new Array(5).fill(null);
let selectedButtons = new Array(5).fill(null);

function updateProgress() {
    const answered = answers.filter(answer => answer !== null).length;
    const progress = document.getElementById('progress');
    const percentage = (answered / 5) * 100;
    progress.style.width = `${percentage}%`;
}

function selectAnswer(questionIndex, answer) {
    answers[questionIndex] = answer;
    
    // 이전에 선택된 버튼의 스타일 초기화
    if (selectedButtons[questionIndex] !== null) {
        selectedButtons[questionIndex].classList.remove('selected');
    }
    
    // 현재 선택된 버튼 스타일 적용
    const buttons = document.querySelectorAll(`.question-item:nth-child(${questionIndex + 1}) .option-btn`);
    buttons[answer].classList.add('selected');
    selectedButtons[questionIndex] = buttons[answer];

    // 진행도 업데이트
    updateProgress();

    // 자동으로 다음 질문으로 스크롤
    if (questionIndex < 4) {
        const nextQuestion = document.querySelectorAll('.question-item')[questionIndex + 1];
        nextQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function calculateResults() {
    // 모든 질문에 답했는지 확인
    if (answers.includes(null)) {
        alert('모든 질문에 답해주세요.');
        // 답변하지 않은 첫 번째 질문으로 스크롤
        const unansweredIndex = answers.findIndex(answer => answer === null);
        const unansweredQuestion = document.querySelectorAll('.question-item')[unansweredIndex];
        unansweredQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // 위험도 계산 (예=1점, 아니오=0점)
    const score = answers.filter(answer => answer === 0).length;
    
    // 결과를 로컬 스토리지에 저장
    localStorage.setItem('examScore', score);
    localStorage.setItem('examDate', new Date().toISOString());
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    
    // 결과 페이지로 이동
    location.href = 'results.html';
}

// 페이지 로드 시 실행
window.onload = function() {
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

    // 초기 진행도 표시
    updateProgress();

    // 질문 순차적으로 나타나는 애니메이션
    const questions = document.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        question.style.animationDelay = `${index * 0.2}s`;
    });
}; 