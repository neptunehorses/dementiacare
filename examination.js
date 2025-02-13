let answers = new Array(5).fill(null);

function selectAnswer(questionIndex, answer) {
    answers[questionIndex] = answer;
    
    // 선택된 버튼 스타일 변경
    const buttons = document.querySelectorAll(`.question-item:nth-child(${questionIndex + 1}) .option-btn`);
    buttons.forEach((btn, index) => {
        if (index === answer) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function calculateResults() {
    // 모든 질문에 답했는지 확인
    if (answers.includes(null)) {
        alert('모든 질문에 답해주세요.');
        return;
    }

    // 위험도 계산 (예=1점, 아니오=0점)
    const score = answers.filter(answer => answer === 0).length;
    
    // 결과를 로컬 스토리지에 저장
    localStorage.setItem('examScore', score);
    
    // 결과 페이지로 이동
    location.href = 'results.html';
} 