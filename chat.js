let currentRoom;
const socket = io();

async function loadChatRooms() {
    try {
        const response = await fetch('/api/chat/rooms', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const rooms = await response.json();
        
        const roomsList = document.getElementById('rooms-list');
        roomsList.innerHTML = rooms.map(room => `
            <div class="room-item ${currentRoom === room._id ? 'active' : ''}"
                 onclick="selectRoom('${room._id}')">
                <div class="room-info">
                    <div class="room-name">${getOtherParticipant(room).username}</div>
                    <div class="last-message">${room.lastMessage || '새로운 채팅'}</div>
                </div>
                <div class="room-time">
                    ${room.lastMessageTime ? formatTime(room.lastMessageTime) : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('채팅방 목록 로딩 실패:', error);
    }
}

function getOtherParticipant(room) {
    return room.participants.find(p => p._id !== Auth.getUserId());
}

async function selectRoom(roomId) {
    currentRoom = roomId;
    socket.emit('join chat', roomId);
    
    try {
        const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        const messages = await response.json();
        
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = messages.map(message => renderMessage(message)).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('메시지 로딩 실패:', error);
    }
}

function sendMessage() {
    const content = document.getElementById('message-text').value.trim();
    if (!content || !currentRoom) return;
    
    socket.emit('chat message', {
        roomId: currentRoom,
        senderId: Auth.getUserId(),
        content
    });
    
    document.getElementById('message-text').value = '';
}

socket.on('new message', (message) => {
    if (message.room === currentRoom) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML += renderMessage(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    loadChatRooms();
});

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 페이지 로드 시 채팅방 목록 불러오기
document.addEventListener('DOMContentLoaded', loadChatRooms);

// 파일 전송 기능 추가
function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = uploadFile;
    input.click();
}

async function uploadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/chat/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('파일 업로드에 실패했습니다.');

        const data = await response.json();
        socket.emit('chat message', {
            roomId: currentRoom,
            senderId: Auth.getUserId(),
            content: data.url,
            type: data.type.startsWith('image/') ? 'image' : 'file',
            fileName: data.name
        });
    } catch (error) {
        alert(error.message);
    }
}

// 메시지 렌더링 함수 업데이트
function renderMessage(message) {
    let content;
    switch (message.type) {
        case 'image':
            content = `<img src="${message.content}" alt="이미지" class="chat-image">`;
            break;
        case 'file':
            content = `
                <div class="file-message">
                    <i class="file-icon"></i>
                    <a href="${message.content}" target="_blank">${message.fileName}</a>
                </div>
            `;
            break;
        default:
            content = message.content;
    }

    return `
        <div class="message ${message.sender._id === Auth.getUserId() ? 'sent' : 'received'}">
            <div class="message-content">${content}</div>
            <div class="message-time">${formatTime(message.createdAt)}</div>
        </div>
    `;
} 