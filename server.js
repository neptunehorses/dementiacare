const express = require('express');
const path = require('path');
const app = express();

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '0',
    etag: false,
    lastModified: false
}));

// API 라우트
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// HTML 라우트
const htmlFiles = [
    'index', 'examination', 'results', 'care-guide', 
    'community', 'profile', 'login', 'admin'
];

htmlFiles.forEach(file => {
    app.get(`/${file === 'index' ? '' : file}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${file}.html`));
    });
});

// 404 처리
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 에러 처리
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;

// 개발 환경에서만 서버 시작
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`);
    });
} 