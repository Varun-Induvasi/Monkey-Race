import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createUser, authenticateUser, getUserById, getGlobalLeaderboard, getUserHistory, getUserProfileDetails, updateAvatar, getRankBadge } from './services/userService.js';
import { setupSockets } from './socket.js';
import { getDb } from './db/connection.js';
const app = express();
const httpServer = createServer(app);
// Configure CORS
app.use(cors({
    origin: '*', // For local dev flexibility
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET || 'monkey-race-super-secret-key-12345';
// JWT authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token is invalid or expired' });
        }
        req.user = user;
        next();
    });
}
// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const userId = await createUser(username, email, password);
        const token = jwt.sign({ id: userId, email, username }, JWT_SECRET, { expiresIn: '7d' });
        // Get full user details
        const user = await getUserById(userId);
        res.status(201).json({ token, user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await authenticateUser(email, password);
        const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const rankInfo = getRankBadge(user.xp);
        res.json({ ...user, rankBadge: rankInfo.tier, rankColor: rankInfo.color });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- User Profile & Stats Routes ---
app.get('/api/users/:userId/profile', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const details = await getUserProfileDetails(userId);
        const rankInfo = getRankBadge(user.xp);
        res.json({
            user: {
                ...user,
                rankBadge: rankInfo.tier,
                rankColor: rankInfo.color
            },
            ...details
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/users/avatar', authenticateToken, async (req, res) => {
    const { avatar } = req.body;
    if (!avatar) {
        return res.status(400).json({ error: 'Avatar identifier is required' });
    }
    try {
        await updateAvatar(req.user.id, avatar);
        res.json({ success: true, message: 'Avatar updated successfully', avatar });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/users/:userId/history', async (req, res) => {
    const { userId } = req.params;
    try {
        const history = await getUserHistory(userId);
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Leaderboard Route ---
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaders = await getGlobalLeaderboard(15);
        const leadersWithRanks = leaders.map(leader => {
            const rankInfo = getRankBadge(leader.xp);
            return {
                ...leader,
                rankBadge: rankInfo.tier,
                rankColor: rankInfo.color
            };
        });
        res.json(leadersWithRanks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Setup WebSockets
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
setupSockets(io);
// Initialize DB and Start server
const PORT = process.env.PORT || 3001;
async function startServer() {
    try {
        // Ensure DB connection and tables exist before listening
        await getDb();
        console.log('Database initialized successfully.');
        httpServer.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error('Failed to initialize database or start server:', err);
        process.exit(1);
    }
}
startServer();
