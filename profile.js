const API_BASE_CANDIDATES = (() => {
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    const currentOrigin = window.location.origin;
    if (!isHttp) return ['http://localhost:3000'];
    if (window.location.port === '3000') return [currentOrigin];
    return [currentOrigin, 'http://localhost:3000'];
})();

function buildApiUrl(path, baseUrl) {
    return `${baseUrl}${path}`;
}

async function apiRequest(path, options = {}) {
    let lastError = null;
    for (const base of API_BASE_CANDIDATES) {
        try {
            const response = await fetch(buildApiUrl(path, base), options);
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : {};
            if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
            return data;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Request failed');
}

document.addEventListener('DOMContentLoaded', async () => {
    const username = localStorage.getItem('easyride_user');
    if (!username) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('profile-username').textContent = username;

    try {
        const [profileRes, savedRes, historyRes, rentalRes, settingsRes] = await Promise.all([
            apiRequest(`/api/profile/${encodeURIComponent(username)}`),
            apiRequest(`/api/saved-locations?username=${encodeURIComponent(username)}`),
            apiRequest(`/api/ride-history?username=${encodeURIComponent(username)}`),
            apiRequest(`/api/rental-history?username=${encodeURIComponent(username)}`),
            apiRequest(`/api/settings?username=${encodeURIComponent(username)}`)
        ]);

        document.getElementById('profile-email').textContent = profileRes.profile?.email || 'Not available';
        document.getElementById('stat-saved').textContent = String(savedRes.locations?.length || 0);
        document.getElementById('stat-rides').textContent = String(historyRes.history?.length || 0);
        document.getElementById('stat-rentals').textContent = String(rentalRes.rentals?.length || 0);
        document.body.dataset.theme = settingsRes.settings?.theme || 'dark';

        const rentalListEl = document.getElementById('profile-rental-list');
        const rentals = rentalRes.rentals || [];
        if (rentalListEl) {
            rentalListEl.innerHTML = rentals.length
                ? rentals.slice(0, 5).map((rental) => `
                    <div class="profile-rental-item">
                        <strong>${rental.trip_name} (${rental.vehicle_type})</strong>
                        <div class="profile-rental-meta">${rental.rental_date} ${rental.rental_time} • ${rental.duration_hours} hrs • ₹${rental.estimated_cost}</div>
                    </div>
                `).join('')
                : '<div class="profile-rental-meta">No rental bookings yet.</div>';
        }
    } catch (err) {
        document.getElementById('profile-email').textContent = 'Unable to load profile';
    }

    const profileKey = `easyride_profile_${username}`;
    const savedProfile = JSON.parse(localStorage.getItem(profileKey) || '{}');
    document.getElementById('display-name').value = savedProfile.displayName || '';
    document.getElementById('phone-number').value = savedProfile.phone || '';
    document.getElementById('bio').value = savedProfile.bio || '';

    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            displayName: document.getElementById('display-name').value.trim(),
            phone: document.getElementById('phone-number').value.trim(),
            bio: document.getElementById('bio').value.trim()
        };
        localStorage.setItem(profileKey, JSON.stringify(payload));
        if (payload.displayName) {
            localStorage.setItem(`easyride_display_name_${username}`, payload.displayName);
        }
        alert('Profile updated successfully');
    });

    document.getElementById('profile-logout').addEventListener('click', () => {
        localStorage.removeItem('easyride_user');
        window.location.href = 'login.html';
    });
});
