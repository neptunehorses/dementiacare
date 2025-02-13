// 게시글 데이터 (실제로는 서버에서 가져와야 함)
let posts = [
    {
        id: 1,
        title: '치매 초기 증상에 대해 알고 싶어요',
        category: 'question',
        author: '김철수',
        date: '2024-03-20',
        views: 42
    },
    // 더 많은 게시글...
];

let currentPage = 1;
const postsPerPage = 10;

function renderPosts(category = 'all') {
    const postList = document.querySelector('.post-list');
    const filteredPosts = category === 'all' 
        ? posts 
        : posts.filter(post => post.category === category);
    
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const currentPosts = filteredPosts.slice(startIndex, endIndex);
    
    postList.innerHTML = currentPosts.map(post => `
        <div class="post-item" data-id="${post.id}">
            <div class="post-title">${post.title}</div>
            <div class="post-info">
                <span>${post.author}</span>
                <span>${post.date}</span>
                <span>조회 ${post.views}</span>
            </div>
        </div>
    `).join('');
    
    renderPagination(filteredPosts.length);
}

function renderPagination(totalPosts) {
    const totalPages = Math.ceil(totalPosts / postsPerPage);
    const pagination = document.querySelector('.pagination');
    
    let paginationHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">${i}</button>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    renderPosts(document.querySelector('.category-select').value);
}

// 글쓰기 모달 생성
function createPostModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>새 글 작성</h2>
            <select id="post-category">
                <option value="question">질문</option>
                <option value="share">경험공유</option>
                <option value="info">정보공유</option>
            </select>
            <input type="text" id="post-title" placeholder="제목을 입력하세요">
            <textarea id="post-content" placeholder="내용을 입력하세요"></textarea>
            <div class="image-upload">
                <input type="file" id="post-image" accept="image/*">
                <div id="image-preview"></div>
            </div>
            <div class="modal-buttons">
                <button onclick="submitPost()">등록</button>
                <button onclick="closeModal()">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 이미지 미리보기
    document.getElementById('post-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('image-preview').innerHTML = `
                    <img src="${e.target.result}" style="max-width: 200px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    });
}

async function fetchPosts(category = 'all', page = 1) {
    try {
        const response = await fetch(`/api/posts?category=${category}&page=${page}`);
        const data = await response.json();
        
        posts = data.posts;
        currentPage = parseInt(data.currentPage);
        renderPosts();
        renderPagination(data.totalPages);
    } catch (error) {
        console.error('게시글을 불러오는데 실패했습니다:', error);
    }
}

async function submitPost() {
    if (!Auth.isAuthenticated()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const category = document.getElementById('post-category').value;
    const imageFile = document.getElementById('post-image').files[0];
    
    try {
        let imageUrl = '';
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('이미지 업로드에 실패했습니다.');
            }
            
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
        }
        
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                title,
                content,
                category,
                image: imageUrl
            })
        });
        
        if (!response.ok) {
            throw new Error('게시글 작성에 실패했습니다.');
        }
        
        closeModal();
        fetchPosts();
    } catch (error) {
        alert(error.message);
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// 이벤트 리스너 수정
document.addEventListener('DOMContentLoaded', function() {
    fetchPosts();
    
    document.querySelector('.category-select').addEventListener('change', function(e) {
        currentPage = 1;
        fetchPosts(e.target.value);
    });
    
    document.querySelector('.write-btn').addEventListener('click', function() {
        if (!Auth.isAuthenticated()) {
            alert('로그인이 필요합니다.');
            return;
        }
        createPostModal();
    });
});

async function search() {
    const query = document.getElementById('search-input').value;
    const category = document.querySelector('.category-select').value;
    
    try {
        const response = await fetch(`/api/search?query=${query}&category=${category}`);
        const data = await response.json();
        
        posts = data.posts;
        currentPage = parseInt(data.currentPage);
        renderPosts();
        renderPagination(data.totalPages);
    } catch (error) {
        console.error('검색 실패:', error);
        alert('검색에 실패했습니다.');
    }
}

// 검색어 입력 시 실시간 검색
let searchTimeout;
document.getElementById('search-input').addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        search();
    }, 500);
}); 