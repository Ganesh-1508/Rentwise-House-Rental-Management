const pool = require('../config/db');

// Add or update a review
const addReview = async (userId, propertyId, rating, comment) => {
    // Check if user already reviewed
    const [existing] = await pool.query('SELECT * FROM reviews WHERE user_id = ? AND property_id = ?', [userId, propertyId]);
    if (existing.length > 0) {
        // Update existing review
        const [result] = await pool.query(
            'UPDATE reviews SET rating = ?, comment = ? WHERE user_id = ? AND property_id = ?',
            [rating, comment || null, userId, propertyId]
        );
        return result.affectedRows;
    } else {
        // Insert new review
        const [result] = await pool.query(
            'INSERT INTO reviews (user_id, property_id, rating, comment) VALUES (?, ?, ?, ?)',
            [userId, propertyId, rating, comment || null]
        );
        return result.insertId;
    }
};

// Get reviews for a property
const getReviewsByProperty = async (propertyId) => {
    const [rows] = await pool.query(`
        SELECT r.*, u.name as user_name 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.property_id = ? 
        ORDER BY r.created_at DESC
    `, [propertyId]);
    return rows;
};

// Get average rating for a property
const getAverageRating = async (propertyId) => {
    const [rows] = await pool.query('SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE property_id = ?', [propertyId]);
    return {
        averageRating: rows[0].avg_rating ? parseFloat(rows[0].avg_rating).toFixed(1) : null,
        totalReviews: rows[0].total_reviews
    };
};

module.exports = { addReview, getReviewsByProperty, getAverageRating };
