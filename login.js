const flipCard = document.getElementById('flip-card');
const loginTriggers = document.querySelectorAll('.login-trigger');
const registerTriggers = document.querySelectorAll('.register-trigger');
const loginForm = document.getElementById('form-login');
const registerForm = document.getElementById('form-register');

const API_BASE_CANDIDATES = (() => {
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    const currentOrigin = window.location.origin;
    if (!isHttp) return ['http://localhost:3000'];
    if (window.location.port === '3000') return [currentOrigin];
    return [currentOrigin, 'http://localhost:3000'];
})();

// Toggle Flip Card Animation
registerTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        flipCard.classList.add('flipped');
    });
});

loginTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        flipCard.classList.remove('flipped');
    });
});

// Toast Notification System (replaces native alerts)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if(type === 'success') iconClass = 'fa-check-circle';
    if(type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : '#3B82F6')}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function setLoading(button, isLoading, text, iconClass) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Processing...</span>`;
    } else {
        button.disabled = false;
        button.innerHTML = `<span>${text}</span> <i class="fa-solid ${iconClass}"></i>`;
    }
}

function buildApiUrl(path) {
    return path;
}

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    return {
        success: false,
        message: text || 'Unexpected server response'
    };
}

async function apiRequest(path, options = {}) {
    let lastError = null;
    for (const base of API_BASE_CANDIDATES) {
        try {
            const response = await fetch(`${base}${buildApiUrl(path)}`, options);
            const data = await parseApiResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.message || `Request failed (${response.status})`);
            }
            return data;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Request failed');
}

// Authentication Logic
if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim();
        const passwordInput = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('.btn-submit');

        if (!usernameInput || !passwordInput) {
            showToast('Please enter username and password', 'error');
            return;
        }

        setLoading(btn, true, 'Sign In', 'fa-arrow-right-to-bracket');

        try {
            const data = await apiRequest('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });
            
            showToast('Login successful! Redirecting...', 'success');
            localStorage.setItem('easyride_user', usernameInput);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Server connection error. Ensure the Node server is running.', 'error');
            setLoading(btn, false, 'Sign In', 'fa-arrow-right-to-bracket');
        }
    });
}

if(registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('signup-username').value.trim();
        const emailInput = document.getElementById('signup-email').value.trim().toLowerCase();
        const passwordInput = document.getElementById('signup-password').value;
        const btn = registerForm.querySelector('.btn-submit');

        if (usernameInput.length < 3) {
            showToast('Username must be at least 3 characters', 'error');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(emailInput)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        if (passwordInput.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        setLoading(btn, true, 'Sign Up', 'fa-user-plus');

        try {
            await apiRequest('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, email: emailInput, password: passwordInput })
            });

            showToast('Account created! You can now sign in.', 'success');
            localStorage.setItem(`easyride_email_${usernameInput}`, emailInput);
            registerForm.reset();
            setTimeout(() => {
                flipCard.classList.remove('flipped');
                document.getElementById('login-username').value = usernameInput;
                document.getElementById('login-password').focus();
            }, 1200);
            setLoading(btn, false, 'Sign Up', 'fa-user-plus');
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Server connection error. Ensure the Node server is running.', 'error');
            setLoading(btn, false, 'Sign Up', 'fa-user-plus');
        }
    });
}