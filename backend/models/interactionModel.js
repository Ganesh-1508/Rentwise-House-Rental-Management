const pool = require('../config/db');

// Insert a new interaction
const logInteraction = async (userId, propertyId, actionType, metadata) => {
    // metadata is an object, stringify it before inserting
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    
    const [result] = await pool.query(
        'INSERT INTO interactions (user_id, property_id, action_type, metadata) VALUES (?, ?, ?, ?)',
        [userId, propertyId || null, actionType, metadataStr]
    );
    return result.insertId;
};

// Get recent interactions for a user to be fed into recommendation engine
const getUserInteractions = async (userId, limit = 50) => {
    const [rows] = await pool.query(
        'SELECT * FROM interactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
    );
    return rows;
};

module.exports = {
    logInteraction,
    getUserInteractions
};
