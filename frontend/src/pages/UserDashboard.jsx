import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const UserDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await api.get('/bookings/mybookings');
                setBookings(res.data);
            } catch (err) {
                setError('Failed to load your bookings.');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-gray-600 mb-8">Track the status of your rental requests.</p>

            {bookings.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                        <i className="bi bi-calendar-x text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Booking Requests Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">You haven't requested to book any properties. Start exploring available homes now.</p>
                    <Link to="/" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-medium shadow-md transition-all hover:opacity-90 hover:-translate-y-1">
                        Explore Properties
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {bookings.map(booking => (
                        <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-shadow">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        <Link to={`/properties/${booking.property_id}`} className="hover:text-blue-600 transition-colors">
                                            {booking.property_title}
                                        </Link>
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                        ${booking.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'}`}>
                                        {booking.status}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm flex items-center"><i className="bi bi-geo-alt mr-2 text-gray-400"></i> {booking.property_location}</p>
                                <p className="text-gray-600 font-medium">Rent: <span className="text-blue-600">{booking.property_rent}/month</span></p>
                                <p className="text-xs text-gray-400">Requested on: {new Date(booking.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6">
                                {booking.status === 'approved' ? (
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                        <p className="text-xs font-bold text-green-800 uppercase mb-1">Owner Contact</p>
                                        <p className="font-semibold text-gray-900 flex items-center mb-1"><i className="bi bi-person-circle mr-2 text-green-600"></i> {booking.owner_name}</p>
                                        <p className="text-gray-600 flex items-center"><i className="bi bi-telephone mr-2 text-green-600"></i> {booking.owner_phone}</p>
                                    </div>
                                ) : booking.status === 'rejected' ? (
                                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center">
                                        <i className="bi bi-info-circle-fill mr-2"></i> This request was rejected by the owner.
                                    </div>
                                ) : (
                                    <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg flex items-center">
                                        <i className="bi bi-hourglass-split mr-2"></i> Waiting for owner approval.
                                        Contact details will be visible once approved.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
