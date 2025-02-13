async function showReportRules() {
    try {
        const response = await fetch('/api/admin/report-rules', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const rules = await response.json();

        return `
            <div class="rules-section">
                <h2>신고 자동 처리 규칙</h2>
                <button onclick="showAddRuleModal()" class="add-rule-btn">새 규칙 추가</button>
                <div class="rules-list">
                    ${rules.map(rule => `
                        <div class="rule-item">
                            <div class="rule-type">${rule.type}</div>
                            <div class="rule-details">
                                <p>기준 횟수: ${rule.threshold}회</p>
                                <p>처리 방법: ${rule.action}</p>
                            </div>
                            <button onclick="deleteRule('${rule._id}')" class="delete-btn">삭제</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('규칙 목록 로딩 실패:', error);
        return '<p>규칙 목록을 불러오는데 실패했습니다.</p>';
    }
}

async function generateReport() {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const response = await fetch(`/api/admin/reports/stats?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const stats = await response.json();

        const ctx = document.getElementById('stats-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.reportStats),
                datasets: [{
                    label: '신고 처리 현황',
                    data: Object.values(stats.reportStats).map(s => s.count)
                }]
            }
        });

        return `
            <div class="stats-section">
                <h2>통계 리포트</h2>
                <div class="stats-period">
                    ${new Date(stats.period.start).toLocaleDateString()} - 
                    ${new Date(stats.period.end).toLocaleDateString()}
                </div>
                <div class="stats-summary">
                    <div class="stat-card">
                        <h3>사용자 통계</h3>
                        <p>전체 사용자: ${stats.userStats.totalUsers}</p>
                        <p>활성 사용자: ${stats.userStats.activeUsers}</p>
                    </div>
                    <div class="stat-card">
                        <h3>신고 처리 통계</h3>
                        <canvas id="stats-chart"></canvas>
                    </div>
                </div>
                <button onclick="downloadReport()" class="download-btn">리포트 다운로드</button>
            </div>
        `;
    } catch (error) {
        console.error('통계 리포트 생성 실패:', error);
        return '<p>통계 리포트를 생성하는데 실패했습니다.</p>';
    }
} 