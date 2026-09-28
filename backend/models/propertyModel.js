const pool = require('../config/db');

const createProperty = async (ownerId, title, description, rent, deposit, location, type, images, compatibility_metadata = null) => {
    const [result] = await pool.query(
        'INSERT INTO properties (owner_id, title, description, rent, deposit, location, type, images, compatibility_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ownerId, title, description, rent, deposit, location, type, JSON.stringify(images), compatibility_metadata]
    );
    return result.insertId;
};

const updateProperty = async (id, ownerId, title, description, rent, deposit, location, type, images, compatibility_metadata = null) => {
    let query = 'UPDATE properties SET title = ?, description = ?, rent = ?, deposit = ?, location = ?, type = ?';
    let values = [title, description, rent, deposit, location, type];

    if (compatibility_metadata !== undefined && compatibility_metadata !== null) {
        query += ', compatibility_metadata = ?';
        values.push(compatibility_metadata);
    }

    if (images && images.length > 0) {
        query += ', images = ?';
        values.push(JSON.stringify(images));
    }

    query += ' WHERE id = ? AND owner_id = ?';
    values.push(id, ownerId);

    const [result] = await pool.query(query, values);
    return result.affectedRows;
};

const deleteProperty = async (id, ownerId) => {
    const [result] = await pool.query('DELETE FROM properties WHERE id = ? AND owner_id = ?', [id, ownerId]);
    return result.affectedRows;
};

const getPropertyById = async (id) => {
    const [rows] = await pool.query(
        'SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = ?',
        [id]
    );
    return rows[0];
};

const getAllProperties = async (filters) => {
    let query = `
        SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_reviews
        FROM properties p 
        JOIN users u ON p.owner_id = u.id 
        LEFT JOIN reviews r ON p.id = r.property_id
        WHERE 1=1
    `;
    let values = [];

    if (filters.location) {
        query += ' AND p.location LIKE ?';
        values.push(`%${filters.location}%`);
    }
    if (filters.type) {
        query += ' AND p.type = ?';
        values.push(filters.type);
    }
    if (filters.maxRent) {
        query += ' AND p.rent <= ?';
        values.push(filters.maxRent);
    }
    if (filters.ownerId) {
        query += ' AND p.owner_id = ?';
        values.push(filters.ownerId);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [rows] = await pool.query(query, values);
    return rows;
};

const updatePropertyStatus = async (id, status) => {
    const [result] = await pool.query('UPDATE properties SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
};

module.exports = {
    createProperty,
    updateProperty,
    deleteProperty,
    getPropertyById,
    getAllProperties,
    updatePropertyStatus
};
