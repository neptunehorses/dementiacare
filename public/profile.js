let currentUserId;

async function loadProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    currentUserId = urlParams.get('id') || Auth.getUserId();
    
    try {
        const response = await fetch(`/api/users/${currentUserId}/profile`);
        const data = await response.json();
        
        document.getElementById('username').textContent = data.user.username;
        document.getElementById('bio').textContent = data.user.profile.bio || '소개가 없습니다.';
        document.getElementById('location').textContent = data.user.profile.location || '위치 정보가 없습니다.';
        document.getElementById('join-date').textContent = `가입일: ${new Date(data.user.createdAt).toLocaleDateString()}`;
        
        if (data.user.profile.avatar) {
            document.getElementById('avatar').src = data.user.profile.avatar;
        }
        
        // 자신의 프로필인 경우 수정 버튼 표시
        if (currentUserId === Auth.getUserId()) {
            document.getElementById('profile-actions').innerHTML = `
                <button onclick="showEditProfileModal()" class="edit-profile-btn">프로필 수정</button>
            `;
        }
        
        showTab('posts');
    } catch (error) {
        console.error('프로필 로딩 실패:', error);
    }
}

async function showTab(tab) {
    const tabContent = document.getElementById('tab-content');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
    
    try {
        let content = '';
        switch (tab) {
            case 'posts':
                const postsResponse = await fetch(`/api/users/${currentUserId}/posts`);
                const posts = await postsResponse.json();
                content = renderPosts(posts);
                break;
            case 'bookmarks':
                const bookmarksResponse = await fetch(`/api/users/${currentUserId}/bookmarks`);
                const bookmarks = await bookmarksResponse.json();
                content = renderPosts(bookmarks);
                break;
            case 'likes':
                const likesResponse = await fetch(`/api/users/${currentUserId}/likes`);
                const likes = await likesResponse.json();
                content = renderPosts(likes);
                break;
            case 'stats':
                content = await showStats();
                break;
            case 'followers':
                const followersResponse = await fetch(`/api/users/${currentUserId}/stats`);
                const followersData = await followersResponse.json();
                content = renderUsers(followersData.followers);
                break;
            case 'following':
                const followingResponse = await fetch(`/api/users/${currentUserId}/stats`);
                const followingData = await followingResponse.json();
                content = renderUsers(followingData.following);
                break;
        }
        
        tabContent.innerHTML = content;
    } catch (error) {
        console.error('탭 내용 로딩 실패:', error);
    }
}

function renderPosts(posts) {
    if (posts.length === 0) {
        return '<p>게시글이 없습니다.</p>';
    }
    
    return `
        <div class="post-grid">
            ${posts.map(post => `
                <div class="post-card" onclick="location.href='/post-detail.html?id=${post._id}'">
                    <h3>${post.title}</h3>
                    <div class="post-meta">
                        <span>${new Date(post.createdAt).toLocaleDateString()}</span>
                        <span>좋아요 ${post.likeCount}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showEditProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>프로필 수정</h2>
            <textarea id="edit-bio" placeholder="자기소개를 입력하세요"></textarea>
            <input type="text" id="edit-location" placeholder="위치를 입력하세요">
            <div class="modal-buttons">
                <button onclick="submitProfileEdit()">수정</button>
                <button onclick="closeModal()">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitProfileEdit() {
    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                bio: document.getElementById('edit-bio').value,
                location: document.getElementById('edit-location').value
            })
        });
        
        if (!response.ok) {
            throw new Error('프로필 수정에 실패했습니다.');
        }
        
        closeModal();
        loadProfile();
    } catch (error) {
        alert(error.message);
    }
}

// 프로필 이미지 업로드
function initAvatarUpload() {
    const avatarContainer = document.querySelector('.profile-avatar');
    if (currentUserId === Auth.getUserId()) {
        avatarContainer.classList.add('avatar-upload');
        avatarContainer.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = uploadAvatar;
            input.click();
        });
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/users/avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('이미지 업로드에 실패했습니다.');

        const data = await response.json();
        document.getElementById('avatar').src = data.avatarUrl;
    } catch (error) {
        alert(error.message);
    }
}

// 팔로우/언팔로우 기능
async function toggleFollow() {
    try {
        const response = await fetch(`/api/users/${currentUserId}/follow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (!response.ok) throw new Error('팔로우 처리에 실패했습니다.');

        const data = await response.json();
        loadProfile();
    } catch (error) {
        alert(error.message);
    }
}

// 활동 통계 표시
async function showStats() {
    try {
        const response = await fetch(`/api/users/${currentUserId}/stats`);
        const data = await response.json();

        return `
            <div class="activity-timeline">
                <h2>최근 활동</h2>
                ${data.recentPosts.map(post => `
                    <div class="activity-item">
                        <div class="activity-date">${new Date(post.createdAt).toLocaleDateString()}</div>
                        <div>새 게시글 작성: ${post.title}</div>
                    </div>
                `).join('')}
                ${data.recentComments.map(comment => `
                    <div class="activity-item">
                        <div class="activity-date">${new Date(comment.createdAt).toLocaleDateString()}</div>
                        <div>댓글 작성: ${comment.post.title}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('통계 로딩 실패:', error);
        return '<p>통계를 불러오는데 실패했습니다.</p>';
    }
}

// 팔로워/팔로잉 목록 표시
function renderUsers(users) {
    return `
        <div class="user-grid">
            ${users.map(user => `
                <div class="user-card" onclick="location.href='/profile.html?id=${user._id}'">
                    <img src="${user.profile.avatar || '/default-avatar.png'}" class="user-avatar" alt="${user.username}">
                    <div class="user-info">
                        <div class="username">${user.username}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 페이지 로드 시 프로필 정보 불러오기
document.addEventListener('DOMContentLoaded', loadProfile); 