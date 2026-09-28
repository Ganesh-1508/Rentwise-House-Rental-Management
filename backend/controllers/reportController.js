const pool = require('../config/db');

// @desc    Get owner dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Owner only)
const getDashboardStats = async (req, res, next) => {
    try {
        const ownerId = req.user.id;

        // Total Properties
        const [propResult] = await pool.query('SELECT COUNT(*) as total FROM properties WHERE owner_id = ?', [ownerId]);
        const totalProperties = propResult[0].total;

        // Total Booking Requests
        const [reqResult] = await pool.query(`
            SELECT COUNT(*) as total FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.owner_id = ?
        `, [ownerId]);
        const totalBookingRequests = reqResult[0].total;

        // Total Approved Bookings
        const [approvedResult] = await pool.query(`
            SELECT COUNT(*) as total FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.owner_id = ? AND b.status = 'approved'
        `, [ownerId]);
        const totalApprovedBookings = approvedResult[0].total;

        // Monthly Income (Sum of rent for approved bookings in current month)
        // For simplicity, we assume an approved booking means rent is paid this month.
        // In a real app, this would be tied to a payments table.
        const [incomeResult] = await pool.query(`
            SELECT SUM(p.rent) as totalIncome FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.owner_id = ? AND b.status = 'approved'
            AND MONTH(b.created_at) = MONTH(CURRENT_DATE())
            AND YEAR(b.created_at) = YEAR(CURRENT_DATE())
        `, [ownerId]);
        const monthlyIncome = incomeResult[0].totalIncome || 0;

        // Property Status Breakdown (available vs booked)
        const [statusResult] = await pool.query(`
            SELECT status, COUNT(*) as count FROM properties
            WHERE owner_id = ?
            GROUP BY status
        `, [ownerId]);
        let availableCount = 0;
        let bookedCount = 0;
        statusResult.forEach(row => {
            if (row.status === 'available') availableCount = row.count;
            if (row.status === 'booked') bookedCount = row.count;
        });

        res.json({
            totalProperties,
            totalBookingRequests,
            totalApprovedBookings,
            monthlyIncome,
            propertyStatus: {
                available: availableCount,
                booked: bookedCount
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
