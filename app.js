const ridesData = [
    {
        id: 'ola-prime',
        provider: 'Ola',
        brandClass: 'ola',
        name: 'Prime Sedan',
        icon: 'fa-solid fa-car',
        baseFare: 60,
        perKmRate: 22,
        type: 'car'
    },
    {
        id: 'ola-mini',
        provider: 'Ola',
        brandClass: 'ola',
        name: 'Mini',
        icon: 'fa-solid fa-car-side',
        baseFare: 50,
        perKmRate: 18,
        type: 'car'
    },
    {
        id: 'uber-go',
        provider: 'Uber',
        brandClass: 'uber',
        name: 'Uber Go',
        icon: 'fa-solid fa-car-side',
        baseFare: 45,
        perKmRate: 16,
        type: 'car'
    },
    {
        id: 'uber-auto',
        provider: 'Uber',
        brandClass: 'uber',
        name: 'Uber Auto',
        icon: 'fa-solid fa-car-burst', 
        baseFare: 30,
        perKmRate: 12,
        type: 'auto'
    },
    {
        id: 'namma-auto',
        provider: 'Namma Yatri',
        brandClass: 'auto',
        name: 'Auto Rickshaw',
        icon: 'fa-solid fa-taxi',
        baseFare: 25,
        perKmRate: 11,
        type: 'auto'
    },
    {
        id: 'rapido-bike',
        provider: 'Rapido',
        brandClass: 'rapido',
        name: 'Bike Taxi',
        icon: 'fa-solid fa-motorcycle',
        baseFare: 20,
        perKmRate: 8,
        type: 'bike'
    },
    {
        id: 'bmtc-vajra',
        provider: 'BMTC',
        brandClass: 'bmtc',
        name: 'Vajra AC Bus',
        icon: 'fa-solid fa-bus',
        baseFare: 15,
        perKmRate: 3,
        type: 'bus'
    }
];

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
            const payload = contentType.includes('application/json') ? await response.json() : {};
            if (!response.ok) {
                const msg = payload.message || `Request failed (${response.status})`;
                throw new Error(msg);
            }
            return payload;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Request failed');
}

function showToast(message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        container.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:1000;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const color = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6';
    toast.style.cssText = `background:rgba(2,6,23,.9);color:#fff;padding:10px 14px;border-radius:10px;border-left:3px solid ${color};font-size:.88rem;box-shadow:0 10px 24px rgba(0,0,0,.35);`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = localStorage.getItem('easyride_user');
    const profileLink = document.getElementById('profile-link');
    const userNameDom = document.getElementById('nav-user-name');
    const userStatusDom = document.getElementById('nav-user-status');

    if (loggedInUser) {
        const displayName = localStorage.getItem(`easyride_display_name_${loggedInUser}`) || loggedInUser;
        if (userNameDom) userNameDom.textContent = displayName;
        if (userStatusDom) userStatusDom.textContent = 'View Profile';
        if (profileLink) {
            profileLink.href = 'profile.html';
            profileLink.title = 'Open your profile';
        }
    } else if (profileLink) {
        profileLink.href = 'login.html';
        profileLink.title = 'Login or signup';
    }

    const searchForm = document.getElementById('search-form');
    const rentalForm = document.getElementById('rental-form');
    const modeRideBtn = document.getElementById('mode-ride-btn');
    const modeRentalBtn = document.getElementById('mode-rental-btn');
    const rentalTripName = document.getElementById('rental-trip-name');
    const rentalDate = document.getElementById('rental-date');
    const rentalTime = document.getElementById('rental-time');
    const rentalDuration = document.getElementById('rental-duration');
    const rentalVehicleType = document.getElementById('rental-vehicle-type');
    const rentalEstimatedCost = document.getElementById('rental-estimated-cost');
    const resultsPanel = document.getElementById('results-panel');
    const closeResultsBtn = document.getElementById('close-results');
    const resultsLoader = document.getElementById('results-loader');
    const ridesList = document.getElementById('rides-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // UI Elements for Map and Booking
    const mapViewSection = document.getElementById('map-view-section');
    const sidebar = document.querySelector('.sidebar');
    const searchSection = document.querySelector('.search-section');
    const activeBookingPanel = document.getElementById('active-booking-panel');
    const cancelBookingBtn = document.getElementById('cancel-booking');
    const rideTimeSelect = document.getElementById('ride-time');
    const trackDriverBtn = document.getElementById('track-driver-btn');
    const trackFabBtn = document.getElementById('track-fab-btn');
    const minimizeBookingPanelBtn = document.getElementById('minimize-booking-panel');
    const utilityPanel = document.getElementById('utility-panel');
    const utilityTitle = document.getElementById('utility-title');
    const utilityBody = document.getElementById('utility-body');
    const closeUtilityPanelBtn = document.getElementById('close-utility-panel');
    const navSaved = document.getElementById('nav-saved');
    const navHistory = document.getElementById('nav-history');
    const navSettings = document.getElementById('nav-settings');
    const navSearch = document.getElementById('nav-search');
    
    let currentSort = 'recommended';
    let searchMode = 'ride';
    let map;
    let routeLayer;
    let markers = [];
    let driverMarker = null;
    let driverRouteLine = null;
    let driverTrackingInterval = null;
    let currentDriverPos = null;
    let driverPathCoords = [];
    let driverPathIndex = 0;
    let followDriverCamera = true;
    let selectedRideForBooking = null;
    let hasStartedTrackingForCurrentRide = false;
    let hasRecordedRideHistory = false;
    let savedLocationsCache = [];

    // Initialize Leaflet Map
    function initMap() {
        if (!map) {
            // Bangalore coordinates
            map = L.map('map', { zoomControl: false }).setView([12.9716, 77.5946], 12);
            
            // CartoDB Positron - clean Google Maps-style tiles, no API key needed
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
        }
    }
    
    // Call initMap immediately
    setTimeout(initMap, 500);

    let pickupCoords = [12.9784, 77.6408]; // default Indiranagar
    let dropoffCoords = [12.9719, 77.6066]; // default MG road
    let currentDistanceKm = 5.0; // fallback
    let currentDurationMin = 15.0; // fallback
    const driverLocationText = document.getElementById('driver-location-text');
    const driverLiveStatus = document.getElementById('driver-live-status');
    
    function ensureLoggedIn() {
        if (loggedInUser) return true;
        showToast('Please login to use this feature', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 800);
        return false;
    }

    function setActiveNav(id) {
        document.querySelectorAll('.nav-links li').forEach((li) => li.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.closest('li')?.classList.add('active');
    }

    function openUtilityPanel(title, html) {
        utilityTitle.textContent = title;
        utilityBody.innerHTML = html;
        utilityPanel.classList.add('open');
    }

    function closeUtilityPanel() {
        utilityPanel.classList.remove('open');
    }

    function setSearchMode(mode) {
        searchMode = mode;
        const isRide = mode === 'ride';
        searchForm.classList.toggle('hidden', !isRide);
        rentalForm?.classList.toggle('hidden', isRide);
        modeRideBtn?.classList.toggle('active', isRide);
        modeRentalBtn?.classList.toggle('active', !isRide);
    }

    function calculateRentalCost() {
        const hours = Number(rentalDuration?.value || 2);
        const type = rentalVehicleType?.value || 'SUV';
        const baseByType = {
            'SUV': 650,
            'Sedan': 500,
            'Mini Bus': 1100
        };
        const base = baseByType[type] || 500;
        const estimated = Math.round(base * hours);
        if (rentalEstimatedCost) {
            rentalEstimatedCost.textContent = `Estimated Cost: ₹${estimated}`;
        }
        return estimated;
    }

    // Autocomplete function
    function setupAutocomplete(inputId, listId, isPickup) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        let timeout;
        let controller;
        let suggestions = [];
        let activeIndex = -1;
        let lastQuery = '';
        const fallbackPlaces = [
            { name: 'Indiranagar, Bangalore', lat: 12.9784, lon: 77.6408 },
            { name: 'MG Road, Bangalore', lat: 12.9756, lon: 77.6050 },
            { name: 'Koramangala, Bangalore', lat: 12.9352, lon: 77.6245 },
            { name: 'Whitefield, Bangalore', lat: 12.9698, lon: 77.7500 },
            { name: 'Electronic City, Bangalore', lat: 12.8399, lon: 77.6770 },
            { name: 'HSR Layout, Bangalore', lat: 12.9116, lon: 77.6474 },
            { name: 'Marathahalli, Bangalore', lat: 12.9591, lon: 77.6974 },
            { name: 'Yeshwanthpur, Bangalore', lat: 13.0285, lon: 77.5400 }
        ];

        function toSuggestionFormat(items) {
            return items.map((item) => ({
                display_name: item.name || item.display_name,
                lat: String(item.lat),
                lon: String(item.lon)
            }));
        }

        function getFallbackSuggestions(query) {
            const q = query.trim().toLowerCase();
            if (q.length < 1) return [];
            return toSuggestionFormat(
                fallbackPlaces.filter((place) => place.name.toLowerCase().includes(q)).slice(0, 6)
            );
        }

        function renderList(isLoading, errorMsg) {
            list.innerHTML = '';
            list.style.display = 'block';

            if (isLoading) {
                const li = document.createElement('li');
                li.className = 'muted';
                li.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
                list.appendChild(li);
                return;
            }

            if (errorMsg || suggestions.length === 0) {
                const li = document.createElement('li');
                li.className = 'muted';
                li.textContent = errorMsg || 'No matches';
                list.appendChild(li);
                return;
            }

            suggestions.forEach((item, index) => {
                const li = document.createElement('li');
                if (index === activeIndex) li.classList.add('active');
                
                const nameParts = item.display_name.split(',');
                const mainName = nameParts[0];
                
                li.innerHTML = `
                    <div class="suggest-main">${mainName}</div>
                    <div class="suggest-sub">${item.display_name}</div>
                `;
                
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectItem(item);
                });
                list.appendChild(li);
            });
            
            const footer = document.createElement('li');
            footer.className = 'footer-note';
            footer.textContent = 'Powered by OpenStreetMap Nominatim';
            list.appendChild(footer);
        }

        function selectItem(item) {
            input.value = item.display_name.split(',')[0];
            if (isPickup) {
                pickupCoords = [parseFloat(item.lat), parseFloat(item.lon)];
            } else {
                dropoffCoords = [parseFloat(item.lat), parseFloat(item.lon)];
            }
            list.style.display = 'none';
        }

        input.addEventListener('input', () => {
            clearTimeout(timeout);
            const query = input.value;
            activeIndex = -1;
            
            if (query.length < 2) {
                suggestions = [];
                list.style.display = 'none';
                return;
            }
            
            timeout = setTimeout(async () => {
                if (lastQuery === query.trim()) return;
                lastQuery = query.trim();
                
                if (controller) controller.abort();
                controller = new AbortController();
                
                renderList(true, null);
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`, { signal: controller.signal });
                    if (!response.ok) throw new Error('Search failed');
                    const data = await response.json();
                    const remote = data || [];
                    const local = getFallbackSuggestions(query);
                    suggestions = [...local, ...remote].slice(0, 8);
                    renderList(false, null);
                } catch(e) {
                    if (e.name !== 'AbortError') {
                        suggestions = getFallbackSuggestions(query);
                        renderList(false, suggestions.length ? null : (e.message || 'Failed to search'));
                    }
                }
            }, 350);
        });
        
        input.addEventListener('keydown', (e) => {
            if (list.style.display === 'none' || suggestions.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % suggestions.length;
                renderList(false, null);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
                renderList(false, null);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const idx = activeIndex >= 0 ? activeIndex : 0;
                if (suggestions[idx]) selectItem(suggestions[idx]);
            } else if (e.key === 'Escape') {
                list.style.display = 'none';
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (e.target !== input && !list.contains(e.target)) {
                list.style.display = 'none';
            }
        });
        
        input.addEventListener('focus', () => {
            if (suggestions.length > 0) {
                list.style.display = 'block';
            }
        });
    }

    setupAutocomplete('pickup', 'pickup-suggestions', true);
    setupAutocomplete('dropoff', 'dropoff-suggestions', false);

    // Dynamic Geocoding Helper
    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) throw new Error('Failed to geocode');
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Location not found: ' + query);
        const item = data[0];
        return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), label: item.display_name };
    }

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pickupStr = document.getElementById('pickup').value;
        const dropoffStr = document.getElementById('dropoff').value;
        if (!pickupStr || !dropoffStr) return;

        // Open panel and show loader
        resultsPanel.classList.add('open');
        ridesList.style.display = 'none';
        resultsLoader.style.display = 'flex';

        // Set Map Active (shows actual map, removes overlay text)
        mapViewSection.classList.add('map-active');
        
        try {
            // Guarantee actual ride locations exactly like the reference code
            const [a, b] = await Promise.all([geocodeAddress(pickupStr), geocodeAddress(dropoffStr)]);
            pickupCoords = [a.lat, a.lon];
            dropoffCoords = [b.lat, b.lon];
            
            // Cleanly format text back to input boxes
            const pickName = a.label.split(',')[0];
            const dropName = b.label.split(',')[0];
            if(pickName) document.getElementById('pickup').value = pickName;
            if(dropName) document.getElementById('dropoff').value = dropName;
        } catch (err) {
            console.warn("Geocode failed, using last known coordinates", err);
        }

        // Draw the route based on coordinates and get actual API distance/time
        const routeData = await drawSimulatedRoute();
        if (routeData) {
            currentDistanceKm = routeData.distance;
            currentDurationMin = routeData.duration;
        }

        resultsLoader.style.display = 'none';
        ridesList.style.display = 'flex';
        renderRides(currentSort);
    });

    rentalForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!ensureLoggedIn()) return;

        const tripName = rentalTripName?.value.trim();
        const dateValue = rentalDate?.value;
        const timeValue = rentalTime?.value;
        const durationHours = Number(rentalDuration?.value || 0);
        const vehicleType = rentalVehicleType?.value;
        const estimatedCost = calculateRentalCost();

        if (!tripName || !dateValue || !timeValue || !durationHours || !vehicleType) {
            showToast('Please fill all rental details', 'error');
            return;
        }

        try {
            await apiRequest('/api/rental-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loggedInUser,
                    tripName,
                    rentalDate: dateValue,
                    rentalTime: timeValue,
                    durationHours,
                    vehicleType,
                    estimatedCost
                })
            });
            showToast('Rental booked successfully', 'success');
            rentalForm.reset();
            calculateRentalCost();
        } catch (err) {
            showToast(err.message || 'Failed to book rental', 'error');
        }
    });

    closeResultsBtn.addEventListener('click', () => {
        resultsPanel.classList.remove('open');
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentSort = e.target.dataset.sort;
            
            // Add a small delay for visual feedback on sorting
            ridesList.style.opacity = '0.5';
            setTimeout(() => {
                renderRides(currentSort);
                ridesList.style.opacity = '1';
            }, 200);
        });
    });

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    function randomOffset(baseLat, baseLon, maxOffset = 0.02) {
        const latOffset = (Math.random() - 0.5) * maxOffset;
        const lonOffset = (Math.random() - 0.5) * maxOffset;
        return [baseLat + latOffset, baseLon + lonOffset];
    }

    function stopDriverTracking() {
        if (driverTrackingInterval) {
            clearInterval(driverTrackingInterval);
            driverTrackingInterval = null;
        }
        if (map && driverRouteLine) {
            map.removeLayer(driverRouteLine);
            driverRouteLine = null;
        }
        if (map && driverMarker) {
            map.removeLayer(driverMarker);
            driverMarker = null;
        }
        currentDriverPos = null;
        driverPathCoords = [];
        driverPathIndex = 0;
        followDriverCamera = true;
        hasStartedTrackingForCurrentRide = false;
        if (trackDriverBtn) {
            trackDriverBtn.disabled = false;
            trackDriverBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Track Driver';
        }
    }

    function updateDriverStatus(distanceKm, etaMins) {
        if (!driverLocationText || !driverLiveStatus) return;

        if (distanceKm <= 0.1) {
            driverLiveStatus.textContent = 'Arrived';
            driverLocationText.textContent = 'Driver has arrived at pickup point';
            document.getElementById('booking-eta').innerHTML = 'Driver has <span class="highlight">arrived</span>';
            return;
        }

        driverLiveStatus.textContent = 'Tracking...';
        driverLocationText.textContent = `Driver is ${distanceKm.toFixed(1)} km away from pickup`;
        document.getElementById('booking-eta').innerHTML = `Arriving in <span class="highlight">${Math.max(1, Math.round(etaMins))}</span> minutes`;
    }

    async function buildDriverRoute(start, end) {
        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
            const data = await response.json();
            if (data.routes && data.routes[0]?.geometry?.coordinates?.length) {
                return data.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
            }
        } catch (err) {
            console.warn('Driver route fetch failed, fallback to straight line', err);
        }
        return [start, end];
    }

    async function startDriverTracking(ride) {
        if (!map) return;
        stopDriverTracking();
        followDriverCamera = true;
        hasStartedTrackingForCurrentRide = true;
        if (trackDriverBtn) {
            trackDriverBtn.disabled = true;
            trackDriverBtn.innerHTML = '<i class="fa-solid fa-location-arrow"></i> Tracking Live';
        }

        const driverIcon = L.divIcon({
            html: '<div style="width:28px;height:28px;border-radius:50%;background:#10B981;display:flex;align-items:center;justify-content:center;color:#fff;border:3px solid #fff;box-shadow:0 0 16px rgba(16,185,129,0.55);"><i class="fa-solid fa-car-side" style="font-size:12px;"></i></div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        currentDriverPos = randomOffset(
            (pickupCoords[0] + dropoffCoords[0]) / 2,
            (pickupCoords[1] + dropoffCoords[1]) / 2,
            0.07
        );
        driverPathCoords = await buildDriverRoute(currentDriverPos, pickupCoords);
        driverPathIndex = 0;
        driverMarker = L.marker(currentDriverPos, { icon: driverIcon }).addTo(map).bindPopup(`${ride.provider} driver`);
        driverRouteLine = L.polyline(driverPathCoords, {
            color: '#10B981',
            weight: 4,
            opacity: 0.85,
            dashArray: '8 6'
        }).addTo(map);

        const bookingBounds = L.latLngBounds([pickupCoords, dropoffCoords, currentDriverPos]);
        map.fitBounds(bookingBounds, { padding: [60, 60] });
        setTimeout(() => {
            if (map && currentDriverPos) {
                map.setView(currentDriverPos, Math.max(map.getZoom(), 14), { animate: true, duration: 0.8 });
            }
        }, 500);

        driverTrackingInterval = setInterval(() => {
            if (!map || !currentDriverPos) return;

            const remainingMeters = map.distance(currentDriverPos, pickupCoords);
            const remainingKm = remainingMeters / 1000;
            const speedKmph = ride.type === 'bike' ? 26 : 22;
            const etaMins = (remainingKm / speedKmph) * 60;
            updateDriverStatus(remainingKm, etaMins);

            if (remainingMeters <= 120 || driverPathIndex >= driverPathCoords.length - 1) {
                currentDriverPos = [pickupCoords[0], pickupCoords[1]];
                driverMarker.setLatLng(currentDriverPos);
                driverRouteLine.setLatLngs([currentDriverPos, pickupCoords]);
                stopDriverTracking();
                updateDriverStatus(0, 0);
                return;
            }

            const nextIndex = Math.min(driverPathIndex + 1, driverPathCoords.length - 1);
            driverPathIndex = nextIndex;
            currentDriverPos = driverPathCoords[driverPathIndex];

            driverMarker.setLatLng(currentDriverPos);
            driverRouteLine.setLatLngs(driverPathCoords.slice(driverPathIndex));

            if (followDriverCamera && map) {
                const zoomLevel = Math.max(map.getZoom(), 15);
                map.panTo(currentDriverPos, { animate: true, duration: 0.7 });
                if (zoomLevel !== map.getZoom()) {
                    map.setZoom(zoomLevel, { animate: true });
                }
            }
        }, 700);
    }

    async function fetchSavedLocations() {
        if (!ensureLoggedIn()) return [];
        const data = await apiRequest(`/api/saved-locations?username=${encodeURIComponent(loggedInUser)}`);
        savedLocationsCache = data.locations || [];
        return savedLocationsCache;
    }

    async function renderSavedLocations() {
        setActiveNav('nav-saved');
        if (!ensureLoggedIn()) return;
        const locations = await fetchSavedLocations();
        const cards = locations.length
            ? locations.map((loc) => `
                <div class="utility-item">
                    <div>
                        <div class="utility-item-title">${loc.label}</div>
                        <div class="utility-item-sub">${loc.address}</div>
                    </div>
                    <button class="utility-danger-btn" data-delete-location="${loc.id}">Delete</button>
                </div>
            `).join('')
            : '<p class="utility-empty">No saved locations yet.</p>';
        openUtilityPanel('Saved Locations', `
            <form id="saved-location-form" class="utility-form">
                <input id="saved-label" placeholder="Label (Home, Office...)" required />
                <input id="saved-address" placeholder="Address" required />
                <button class="btn btn-primary" type="submit">Save Location</button>
            </form>
            <div class="utility-list">${cards}</div>
        `);

        const savedForm = document.getElementById('saved-location-form');
        savedForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const label = document.getElementById('saved-label').value.trim();
            const address = document.getElementById('saved-address').value.trim();
            if (!label || !address) return;
            try {
                await apiRequest('/api/saved-locations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loggedInUser, label, address })
                });
                showToast('Location saved', 'success');
                renderSavedLocations();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        utilityBody.querySelectorAll('[data-delete-location]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/saved-locations/${btn.dataset.deleteLocation}?username=${encodeURIComponent(loggedInUser)}`, {
                        method: 'DELETE'
                    });
                    showToast('Location removed', 'success');
                    renderSavedLocations();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }

    async function renderRideHistory() {
        setActiveNav('nav-history');
        if (!ensureLoggedIn()) return;
        const [rideData, rentalData] = await Promise.all([
            apiRequest(`/api/ride-history?username=${encodeURIComponent(loggedInUser)}`),
            apiRequest(`/api/rental-history?username=${encodeURIComponent(loggedInUser)}`)
        ]);
        const items = rideData.history || [];
        const rentals = rentalData.rentals || [];
        const rideRows = items.length
            ? items.map((ride) => `
                <div class="utility-item">
                    <div>
                        <div class="utility-item-title">${ride.provider} ${ride.vehicle}</div>
                        <div class="utility-item-sub">${ride.pickup} → ${ride.dropoff}</div>
                        <div class="utility-item-meta">${new Date(ride.booked_at).toLocaleString()} • ETA ${ride.eta_minutes} mins</div>
                    </div>
                    <div class="utility-price">₹${ride.fare}</div>
                </div>
            `).join('')
            : '<p class="utility-empty">No rides booked yet for this profile.</p>';
        const rentalRows = rentals.length
            ? rentals.map((rental) => `
                <div class="utility-item">
                    <div>
                        <div class="utility-item-title">${rental.trip_name} (${rental.vehicle_type})</div>
                        <div class="utility-item-sub">${rental.rental_date} at ${rental.rental_time} • ${rental.duration_hours} hrs</div>
                        <div class="utility-item-meta">${new Date(rental.booked_at).toLocaleString()}</div>
                    </div>
                    <div class="utility-price">₹${rental.estimated_cost}</div>
                </div>
            `).join('')
            : '<p class="utility-empty">No rental bookings yet.</p>';

        openUtilityPanel(
            'Ride History',
            `<h4 class="utility-subtitle">Rides</h4><div class="utility-list">${rideRows}</div>
             <h4 class="utility-subtitle">Rentals</h4><div class="utility-list">${rentalRows}</div>`
        );
    }

    async function renderSettings() {
        setActiveNav('nav-settings');
        if (!ensureLoggedIn()) return;
        const data = await apiRequest(`/api/settings?username=${encodeURIComponent(loggedInUser)}`);
        const settings = data.settings || { notificationsEnabled: true, preferredProvider: 'Any', theme: 'dark' };
        openUtilityPanel('Settings', `
            <form id="settings-form" class="utility-form">
                <label class="utility-label">
                    <span>Enable notifications</span>
                    <input id="setting-notifications" type="checkbox" ${settings.notificationsEnabled ? 'checked' : ''} />
                </label>
                <label class="utility-label">
                    <span>Preferred provider</span>
                    <select id="setting-provider">
                        <option ${settings.preferredProvider === 'Any' ? 'selected' : ''}>Any</option>
                        <option ${settings.preferredProvider === 'Uber' ? 'selected' : ''}>Uber</option>
                        <option ${settings.preferredProvider === 'Ola' ? 'selected' : ''}>Ola</option>
                        <option ${settings.preferredProvider === 'Rapido' ? 'selected' : ''}>Rapido</option>
                    </select>
                </label>
                <label class="utility-label">
                    <span>Theme</span>
                    <select id="setting-theme">
                        <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="deep-night" ${settings.theme === 'deep-night' ? 'selected' : ''}>Deep Night</option>
                        <option value="white" ${settings.theme === 'white' ? 'selected' : ''}>White</option>
                    </select>
                </label>
                <button class="btn btn-primary" type="submit">Save Settings</button>
                <button class="btn btn-outline" id="logout-btn" type="button">Logout</button>
            </form>
        `);

        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const notificationsEnabled = document.getElementById('setting-notifications').checked;
            const preferredProvider = document.getElementById('setting-provider').value;
            const theme = document.getElementById('setting-theme').value;
            try {
                await apiRequest('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loggedInUser, notificationsEnabled, preferredProvider, theme })
                });
                showToast('Settings updated', 'success');
                document.body.dataset.theme = theme;
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            localStorage.removeItem('easyride_user');
            window.location.href = 'login.html';
        });
    }

    async function addRideToHistory(ride) {
        if (!loggedInUser || !ride || hasRecordedRideHistory) return;
        hasRecordedRideHistory = true;
        try {
            await apiRequest('/api/ride-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loggedInUser,
                    pickup: document.getElementById('pickup').value,
                    dropoff: document.getElementById('dropoff').value,
                    rideTime: rideTimeSelect?.value || 'now',
                    provider: ride.provider,
                    vehicle: ride.name,
                    fare: ride.displayPrice,
                    etaMinutes: ride.etaMinutes
                })
            });
        } catch (err) {
            hasRecordedRideHistory = false;
        }
    }

    async function applySavedTheme() {
        if (!loggedInUser) return;
        try {
            const data = await apiRequest(`/api/settings?username=${encodeURIComponent(loggedInUser)}`);
            const theme = data.settings?.theme || 'dark';
            document.body.dataset.theme = theme;
        } catch (err) {
            document.body.dataset.theme = 'dark';
        }
    }

    function renderRides(sortMode) {
        ridesList.innerHTML = '';

        let processedRides = [...ridesData];

        // Apply dynamic pricing based on actual route distance
        processedRides = processedRides.map(ride => {
            // Price = baseFare + distance * perKmRate. Random variation +/- 5%
            const rawPrice = ride.baseFare + (currentDistanceKm * ride.perKmRate);
            const varPrice = rawPrice * (0.95 + Math.random() * 0.1); 
            
            // ETA = route duration + random driver distance (1 to 5 mins)
            let rawEta = Math.round((currentDurationMin * 0.1) + 1 + Math.random() * 4);
            if(rawEta < 1) rawEta = 1;

            return {
                ...ride,
                displayPrice: Math.round(varPrice),
                originalPrice: Math.round(varPrice * 1.15), // Show a fake 15% discount
                etaMinutes: rawEta,
            };
        });

        // Sorting Logic
        if (sortMode === 'price') {
            processedRides.sort((a, b) => a.displayPrice - b.displayPrice);
        } else if (sortMode === 'time') {
            processedRides.sort((a, b) => a.etaMinutes - b.etaMinutes);
        } else {
            // Recommended: mixture of acceptable time and decent price/comfort
            processedRides.sort((a, b) => {
                const scoreA = a.displayPrice * 0.4 + a.etaMinutes * 10;
                const scoreB = b.displayPrice * 0.4 + b.etaMinutes * 10;
                return scoreA - scoreB;
            });
        }

        // Find cheapest and fastest to tag them
        const cheapestPrice = Math.min(...processedRides.map(r => r.displayPrice));
        const fastestTime = Math.min(...processedRides.map(r => r.etaMinutes));

        processedRides.forEach((ride, index) => {
            let badgeHtml = '';
            if (ride.displayPrice === cheapestPrice && sortMode === 'price') {
                badgeHtml = `<div class="badge">Cheapest</div>`;
            } else if (ride.etaMinutes === fastestTime && sortMode === 'time') {
                badgeHtml = `<div class="badge fastest">Fastest</div>`;
            } else if (index === 0 && sortMode === 'recommended') {
                badgeHtml = `<div class="badge">Best Value</div>`;
            }

            const rideEl = document.createElement('div');
            // Stagger animation delay
            rideEl.style.animationDelay = `${index * 0.08}s`;
            rideEl.className = `ride-card ${ride.brandClass}`;
            
            rideEl.innerHTML = `
                ${badgeHtml}
                <div class="ride-logo-wrapper">
                    <i class="${ride.icon}"></i>
                </div>
                <div class="ride-details">
                    <div class="ride-title">
                        ${ride.provider} ${ride.name}
                    </div>
                    <div class="ride-eta">
                        <i class="fa-regular fa-clock"></i> ${ride.etaMinutes} min away
                        <span style="margin:0 4px">•</span>
                        <i class="fa-solid fa-user-group"></i> ${ride.type === 'bike' ? 1 : (ride.type === 'auto' ? 3 : 4)}
                    </div>
                </div>
                <div class="ride-price">
                    <div class="price-val">${formatCurrency(ride.displayPrice)}</div>
                    ${ride.originalPrice ? `<div class="price-strike">${formatCurrency(ride.originalPrice)}</div>` : ''}
                </div>
            `;
            
            // Booking should open on first ride tap.
            rideEl.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                // Optional visual centering.
                try {
                    ridesList.scrollTo({
                        left: rideEl.offsetLeft - ridesList.clientWidth / 2 + rideEl.offsetWidth / 2,
                        behavior: 'smooth'
                    });
                } catch (_err) {
                    // Non-critical.
                }

                // Update booking panel data.
                document.getElementById('booking-eta').innerHTML = `Arriving in <span class="highlight">${ride.etaMinutes}</span> minutes`;
                document.getElementById('booking-vehicle').textContent = `${ride.provider} ${ride.name}`;
                selectedRideForBooking = ride;
                hasStartedTrackingForCurrentRide = false;
                hasRecordedRideHistory = false;
                if (driverLiveStatus) driverLiveStatus.textContent = 'Tap Track';
                if (driverLocationText) driverLocationText.textContent = 'Click "Track Driver" to start live tracking';

                // Transition UI.
                resultsPanel.classList.remove('open');
                sidebar.classList.add('hidden-for-booking');
                searchSection.classList.add('hidden-for-booking');
                mapViewSection.classList.add('map-active');

                // Show driver module and track controls immediately.
                activeBookingPanel.classList.add('open');
                trackFabBtn?.classList.add('show');
                stopDriverTracking(); // keep tracking manual
                addRideToHistory(ride);

                if (map) {
                    map.invalidateSize();
                }
            });

            ridesList.appendChild(rideEl);
        });
        
        // Carousel initialization
        setTimeout(updateCarousel, 50);
    }
    
    async function drawSimulatedRoute() {
        if (!map) return null;
        
        // Clear previous
        if (routeLayer) map.removeLayer(routeLayer);
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        
        // Ensure coordinates are present
        const pickup = pickupCoords || [12.9784, 77.6408];
        const dropoff = dropoffCoords || [12.9719, 77.6066];
        
        // Custom simple pin icon
        const iconHtml = `<div style="background-color: var(--accent-primary); width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`;
        const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
        const dropIconHtml = `<div style="background-color: var(--accent-danger); width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`;
        const dropIcon = L.divIcon({ html: dropIconHtml, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });

        markers.push(L.marker(pickup, { icon: customIcon }).addTo(map).bindPopup('Pickup'));
        markers.push(L.marker(dropoff, { icon: dropIcon }).addTo(map).bindPopup('Drop'));
        
        try {
            // Fetch actual route from OSRM
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?overview=full&geometries=geojson`);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                routeLayer = L.polyline(coordinates, {
                    color: '#3B82F6', 
                    weight: 5, 
                    opacity: 0.9,
                    lineJoin: 'round'
                }).addTo(map);
                
                map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
                
                // Return exact distance in km and duration in min
                return {
                    distance: data.routes[0].distance / 1000,
                    duration: data.routes[0].duration / 60
                };
            } else {
                // Fallback to straight line if API fails
                routeLayer = L.polyline([pickup, dropoff], {
                    color: '#3B82F6', 
                    weight: 5, 
                    opacity: 0.9,
                    lineJoin: 'round'
                }).addTo(map);
            }
        } catch (error) {
            console.error('Error fetching route:', error);
            // Fallback to straight line
            routeLayer = L.polyline([pickup, dropoff], {
                color: '#3B82F6', 
                weight: 5, 
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(map);
        }
        
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
        
        // Approximate fallback measurement
        const approximateDistance = map.distance(pickup, dropoff) / 1000;
        return { distance: approximateDistance * 1.3, duration: approximateDistance * 4 }; // fallback
    }

    // Cancel Booking flow
    cancelBookingBtn.addEventListener('click', () => {
        stopDriverTracking();
        selectedRideForBooking = null;
        activeBookingPanel.classList.remove('open');
        trackFabBtn?.classList.remove('show');
        
        setTimeout(() => {
            sidebar.classList.remove('hidden-for-booking');
            searchSection.classList.remove('hidden-for-booking');
            // Show results again
            resultsPanel.classList.add('open');
            ridesList.scrollLeft = 0; // reset
            setTimeout(updateCarousel, 50);
        }, 400);
    });

    trackDriverBtn?.addEventListener('click', async () => {
        if (!selectedRideForBooking) {
            showToast('Please select a ride first', 'error');
            return;
        }
        if (hasStartedTrackingForCurrentRide) {
            activeBookingPanel.classList.add('open');
            return;
        }
        try {
            await startDriverTracking(selectedRideForBooking);
        } catch (err) {
            showToast('Unable to start tracking', 'error');
            stopDriverTracking();
        }
    });

    trackFabBtn?.addEventListener('click', () => {
        if (!selectedRideForBooking) {
            showToast('Please select a ride first', 'error');
            return;
        }
        activeBookingPanel.classList.add('open');
    });

    minimizeBookingPanelBtn?.addEventListener('click', () => {
        activeBookingPanel.classList.remove('open');
    });

    mapViewSection?.addEventListener('mousedown', () => {
        if (driverTrackingInterval) {
            followDriverCamera = false;
        }
    });

    navSaved?.addEventListener('click', (e) => {
        e.preventDefault();
        renderSavedLocations().catch((err) => showToast(err.message, 'error'));
    });
    navHistory?.addEventListener('click', (e) => {
        e.preventDefault();
        renderRideHistory().catch((err) => showToast(err.message, 'error'));
    });
    navSettings?.addEventListener('click', (e) => {
        e.preventDefault();
        renderSettings().catch((err) => showToast(err.message, 'error'));
    });
    navSearch?.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveNav('nav-search');
        closeUtilityPanel();
    });
    closeUtilityPanelBtn?.addEventListener('click', closeUtilityPanel);
    modeRideBtn?.addEventListener('click', () => setSearchMode('ride'));
    modeRentalBtn?.addEventListener('click', () => setSearchMode('rental'));
    rentalDuration?.addEventListener('change', calculateRentalCost);
    rentalVehicleType?.addEventListener('change', calculateRentalCost);
    setSearchMode('ride');
    calculateRentalCost();
    applySavedTheme();

    function updateCarousel() {
        if (!ridesList.offsetParent) return; // Panel not visible
        
        const scrollCenter = ridesList.scrollLeft + ridesList.clientWidth / 2;
        const maxOffset = ridesList.clientWidth / 2;

        document.querySelectorAll('.ride-card').forEach(card => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            const offset = cardCenter - scrollCenter;
            
            let percentage = offset / maxOffset;
            percentage = Math.max(-1, Math.min(1, percentage));
            
            const rotationY = percentage * 45; 
            const scale = 1 - Math.abs(percentage) * 0.15; 
            const translateZ = Math.abs(percentage) * -300; 
            
            const zIndex = 100 - Math.abs(Math.round(percentage * 100));
            const opacity = Math.max(0.3, 1 - Math.abs(percentage) * 0.8);
            
            // Remove CSS hover transform overrides by applying inline styles thoroughly
            card.style.transform = `perspective(1200px) translateZ(${translateZ}px) rotateY(${rotationY}deg) scale(${scale})`;
            card.style.opacity = opacity;
            card.style.zIndex = zIndex;
            
            if (Math.abs(percentage) < 0.15) {
                card.style.borderColor = 'var(--accent-primary)';
                card.style.background = 'rgba(30, 41, 59, 0.9)';
            } else {
                card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                card.style.background = 'rgba(15, 23, 42, 0.7)';
            }
        });
    }

    ridesList.addEventListener('scroll', () => {
        requestAnimationFrame(updateCarousel);
    });
    
    window.addEventListener('resize', () => {
        if (resultsPanel.classList.contains('open')) {
            requestAnimationFrame(updateCarousel);
        }
    });
});