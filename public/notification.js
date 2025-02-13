async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        const notifications = await response.json();
        
        const notificationsList = document.getElementById('notifications-list');
        notificationsList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : ''}"
                 onclick="markAsRead('${notification._id}')">
                <div class="notification-content">
                    ${getNotificationMessage(notification)}
                </div>
                <div class="notification-date">
                    ${new Date(notification.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('알림 로딩 실패:', error);
    }
}

function getNotificationMessage(notification) {
    switch (notification.type) {
        case 'comment':
            return `${notification.sender.username}님이 회원님의 게시글에 댓글을 남겼습니다.`;
        case 'reply':
            return `${notification.sender.username}님이 회원님의 댓글에 답글을 남겼습니다.`;
        default:
            return '새로운 알림이 있습니다.';
    }
}

async function markAsRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        loadNotifications();
    } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
    }
}

// 페이지 로드 시 알림 목록 불러오기
document.addEventListener('DOMContentLoaded', loadNotifications); 