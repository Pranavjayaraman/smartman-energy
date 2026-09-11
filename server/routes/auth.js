const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAsync, allAsync, runAsync } = require('../db');
const { JWT_SECRET, authenticateToken, authorizeRoles } = require('../middleware/auth');
const { loginRateLimiter, logSecurityEvent } = require('../middleware/security');

const router = express.Router();

// Login with rate-limiting and security logging
router.post('/login', loginRateLimiter(15, 5 * 60 * 1000), async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      await logSecurityEvent(username, 'FAILED_LOGIN', 'AUTH', username, 'Login failed: Username does not exist');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await logSecurityEvent(username, 'FAILED_LOGIN', 'AUTH', username, 'Login failed: Invalid credentials');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const assignedAreas = JSON.parse(user.assigned_areas || '[]');
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        assigned_areas: assignedAreas
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log successful login
    await runAsync(
      'INSERT INTO audit_logs (username, action, entity_type, entity_id, notes) VALUES (?, ?, ?, ?, ?)',
      [user.username, 'LOGIN_SUCCESS', 'AUTH', user.username, `Worker logged into ${user.role} role`]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        assigned_areas: assignedAreas
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// List Users (Admin only)
router.get('/users', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const users = await allAsync('SELECT id, username, name, role, assigned_areas, created_at FROM users');
    const formatted = users.map(u => ({
      ...u,
      assigned_areas: JSON.parse(u.assigned_areas || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update User (Admin only)
router.put('/users/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const { name, role, assigned_areas, password } = req.body;
    const userId = req.params.id;

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await runAsync(
        'UPDATE users SET name = ?, role = ?, assigned_areas = ?, password_hash = ? WHERE id = ?',
        [name, role, JSON.stringify(assigned_areas), hash, userId]
      );
    } else {
      await runAsync(
        'UPDATE users SET name = ?, role = ?, assigned_areas = ? WHERE id = ?',
        [name, role, JSON.stringify(assigned_areas), userId]
      );
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
