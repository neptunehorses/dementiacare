class Auth {
    static async register(username, password, email) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });
            
            if (!response.ok) {
                throw new Error('회원가입에 실패했습니다.');
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    }
    
    static async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                throw new Error('로그인에 실패했습니다.');
            }
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            return data;
        } catch (error) {
            throw error;
        }
    }
    
    static logout() {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
    
    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }
    
    static getToken() {
        return localStorage.getItem('token');
    }
} 