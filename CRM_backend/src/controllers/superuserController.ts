import superuser_db from '../../config/dbcon';
import cryptoModule2 from 'crypto';

// Hash password function
const hashPassword2 = (password: string) => {
  return cryptoModule2.createHash('sha256').update(password).digest('hex');
};

export const getAllSuperusers = async (req: any, res: any) => {
  try {
    const result = await superuser_db.query('SELECT superuser_id, center_id, username, email, first_name, last_name, `role`, status, last_login, created_at, updated_at FROM superusers ORDER BY superuser_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superusers', details: error.message || error.toString() });
  }
};

export const getSuperuserById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await superuser_db.query('SELECT superuser_id, center_id, username, email, first_name, last_name, `role`, permissions, status, last_login, created_at, updated_at FROM superusers WHERE superuser_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superuser', details: error.message || error.toString() });
  }
};

export const createSuperuser = async (req: any, res: any) => {
  try {
    let { center_id, username, email, password, first_name, last_name, role, permissions, status } = req.body;
    
    // If center_id is not provided, get the first available center
    if (!center_id) {
      const centerResult = await superuser_db.query('SELECT center_id FROM edu_centers LIMIT 1');
      if (centerResult.rows.length === 0) {
        return res.status(400).json({ error: 'No centers available. Please create a center first.' });
      }
      center_id = centerResult.rows[0].center_id;
    }
    
    // Check if username already exists
    const existing = await superuser_db.query('SELECT superuser_id FROM superusers WHERE username = ?', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Store password as plain text without encryption
    // Normalize status to match enum values (Active, Inactive, Suspended)
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Active';
    const serializedPermissions = JSON.stringify(permissions ?? {});
    const result = await superuser_db.query(
      'INSERT INTO superusers (center_id, username, email, password_hash, first_name, last_name, `role`, permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [center_id, username, email, password, first_name, last_name, role || 'Admin', serializedPermissions, normalizedStatus]
    );
    const created = await superuser_db.query(
      'SELECT superuser_id, center_id, username, email, first_name, last_name, `role`, status, created_at FROM superusers WHERE superuser_id = ?',
      [result.insertId]
    );
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create superuser', details: error.message || error.toString() });
  }
};

export const updateSuperuser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, role, permissions, status } = req.body;
    // Normalize status to match enum values (Active, Inactive, Suspended)
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : null;
    const existing = await superuser_db.query('SELECT superuser_id FROM superusers WHERE superuser_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    const serializedPermissions = permissions === undefined || permissions === null ? null : JSON.stringify(permissions);
    await superuser_db.query(
      'UPDATE superusers SET email = COALESCE(?, email), first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), `role` = COALESCE(?, `role`), permissions = COALESCE(?, permissions), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE superuser_id = ?',
      [email, first_name, last_name, role, serializedPermissions, normalizedStatus, id]
    );
    const updated = await superuser_db.query(
      'SELECT superuser_id, center_id, username, email, first_name, last_name, `role`, status, updated_at FROM superusers WHERE superuser_id = ?',
      [id]
    );
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update superuser', details: error.message || error.toString() });
  }
};

export const deleteSuperuser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await superuser_db.query('SELECT superuser_id, username, email FROM superusers WHERE superuser_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    await superuser_db.query('DELETE FROM superusers WHERE superuser_id = ?', [id]);
    res.json({ message: 'Superuser deleted successfully', superuser: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete superuser', details: error.message || error.toString() });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await superuser_db.query('SELECT superuser_id, username, email, first_name, last_name, `role`, password_hash, status, is_locked FROM superusers WHERE username = ?', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No superuser found with the provided username' });
    }

    const superuser = result.rows[0];

    if (superuser.is_locked) {
      return res.status(403).json({ error: 'Account is locked' });
    }

    if (superuser.status !== 'Active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const password_hash = password;
    if (password_hash !== superuser.password_hash) {
      // Update login attempts
      await superuser_db.query('UPDATE superusers SET login_attempts = login_attempts + 1 WHERE superuser_id = ?', [superuser.superuser_id]);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Reset login attempts on successful login
    await superuser_db.query('UPDATE superusers SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE superuser_id = ?', [superuser.superuser_id]);
    
    res.json({
      message: 'Login successful',
      superuser: {
        superuser_id: superuser.superuser_id,
        username: superuser.username,
        email: superuser.email,
        first_name: superuser.first_name,
        last_name: superuser.last_name,
        role: superuser.role
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

export const changePassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await superuser_db.query('SELECT password_hash FROM superusers WHERE superuser_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }

    const old_hash = old_password;
    if (old_hash !== result.rows[0].password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = new_password;
    await superuser_db.query('UPDATE superusers SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE superuser_id = ?', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};
