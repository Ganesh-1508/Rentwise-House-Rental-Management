const pool = require('../config/db');

const addFavourite = async (userId, propertyId) => {
    try {
        const [result] = await pool.query(
            'INSERT IGNORE INTO favourites (user_id, property_id) VALUES (?, ?)',
            [userId, propertyId]
        );
        return result.affectedRows > 0; // true if added, false if already exists
    } catch (error) {
        throw error;
    }
};

const removeFavourite = async (userId, propertyId) => {
    const [result] = await pool.query(
        'DELETE FROM favourites WHERE user_id = ? AND property_id = ?',
        [userId, propertyId]
    );
    return result.affectedRows > 0;
};

const getUserFavourites = async (userId) => {
    const [rows] = await pool.query(`
        SELECT f.id as favourite_id, p.* 
        FROM favourites f
        JOIN properties p ON f.property_id = p.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    `, [userId]);
    return rows;
};

module.exports = {
    addFavourite,
    removeFavourite,
    getUserFavourites
};
