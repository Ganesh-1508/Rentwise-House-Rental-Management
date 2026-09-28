import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { calculateProfessionMatch } from '../utils/professionMatch';

const Home = () => {
    const { user } = useContext(AuthContext);
    const [recommended, setRecommended] = useState([]);
    const [recLoading, setRecLoading] = useState(true);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ location: '', type: '', maxRent: '' });
    const [viewMode, setViewMode] = useState('list');
    
    // Profession Recommendation State
    let initialLifestyle = null;
    try { initialLifestyle = JSON.parse(localStorage.getItem('hrms_lifestyle')); } catch(e){}
    const [lifestyle, setLifestyle] = useState(initialLifestyle);


    const fetchProperties = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.location) queryParams.append('location', filters.location);
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.maxRent) queryParams.append('maxRent', filters.maxRent);

            const res = await api.get(`/properties?${queryParams.toString()}`);
            setProperties(res.data);
        } catch (err) {
            console.error('Failed to fetch properties', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
        // eslint-disable-next-line
    }, []);

    const fetchRecommendations = async (currentFilters) => {
        if (!user) return;
        setRecLoading(true);
        try {
            const hasFilters = currentFilters?.type || currentFilters?.location || currentFilters?.maxRent;
            const payload = hasFilters ? { interactions: [currentFilters] } : {};
            
            const res = await api.post('/properties/recommendations', payload);
            console.log("Recommendations:", res.data); // Debug log as requested
            setRecommended(res.data);
        } catch (err) {
            console.error('Failed to fetch recommendations', err);
        } finally {
            setRecLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
        if (user) {
            fetchRecommendations(filters);
        } else {
            setRecLoading(false);
        }
        // eslint-disable-next-line
    }, [user]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchProperties();

        const currentUserId = user ? user.id : "user123";

        fetch("http://localhost:5000/api/recommend", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentUserId,
                interactions: [filters] // Send full JSON dictionary instead of string
            })
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("Selected Type:", filters.type);
            console.log("API Response:", data);
            
            // Protect against HTML/JSON error objects on 404s
            if (Array.isArray(data) && data.length > 0) {
                setRecommended(data);
            } else if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
                setRecommended(data.recommendations);
            } else {
                setRecommended([]);
            }
        })
        .catch(err => {
            console.error("Error fetching recommendations:", err);
            setRecommended([]);
        });

        // Background logging
        if (user) {
            api.post('/interactions', { actionType: 'search', metadata: filters }).catch(e => console.error('Failed to log search', e));
        }
    };

    return (
        <div className="space-y-8">
            {/* Hero & Search Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">Find Your Perfect <br /> <span className="text-yellow-300">Rental Home</span></h1>
                    <p className="text-blue-100 text-lg mb-8">Discover top-rated apartments, villas, and houses with complete verified details.</p>
                </div>

                <form onSubmit={handleSearch} className="relative z-10 bg-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center max-w-4xl">
                    <div className="w-full md:w-1/3 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 placeholder-gray-400 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                        <i className="bi bi-geo-alt text-gray-400 mr-3 text-lg"></i>
                        <input type="text" name="location" placeholder="City or Location" value={filters.location} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800" />
                    </div>
                    <div className="w-full md:w-1/4 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                        <i className="bi bi-house text-gray-400 mr-3 text-lg"></i>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800 appearance-none">
                            <option value="">Any Type</option>
                            <option value="1RK">1 RK</option>
                            <option value="1BHK">1 BHK</option>
                            <option value="2BHK">2 BHK</option>
                            <option value="3BHK">3 BHK</option>
                            <option value="Villa">Villa</option>
                            <option value="Studio">Studio</option>
                        </select>
                    </div>
                    <div className="w-full md:w-1/4 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                        <input type="number" name="maxRent" placeholder="Max Rent" value={filters.maxRent} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800" />
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium shadow-md transition-colors flex items-center justify-center">
                        <i className="bi bi-search mr-2"></i> Search
                    </button>
                </form>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-40 -mb-20 w-64 h-64 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
            </div>

            {/* Profession Recommendation Selector */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 mb-8 animate-fade-in-up">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center mb-1">
                            Select your Profession
                        </h3>
                        <p className="text-gray-500 text-sm">Choose your profile to instantly prioritize properties with the highest Match % for you.</p>
                    </div>
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
                        {['Student', 'Working Professional', 'Family'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => {
                                    const newLifestyle = { profession: opt };
                                    setLifestyle(newLifestyle);
                                    localStorage.setItem('hrms_lifestyle', JSON.stringify(newLifestyle));
                                }}
                                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center ${
                                    lifestyle?.profession === opt 
                                        ? 'bg-white shadow-md text-purple-700' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                            >
                                <span>{opt}</span>
                            </button>
                        ))}
                        {lifestyle && (
                            <button 
                                onClick={() => { setLifestyle(null); localStorage.removeItem('hrms_lifestyle'); }}
                                className="ml-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                title="Clear Selection"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Recommendations Section */}
            {user && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        Recommended For You
                    </h2>
                    
                    {recLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-white rounded-2xl p-4 shadow-sm h-64 border border-purple-100">
                                    <div className="bg-purple-50 h-32 rounded-xl mb-4"></div>
                                    <div className="bg-purple-100 h-6 w-3/4 rounded mb-2"></div>
                                    <div className="bg-purple-100 h-4 w-1/2 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (!recommended || recommended.length === 0) ? (
                        <div className="text-center py-10 bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl border border-purple-100 shadow-sm">
                            <i className="bi bi-magic text-4xl text-purple-300 mb-3 block"></i>
                            <p className="text-purple-800 font-medium">Keep exploring properties to get smarter recommendations!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {recommended.map(property => (
                                <div key={property.id} className="bg-gradient-to-b from-purple-50 to-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-purple-100 group flex flex-col overflow-hidden relative">
                                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm flex items-center">
                                        <i className="bi bi-star-fill mr-1 text-[10px]"></i> Top Match
                                    </div>
                                    <div className="relative h-48 overflow-hidden">
                                        {(() => {
                                            const matchScore = lifestyle ? calculateProfessionMatch(property, lifestyle.profession) : null;
                                            return (
                                                <>
                                                    {property.images && JSON.parse(property.images).length > 0 ? (
                                                        <img src={`http://localhost:5000/${JSON.parse(property.images)[0]}`} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                                                    )}
                                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                        <span className="px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-100 text-xs font-bold text-gray-800 shadow-sm self-start">
                                                            {property.type}
                                                        </span>
                                                        {lifestyle && (
                                                            <span className="px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-purple-400 text-purple-700 text-xs font-bold shadow-sm self-start">
                                                                {matchScore}% Match for {lifestyle.profession}s ✨
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {property.trust_score !== undefined && (
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <span className={`px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-100 text-xs font-bold shadow-sm ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {property.trust_score > 80 ? '🟢' : property.trust_score > 50 ? '🟡' : '🔴'} Trust: {property.trust_score}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-purple-700 transition-colors flex-1 pr-2">{property.title}</h3>
                                            <p className="font-bold text-purple-700">{property.rent}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                                        </div>
                                        
                                        {/* Star Rating */}
                                        {property.total_reviews > 0 ? (
                                            <div className="flex items-center text-yellow-400 mb-2 text-xs">
                                                <i className="bi bi-star-fill mr-1"></i>
                                                <span className="font-bold text-gray-800">{parseFloat(property.average_rating).toFixed(1)}</span>
                                                <span className="text-gray-400 ml-1">({property.total_reviews})</span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-400 mb-2">No reviews yet</div>
                                        )}

                                        <p className="text-gray-500 text-xs mb-4 flex items-center"><i className="bi bi-geo-alt-fill text-gray-400 mr-2"></i> {property.location}</p>
                                        <div className="mt-auto pt-3 border-t border-purple-100 flex items-center justify-between">
                                            <Link 
                                                to={`/properties/${property.id}`} 
                                                onClick={() => {
                                                    const currentUserId = user ? user.id : "user123";
                                                    fetch("http://localhost:5000/api/recommend", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ user_id: currentUserId, interactions: [{ type: property.type, location: property.location, maxRent: property.rent }] })
                                                    }).catch(e => {});
                                                }}
                                                className="w-full text-center bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg font-medium text-sm transition-colors"
                                            >
                                                View Recommendation
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Properties List */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <i className="bi bi-building text-blue-500 mr-2"></i> All Properties
                    </h2>
                    
                    {/* View Mode Toggle */}
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner self-start md:self-auto border border-gray-200">
                        <button 
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <i className="bi bi-grid-fill mr-2"></i> Grid view
                        </button>
                        <button 
                            type="button"
                            onClick={() => setViewMode('map')}
                            className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${viewMode === 'map' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <i className="bi bi-map-fill mr-2"></i> Map view
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="animate-pulse bg-white rounded-2xl p-4 shadow-sm h-80">
                                <div className="bg-gray-200 h-48 rounded-xl mb-4"></div>
                                <div className="bg-gray-200 h-6 w-3/4 rounded mb-2"></div>
                                <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : properties.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-50">
                        <i className="bi bi-house-x text-6xl text-gray-300 mb-4 block"></i>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No properties found</h3>
                        <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                        <button onClick={() => { setFilters({ location: '', type: '', maxRent: '' }); setTimeout(fetchProperties, 0); }} className="mt-6 text-blue-600 font-medium hover:underline">Clear all filters</button>
                    </div>
                ) : viewMode === 'map' ? (
                    <div className="animate-fade-in-up">
                        <MapComponent 
                            properties={properties} 
                            recommendedIds={recommended ? recommended.map(r => r.id) : []} 
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...properties].sort((a, b) => {
                            if (!lifestyle) return 0;
                            const scoreA = calculateProfessionMatch(a, lifestyle.profession);
                            const scoreB = calculateProfessionMatch(b, lifestyle.profession);
                            return scoreB - scoreA;
                        }).map(property => (
                            <div key={property.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col overflow-hidden">
                                <div className="relative h-56 overflow-hidden">
                                    {(() => {
                                        const matchScore = lifestyle ? calculateProfessionMatch(property, lifestyle.profession) : null;
                                        return (
                                            <>
                                                {property.images && JSON.parse(property.images).length > 0 ? (
                                                    <img src={`http://localhost:5000/${JSON.parse(property.images)[0]}`} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image provided</div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                                                <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${property.status === 'available' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                                            {property.status.toUpperCase()}
                                                        </span>
                                                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-gray-800 shadow-sm">
                                                            {property.type}
                                                        </span>
                                                    </div>
                                                    {lifestyle && (
                                                        <div className="flex gap-2">
                                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black shadow-sm border border-purple-400 text-purple-700">
                                                                {matchScore}% Match for {lifestyle.profession}s ✨
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                    {property.trust_score !== undefined && (
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <span className={`px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold shadow-sm ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {property.trust_score > 80 ? '🟢' : property.trust_score > 50 ? '🟡' : '🔴'} Trust: {property.trust_score}
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                        <div>
                                            <p className="text-white font-bold text-2xl flex items-center shadow-sm">
                                                {property.rent}<span className="text-sm font-normal text-white/80 ml-1">/mo</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{property.title}</h3>
                                    
                                    {/* Star Rating */}
                                    {property.total_reviews > 0 ? (
                                        <div className="flex items-center text-yellow-400 mb-3 text-sm">
                                            <i className="bi bi-star-fill mr-1"></i>
                                            <span className="font-bold text-gray-800">{parseFloat(property.average_rating).toFixed(1)}</span>
                                            <span className="text-gray-400 ml-1">({property.total_reviews} reviews)</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mb-3">No reviews yet</div>
                                    )}

                                    <p className="text-gray-500 text-sm mb-4 flex items-center"><i className="bi bi-geo-alt-fill text-gray-400 mr-2"></i> {property.location}</p>

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-blue-800 font-bold border border-white shadow-sm">
                                                {property.owner_name.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[120px]">{property.owner_name}</span>
                                        </div>
                                        <Link 
                                            to={`/properties/${property.id}`} 
                                            onClick={() => {
                                                const currentUserId = user ? user.id : "user123";
                                                fetch("http://localhost:5000/api/recommend", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ user_id: currentUserId, interactions: [{ type: property.type, location: property.location, maxRent: property.rent }] })
                                                }).catch(e => {});
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform"
                                        >
                                            View Details <i className="bi bi-arrow-right ml-1"></i>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
};

export default Home;
