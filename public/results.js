document.addEventListener('DOMContentLoaded', function() {
    const score = parseInt(localStorage.getItem('examScore')) || 0;
    const examDate = new Date(localStorage.getItem('examDate')).toLocaleDateString();
    const resultContent = document.getElementById('result-content');
    
    let resultHTML = '<div class="result-message">';
    
    if (score >= 4) {
        resultHTML += `
            <div class="result-header warning">
                <h2>전문의 상담이 필요할 수 있습니다</h2>
                <p class="exam-date">검사일: ${examDate}</p>
            </div>
            <div class="result-detail">
                <p>치매 위험이 있을 수 있으니, 가까운 치매안심센터나 신경과 전문의의 상담을 받아보시는 것을 권장드립니다.</p>
                <div class="risk-level">
                    <div class="risk-bar high"></div>
                    <span>위험도: 높음</span>
                </div>
            </div>
        `;
    } else if (score >= 2) {
        resultHTML += `
            <div class="result-header caution">
                <h2>주의가 필요합니다</h2>
                <p class="exam-date">검사일: ${examDate}</p>
            </div>
            <div class="result-detail">
                <p>현재는 심각한 수준은 아니지만, 정기적인 검진과 관리가 필요할 수 있습니다.</p>
                <div class="risk-level">
                    <div class="risk-bar medium"></div>
                    <span>위험도: 중간</span>
                </div>
            </div>
        `;
    } else {
        resultHTML += `
            <div class="result-header safe">
                <h2>정상 범위입니다</h2>
                <p class="exam-date">검사일: ${examDate}</p>
            </div>
            <div class="result-detail">
                <p>현재는 특별한 이상이 없어 보입니다. 하지만 정기적인 건강검진을 권장드립니다.</p>
                <div class="risk-level">
                    <div class="risk-bar low"></div>
                    <span>위험도: 낮음</span>
                </div>
            </div>
        `;
    }
    
    resultHTML += `
        <div class="result-actions">
            <button onclick="location.href='examination.html'" class="action-btn retry">다시 검사하기</button>
            <button onclick="location.href='care-guide.html'" class="action-btn guide">케어 가이드</button>
        </div>
    </div>`;
    
    resultContent.innerHTML = resultHTML;
});

// 네이버 지도 관련 변수
let map;
let markers = [];

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(37.5665, 126.9780), // 서울 중심
        zoom: 13
    });
}

// 현재 위치 가져오기
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // 지도 중심 이동
                const currentPos = new naver.maps.LatLng(lat, lng);
                map.setCenter(currentPos);
                
                // 현재 위치 마커 표시
                new naver.maps.Marker({
                    position: currentPos,
                    map: map,
                    icon: {
                        content: '<div style="background-color:#4CAF50;width:15px;height:15px;border-radius:50%;"></div>',
                        anchor: new naver.maps.Point(7, 7)
                    }
                });
                
                // 주변 병원 검색
                searchNearbyHospitals(lat, lng);
            },
            error => {
                alert('위치 정보를 가져올 수 없습니다.');
            }
        );
    } else {
        alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
    }
}

// 주변 병원 검색
function searchNearbyHospitals(lat, lng) {
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // 네이버 검색 API 사용
    fetch(`/api/search/hospital?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            const hospitalList = document.getElementById('hospital-list');
            hospitalList.innerHTML = '';
            
            data.forEach(place => {
                // 마커 생성
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(place.y, place.x),
                    map: map
                });
                markers.push(marker);
                
                // 거리 계산
                const distance = calculateDistance(lat, lng, place.y, place.x);
                
                // 병원 목록 생성
                const hospitalItem = document.createElement('div');
                hospitalItem.className = 'hospital-item';
                hospitalItem.innerHTML = `
                    <h3>${place.name}</h3>
                    <p>${place.address}</p>
                    <p>전화: ${place.tel || '번호 없음'}</p>
                    <p class="hospital-distance">약 ${distance}km 거리</p>
                `;
                
                // 클릭 이벤트
                hospitalItem.onclick = () => {
                    map.setCenter(new naver.maps.LatLng(place.y, place.x));
                    map.setZoom(16);
                };
                
                hospitalList.appendChild(hospitalItem);
            });
        })
        .catch(error => {
            console.error('병원 검색 중 오류 발생:', error);
            alert('병원 검색 중 오류가 발생했습니다.');
        });
}

// 거리 계산 함수
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반경 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return Math.round(d * 10) / 10; // 소수점 첫째자리까지
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// 지도 초기화
document.addEventListener('DOMContentLoaded', function() {
    initMap();
}); 