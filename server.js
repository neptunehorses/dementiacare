const express = require('express');
const path = require('path');
const app = express();

// 정적 파일 제공
app.use(express.static('public', {
    extensions: ['html', 'css', 'js']
}));

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`);
}); 