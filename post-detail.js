let currentPostId;

async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');
    
    try {
        const response = await fetch(`/api/posts/${currentPostId}`);
        const post = await response.json();
        
        const postContent = document.getElementById('post-content');
        postContent.innerHTML = `
            <h1>${post.title}</h1>
            <div class="post-meta">
                <span>작성자: ${post.author.username}</span>
                <span>작성일: ${new Date(post.createdAt).toLocaleDateString()}</span>
                <span>조회수: ${post.views}</span>
            </div>
            ${post.image ? `<img src="${post.image}" class="post-image" alt="게시글 이미지">` : ''}
            <div class="post-text">${post.content}</div>
        `;
        
        addEditDeleteButtons(post);
        loadComments();
    } catch (error) {
        console.error('게시글 로딩 실패:', error);
        alert('게시글을 불러오는데 실패했습니다.');
    }
}

async function loadComments() {
    try {
        const response = await fetch(`/api/posts/${currentPostId}/comments`);
        const comments = await response.json();
        
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-author">${comment.author.username}</div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</div>
                ${addCommentActions(comment)}
            </div>
        `).join('');
    } catch (error) {
        console.error('댓글 로딩 실패:', error);
    }
}

async function submitComment() {
    if (!Auth.isAuthenticated()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const content = document.getElementById('comment-input').value;
    if (!content.trim()) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('댓글 작성에 실패했습니다.');
        }
        
        document.getElementById('comment-input').value = '';
        loadComments();
    } catch (error) {
        alert(error.message);
    }
}

function addEditDeleteButtons(post) {
    if (Auth.isAuthenticated() && post.author._id === Auth.getUserId()) {
        const buttons = document.createElement('div');
        buttons.className = 'post-actions';
        buttons.innerHTML = `
            <button onclick="editPost()" class="edit-btn">수정</button>
            <button onclick="deletePost()" class="delete-btn">삭제</button>
        `;
        document.querySelector('.post-content').appendChild(buttons);
    }
}

async function editPost() {
    const post = await fetch(`/api/posts/${currentPostId}`).then(r => r.json());
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>게시글 수정</h2>
            <select id="edit-category" value="${post.category}">
                <option value="question">질문</option>
                <option value="share">경험공유</option>
                <option value="info">정보공유</option>
            </select>
            <input type="text" id="edit-title" value="${post.title}">
            <textarea id="edit-content">${post.content}</textarea>
            <div class="modal-buttons">
                <button onclick="submitEdit()">수정</button>
                <button onclick="closeModal()">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitEdit() {
    try {
        const response = await fetch(`/api/posts/${currentPostId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({
                title: document.getElementById('edit-title').value,
                content: document.getElementById('edit-content').value,
                category: document.getElementById('edit-category').value
            })
        });
        
        if (!response.ok) {
            throw new Error('게시글 수정에 실패했습니다.');
        }
        
        closeModal();
        loadPost();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePost() {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${currentPostId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('게시글 삭제에 실패했습니다.');
        }
        
        window.location.href = '/community.html';
    } catch (error) {
        alert(error.message);
    }
}

// Socket.io 연결
const socket = io();

socket.emit('join', currentPostId);

socket.on('newComment', (comment) => {
    loadComments();
});

// 댓글 수정/삭제 기능
function addCommentActions(comment) {
    if (Auth.isAuthenticated() && comment.author._id === Auth.getUserId()) {
        return `
            <div class="comment-actions">
                <button onclick="editComment('${comment._id}')">수정</button>
                <button onclick="deleteComment('${comment._id}')">삭제</button>
            </div>
        `;
    }
    return '';
}

async function editComment(commentId) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    const content = commentElement.querySelector('.comment-content').textContent;
    
    commentElement.innerHTML = `
        <textarea class="edit-comment-input">${content}</textarea>
        <div class="comment-actions">
            <button onclick="submitCommentEdit('${commentId}')">확인</button>
            <button onclick="loadComments()">취소</button>
        </div>
    `;
}

async function submitCommentEdit(commentId) {
    const content = document.querySelector('.edit-comment-input').value;
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('댓글 수정에 실패했습니다.');
        }
        
        loadComments();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteComment(commentId) {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('댓글 삭제에 실패했습니다.');
        }
        
        loadComments();
    } catch (error) {
        alert(error.message);
    }
}

// 페이지 로드 시 게시글과 댓글 불러오기
document.addEventListener('DOMContentLoaded', loadPost); 