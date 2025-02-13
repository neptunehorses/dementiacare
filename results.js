document.addEventListener('DOMContentLoaded', function() {
    const score = parseInt(localStorage.getItem('examScore')) || 0;
    const resultContent = document.getElementById('result-content');
    
    let resultHTML = '<div class="result-message">';
    
    if (score >= 4) {
        resultHTML += `
            <h3 class="warning">전문의 상담이 필요할 수 있습니다</h3>
            <p>치매 위험이 있을 수 있으니, 가까운 치매안심센터나 신경과 전문의의 상담을 받아보시는 것을 권장드립니다.</p>
        `;
    } else if (score >= 2) {
        resultHTML += `
            <h3 class="caution">주의가 필요합니다</h3>
            <p>현재는 심각한 수준은 아니지만, 정기적인 검진과 관리가 필요할 수 있습니다.</p>
        `;
    } else {
        resultHTML += `
            <h3 class="safe">정상 범위입니다</h3>
            <p>현재는 특별한 이상이 없어 보입니다. 하지만 정기적인 건강검진을 권장드립니다.</p>
        `;
    }
    
    resultHTML += '</div>';
    resultContent.innerHTML = resultHTML;
});

// 카카오 맵 초기화
let map;
let markers = [];

function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 5
    };
    map = new kakao.maps.Map(container, options);
}

function searchHospitals(region) {
    const places = new kakao.maps.services.Places();
    
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    const searchCallback = function(result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const hospitalList = document.getElementById('hospital-list');
            hospitalList.innerHTML = '';
            
            result.forEach((place, index) => {
                // 마커 생성
                const marker = new kakao.maps.Marker({
                    map: map,
                    position: new kakao.maps.LatLng(place.y, place.x)
                });
                markers.push(marker);
                
                // 병원 목록 생성
                const hospitalItem = document.createElement('div');
                hospitalItem.className = 'hospital-item';
                hospitalItem.innerHTML = `
                    <h3>${place.place_name}</h3>
                    <p>${place.address_name}</p>
                    <p>전화: ${place.phone}</p>
                `;
                hospitalList.appendChild(hospitalItem);
            });
            
            // 검색된 병원들이 모두 보이도록 지도 범위 조정
            const bounds = new kakao.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.setBounds(bounds);
        }
    };
    
    places.keywordSearch(region + ' 치매 전문병원', searchCallback);
}

// 지역 선택 이벤트 리스너
document.getElementById('region-select').addEventListener('change', function(e) {
    if (e.target.value) {
        searchHospitals(e.target.value);
    }
});

// 지도 초기화
initMap(); 