let map;
let markers = [];
let currentInfoWindow = null;

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(37.5665, 126.9780),
        zoom: 13,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
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
                        content: '<div style="background-color:#ff9a9e;width:15px;height:15px;border-radius:50%;"></div>',
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

// 주소로 검색
function searchAddress() {
    const address = document.getElementById('address').value;
    if (!address) return;

    naver.maps.Service.geocode({
        query: address
    }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) {
            alert('주소를 찾을 수 없습니다.');
            return;
        }

        const item = response.v2.addresses[0];
        const lat = parseFloat(item.y);
        const lng = parseFloat(item.x);
        
        map.setCenter(new naver.maps.LatLng(lat, lng));
        searchNearbyHospitals(lat, lng);
    });
}

// 주변 병원 검색
function searchNearbyHospitals(lat, lng) {
    const hospitalType = document.getElementById('hospital-type').value;
    const distance = document.getElementById('distance').value;
    
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // API 호출 (실제 구현 시에는 백엔드 API를 호출해야 합니다)
    // 여기서는 더미 데이터를 사용합니다
    const dummyHospitals = getDummyHospitals(lat, lng);
    displayHospitals(dummyHospitals);
}

// 병원 목록 표시
function displayHospitals(hospitals) {
    const hospitalList = document.getElementById('hospital-list');
    hospitalList.innerHTML = '';
    
    hospitals.forEach(hospital => {
        // 마커 생성
        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(hospital.lat, hospital.lng),
            map: map
        });
        
        // 정보창 생성
        const infoWindow = new naver.maps.InfoWindow({
            content: `
                <div class="info-window">
                    <h3>${hospital.name}</h3>
                    <p>${hospital.address}</p>
                    <p>${hospital.tel}</p>
                </div>
            `
        });
        
        // 마커 클릭 이벤트
        naver.maps.Event.addListener(marker, 'click', () => {
            if (currentInfoWindow) currentInfoWindow.close();
            infoWindow.open(map, marker);
            currentInfoWindow = infoWindow;
        });
        
        markers.push(marker);
        
        // 병원 목록 아이템 생성
        const hospitalItem = document.createElement('div');
        hospitalItem.className = 'hospital-item';
        hospitalItem.innerHTML = `
            <div class="hospital-name">${hospital.name}</div>
            <div class="hospital-info">${hospital.address}</div>
            <div class="hospital-info">${hospital.tel}</div>
            <div class="hospital-distance">${hospital.distance}km</div>
        `;
        
        // 목록 아이템 클릭 이벤트
        hospitalItem.onclick = () => {
            map.setCenter(new naver.maps.LatLng(hospital.lat, hospital.lng));
            map.setZoom(16);
            if (currentInfoWindow) currentInfoWindow.close();
            infoWindow.open(map, marker);
            currentInfoWindow = infoWindow;
        };
        
        hospitalList.appendChild(hospitalItem);
    });
}

// 더미 데이터 생성 (실제 구현 시에는 제거)
function getDummyHospitals(centerLat, centerLng) {
    return [
        {
            name: "서울대학교병원 치매센터",
            address: "서울특별시 종로구 대학로 101",
            tel: "02-2072-0560",
            lat: centerLat + 0.01,
            lng: centerLng + 0.01,
            distance: "1.2"
        },
        {
            name: "삼성서울병원 치매센터",
            address: "서울특별시 강남구 일원로 81",
            tel: "02-3410-0900",
            lat: centerLat - 0.01,
            lng: centerLng - 0.01,
            distance: "2.5"
        }
        // 더 많은 더미 데이터 추가 가능
    ];
}

// 페이지 로드 시 지도 초기화
document.addEventListener('DOMContentLoaded', initMap); 