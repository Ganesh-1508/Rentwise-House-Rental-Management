const pool = require('../config/db');

const createBooking = async (propertyId, userId) => {
    const [result] = await pool.query(
        'INSERT INTO bookings (property_id, user_id) VALUES (?, ?)',
        [propertyId, userId]
    );
    return result.insertId;
};

const getBookingsByOwnerId = async (ownerId) => {
    const [rows] = await pool.query(`
        SELECT b.*, p.title as property_title, u.name as user_name, u.phone as user_phone, u.email as user_email
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        JOIN users u ON b.user_id = u.id
        WHERE p.owner_id = ?
        ORDER BY b.created_at DESC
    `, [ownerId]);
    return rows;
};

const getBookingsByUserId = async (userId) => {
    const [rows] = await pool.query(`
        SELECT b.*, p.title as property_title, p.location as property_location, p.rent as property_rent,
        p.status as property_status, p.owner_id, 
        (SELECT u.phone FROM users u WHERE u.id = p.owner_id) as owner_phone,
        (SELECT u.name FROM users u WHERE u.id = p.owner_id) as owner_name
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `, [userId]);
    return rows;
};

const getBookingById = async (id) => {
    const [rows] = await pool.query(`
        SELECT b.*, p.owner_id 
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.id = ?
    `, [id]);
    return rows[0];
};

const updateBookingStatus = async (id, status) => {
    const [result] = await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
};

const checkExistingBooking = async (propertyId, userId) => {
    const [rows] = await pool.query(
        'SELECT id FROM bookings WHERE property_id = ? AND user_id = ? AND status != "rejected"',
        [propertyId, userId]
    );
    return rows.length > 0;
}

module.exports = {
    createBooking,
    getBookingsByOwnerId,
    getBookingsByUserId,
    getBookingById,
    updateBookingStatus,
    checkExistingBooking
};
