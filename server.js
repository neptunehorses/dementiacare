const express = require('express');
const path = require('path');
const app = express();

// 정적 파일 제공
app.use(express.static('public'));

// 기본 라우트
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel은 serverless 환경이므로 listen은 개발환경에서만 실행
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`);
    });
}

// Vercel 배포를 위한 export
module.exports = app; 