import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
    const { user } = useContext(AuthContext);

    if (!user) return null;

    const ownerLinks = [
        { path: '/owner/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' },
        { path: '/owner/properties', name: 'Properties', icon: 'bi-house-door' },
        { path: '/owner/bookings', name: 'Bookings', icon: 'bi-calendar-check' },
        { path: '/favourites', name: 'Favourites', icon: 'bi-heart' },
    ];

    const userLinks = [
        { path: '/', name: 'Explore', icon: 'bi-search' },
        { path: '/my-bookings', name: 'My Bookings', icon: 'bi-calendar-event' },
        { path: '/favourites', name: 'Favourites', icon: 'bi-heart' },
    ];

    const links = user.role === 'Owner' ? ownerLinks : userLinks;

    return (
        <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col transition-all duration-300">
            <div className="p-6">
                <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    HouseRent
                </h2>
                <p className="text-sm text-gray-400 mt-1">{user.role} Panel</p>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        <i className={`bi ${link.icon} text-lg`}></i>
                        <span className="font-medium">{link.name}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
