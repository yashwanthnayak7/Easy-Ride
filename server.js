const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'users.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS saved_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            label TEXT NOT NULL,
            address TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS ride_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            pickup TEXT NOT NULL,
            dropoff TEXT NOT NULL,
            provider TEXT NOT NULL,
            vehicle TEXT NOT NULL,
            fare INTEGER NOT NULL,
            eta_minutes INTEGER NOT NULL,
            booked_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS user_settings (
            username TEXT PRIMARY KEY,
            notifications_enabled INTEGER DEFAULT 1,
            preferred_provider TEXT DEFAULT 'Any',
            theme TEXT DEFAULT 'dark'
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS rental_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            trip_name TEXT NOT NULL,
            rental_date TEXT NOT NULL,
            rental_time TEXT NOT NULL,
            duration_hours INTEGER NOT NULL,
            vehicle_type TEXT NOT NULL,
            estimated_cost INTEGER NOT NULL,
            booked_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function runCallback(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function requireUsername(req, res) {
    const username = (req.query.username || req.body.username || '').trim();
    if (!username) {
        res.status(400).json({ success: false, message: 'Username is required' });
        return null;
    }
    return username;
}

app.post('/api/signup', (req, res) => {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], (emailErr, existingEmail) => {
        if (emailErr) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.run(sql, [username, email, password], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ success: false, message: 'Username already exists' });
                }
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, message: 'User registered successfully' });
        });
    });
});

app.post('/api/login', (req, res) => {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const sql = 'SELECT username FROM users WHERE username = ? AND password = ?';
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (row) {
            res.json({ success: true, username: row.username });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    });
});

app.get('/api/profile/:username', async (req, res) => {
    const username = (req.params.username || '').trim();
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }

    try {
        const user = await get('SELECT username, email FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        res.json({ success: true, profile: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/saved-locations', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    try {
        const rows = await all(
            'SELECT id, label, address, created_at FROM saved_locations WHERE username = ? ORDER BY id DESC',
            [username]
        );
        res.json({ success: true, locations: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/api/saved-locations', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    const label = (req.body.label || '').trim();
    const address = (req.body.address || '').trim();

    if (!label || !address) {
        return res.status(400).json({ success: false, message: 'Label and address are required' });
    }
    try {
        const result = await run(
            'INSERT INTO saved_locations (username, label, address) VALUES (?, ?, ?)',
            [username, label, address]
        );
        const row = await get('SELECT id, label, address, created_at FROM saved_locations WHERE id = ?', [result.lastID]);
        res.json({ success: true, location: row });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.delete('/api/saved-locations/:id', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid location id' });
    try {
        const result = await run('DELETE FROM saved_locations WHERE id = ? AND username = ?', [id, username]);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/ride-history', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    try {
        const rows = await all(
            `SELECT id, pickup, dropoff, provider, vehicle, fare, eta_minutes, booked_at
             FROM ride_history WHERE username = ? ORDER BY id DESC`,
            [username]
        );
        res.json({ success: true, history: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/api/ride-history', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;

    const pickup = (req.body.pickup || '').trim();
    const dropoff = (req.body.dropoff || '').trim();
    const provider = (req.body.provider || '').trim();
    const vehicle = (req.body.vehicle || '').trim();
    const fare = Number(req.body.fare || 0);
    const etaMinutes = Number(req.body.etaMinutes || 0);

    if (!pickup || !dropoff || !provider || !vehicle || !fare || !etaMinutes) {
        return res.status(400).json({ success: false, message: 'Incomplete ride details' });
    }

    try {
        await run(
            `INSERT INTO ride_history (username, pickup, dropoff, provider, vehicle, fare, eta_minutes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, pickup, dropoff, provider, vehicle, fare, etaMinutes]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/rental-history', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    try {
        const rows = await all(
            `SELECT id, trip_name, rental_date, rental_time, duration_hours, vehicle_type, estimated_cost, booked_at
             FROM rental_history WHERE username = ? ORDER BY id DESC`,
            [username]
        );
        res.json({ success: true, rentals: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/api/rental-history', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;

    const tripName = (req.body.tripName || '').trim();
    const rentalDate = (req.body.rentalDate || '').trim();
    const rentalTime = (req.body.rentalTime || '').trim();
    const durationHours = Number(req.body.durationHours || 0);
    const vehicleType = (req.body.vehicleType || '').trim();
    const estimatedCost = Number(req.body.estimatedCost || 0);

    if (!tripName || !rentalDate || !rentalTime || !durationHours || !vehicleType || !estimatedCost) {
        return res.status(400).json({ success: false, message: 'Incomplete rental details' });
    }

    try {
        await run(
            `INSERT INTO rental_history
             (username, trip_name, rental_date, rental_time, duration_hours, vehicle_type, estimated_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, tripName, rentalDate, rentalTime, durationHours, vehicleType, estimatedCost]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/settings', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;
    try {
        const defaults = {
            notificationsEnabled: true,
            preferredProvider: 'Any',
            theme: 'dark'
        };
        const row = await get(
            'SELECT notifications_enabled, preferred_provider, theme FROM user_settings WHERE username = ?',
            [username]
        );
        if (!row) return res.json({ success: true, settings: defaults });
        res.json({
            success: true,
            settings: {
                notificationsEnabled: !!row.notifications_enabled,
                preferredProvider: row.preferred_provider || 'Any',
                theme: row.theme || 'dark'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.put('/api/settings', async (req, res) => {
    const username = requireUsername(req, res);
    if (!username) return;

    const notificationsEnabled = req.body.notificationsEnabled ? 1 : 0;
    const preferredProvider = (req.body.preferredProvider || 'Any').trim();
    const theme = (req.body.theme || 'dark').trim();

    try {
        await run(
            `INSERT INTO user_settings (username, notifications_enabled, preferred_provider, theme)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(username) DO UPDATE SET
                 notifications_enabled=excluded.notifications_enabled,
                 preferred_provider=excluded.preferred_provider,
                 theme=excluded.theme`,
            [username, notificationsEnabled, preferredProvider, theme]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
