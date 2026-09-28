const pool = require('../config/db');

const findUserByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

const findUserById = async (id) => {
    const [rows] = await pool.query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
};

const createUser = async (name, email, hashedPassword, role, phone) => {
    const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, phone]
    );
    return result.insertId;
};

module.exports = {
    findUserByEmail,
    findUserById,
    createUser
};
