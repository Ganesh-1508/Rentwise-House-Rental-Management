import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { calculateProfessionMatch } from '../utils/professionMatch';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [predictedPrice, setPredictedPrice] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [isFavourite, setIsFavourite] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState({ averageRating: null, totalReviews: 0 });
    const [newRating, setNewRating] = useState({ rating: 5, comment: '' });
    const [reviewLoading, setReviewLoading] = useState(false);
    
    // AI Bot State
    const [isBotOpen, setIsBotOpen] = useState(false);
    const [scriptCopied, setScriptCopied] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                const fetchedProperty = res.data;
                setProperty(fetchedProperty);

                // Fetch AI Fair Price Estimate
                if (fetchedProperty.location && fetchedProperty.type) {
                    api.post('/properties/fair-price', {
                        location: fetchedProperty.location,
                        type: fetchedProperty.type
                    }).then(aiRes => {
                        if (aiRes.data && aiRes.data.predicted_price) {
                            setPredictedPrice(aiRes.data.predicted_price);
                        }
                    }).catch(e => console.error('Failed to load AI prediction', e));
                }

                // Fetch reviews
                api.get(`/properties/${id}/reviews`).then(revRes => {
                    setReviews(revRes.data.reviews || []);
                    if(revRes.data.stats) setRatingStats(revRes.data.stats);
                }).catch(e => console.error('Failed to load reviews', e));

                // If user is logged in, track the view and check if it's in favourites
                if (user) {
                    api.post('/interactions', { propertyId: id, actionType: 'view' }).catch(e => console.error('Failed to log view', e));
                    
                    const favsRes = await api.get('/favourites');
                    const isFav = favsRes.data.some(f => f.id === parseInt(id));
                    setIsFavourite(isFav);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, user]);

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setBookingLoading(true);
        try {
            await api.post('/bookings', { propertyId: id });
            api.post('/interactions', { propertyId: id, actionType: 'book' }).catch(e => console.error('Failed to log book', e));
            alert('Booking request sent to owner! Check your dashboard for updates.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send booking request');
        } finally {
            setBookingLoading(false);
        }
    };

    const toggleFavourite = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setFavLoading(true);
        try {
            if (isFavourite) {
                await api.delete(`/favourites/${id}`);
                setIsFavourite(false);
            } else {
                await api.post(`/favourites/${id}`);
                api.post('/interactions', { propertyId: id, actionType: 'favorite' }).catch(e => console.error('Failed to log favorite', e));
                setIsFavourite(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFavLoading(false);
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        if (!user) { navigate('/login'); return; }
        
        setReviewLoading(true);
        try {
            const res = await api.post(`/properties/${id}/reviews`, newRating);
            setRatingStats(res.data.stats);
            // Re-fetch reviews to update list
            const revRes = await api.get(`/properties/${id}/reviews`);
            setReviews(revRes.data.reviews || []);
            setNewRating({ rating: 5, comment: '' });
            alert('Review submitted successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (!property) return <div className="text-center py-20 text-gray-500">Property not found.</div>;

    const images = property.images ? JSON.parse(property.images) : [];

    // AI Negotiation Bot Logic
    const listedPrice = property ? Number(property.rent) : 0;
    const fairPrice = predictedPrice ? Number(predictedPrice) : 0;
    const canNegotiate = property && predictedPrice && fairPrice > 0;
    
    let targetPrice = 0;
    let overpricedPercent = 0;
    let confidence = "Medium";
    let confidenceColor = "yellow";
    let generatedScript = "";

    if (canNegotiate) {
        targetPrice = Math.round(fairPrice * 0.95); // 5% below fair price
        overpricedPercent = Math.max(0, Math.round(((listedPrice - fairPrice) / fairPrice) * 100));
        
        if (overpricedPercent > 10) {
            confidence = "High (Owner knows it's overpriced)";
            confidenceColor = "green";
        } else if (overpricedPercent > 0) {
            confidence = "Medium (Fair chance for discount)";
            confidenceColor = "yellow";
        } else {
            confidence = "Low (Already a great deal)";
            confidenceColor = "red";
        }

        generatedScript = `Hi ${property.owner_name},\n\nI really love the property! Based on recent similar listings in ${property.location}, the average market rate is around ${fairPrice}/mo.\n\nWould you consider negotiating the rent to ${targetPrice}/mo? I have excellent references and can move in immediately.\n\nLooking forward to hearing from you!`;
    }

    // Lifestyle Profession Recommendation Logic
    let lifestyle = null;
    try { lifestyle = JSON.parse(localStorage.getItem('hrms_lifestyle')); } catch(e){}
    const matchScore = property && lifestyle ? calculateProfessionMatch(property, lifestyle.profession) : null;
    
    let recommendationChecklist = [];
    if (lifestyle) {
        if (lifestyle.profession === 'Student') {
            recommendationChecklist = [
                "Budget-friendly pricing structure",
                "Near colleges and public transport",
                "Student-friendly environment",
                "Shared accommodation options available"
            ];
        } else if (lifestyle.profession === 'Family') {
            recommendationChecklist = [
                "Spacious and child-friendly design",
                "Safe neighborhood and near schools",
                "Close to parks and local markets",
                "Pet-friendly options and strict security"
            ];
        } else {
            recommendationChecklist = [
                "Prime location near business hubs",
                "Fast internet and quiet environments",
                "Premium modern amenities",
                "Secure and hassle-free living space"
            ];
        }
    }

    const compatData = property && property.compatibility_metadata ? (typeof property.compatibility_metadata === 'string' ? JSON.parse(property.compatibility_metadata) : property.compatibility_metadata) : null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            {/* Header & Main Image */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start gap-8">
                <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                    {images.length > 0 ? (
                        <img src={`http://localhost:5000/${images[0]}`} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image available</div>
                    )}
                    <span className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-sm font-bold shadow-md backdrop-blur-md ${property.status === 'available' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {property.status.toUpperCase()}
                    </span>

                    {user && (
                        <button
                            onClick={toggleFavourite}
                            disabled={favLoading}
                            className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all ${isFavourite ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}
                        >
                            <i className={`bi ${isFavourite ? 'bi-heart-fill' : 'bi-heart'} text-lg`}></i>
                        </button>
                    )}
                </div>

                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm font-semibold mb-3 inline-block">{property.type}</span>
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-gray-900">{property.rent}<span className="text-lg text-gray-500 font-medium">/mo</span></h2>
                            <p className="text-gray-500 text-sm">Deposit: {property.deposit}</p>
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    
                    {/* AI Price Prediction Card */}
                    {predictedPrice && (
                        <div className={`mt-3 mb-5 p-4 rounded-xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm animate-fade-in-up ${property.rent > predictedPrice * 1.05 ? 'bg-red-50 border-red-200' : property.rent < predictedPrice * 0.95 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-center mb-2 md:mb-0">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Predicted Fair Price</p>
                                    <p className="text-lg font-black text-gray-900">{predictedPrice} <span className="text-[10px] font-bold text-gray-500">/mo</span></p>
                                </div>
                            </div>
                            <div className="md:text-right flex flex-col items-start md:items-end gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black inline-block shadow-sm tracking-wide ${property.rent > predictedPrice * 1.05 ? 'bg-red-500 text-white' : property.rent < predictedPrice * 0.95 ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                                    {property.rent > predictedPrice * 1.05 ? 'Overpriced' : property.rent < predictedPrice * 0.95 ? 'Great Deal' : 'Fair Value'}
                                </span>
                                {canNegotiate && (
                                    <button 
                                        onClick={() => setIsBotOpen(true)}
                                        className="mt-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md hover:from-purple-700 hover:to-blue-700 transition flex items-center"
                                    >
                                        Negotiate Price
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Profession-Based Recommendation Card */}
                    {lifestyle && (
                        <div className="mt-4 mb-5 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg animate-fade-in-up">
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-4 mb-5 border-b border-indigo-400/20 pb-4">
                                    <div className="bg-yellow-400/20 text-yellow-300 font-black px-4 py-2 rounded-xl text-xl flex items-center border border-yellow-400/30 shadow-inner">
                                        {matchScore}% Match
                                    </div>
                                    <div>
                                        <div className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">RECOMMENDATION OUTPUT</div>
                                        <h3 className="text-xl md:text-2xl font-black">
                                            Recommended for {lifestyle.profession}s
                                        </h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                                        These properties are selected based on your profile and preferences natively matching your goals perfectly.
                                    </p>
                                    <div className="bg-indigo-950/60 backdrop-blur-md rounded-xl p-4 border border-indigo-400/20 w-full shadow-inner">
                                        <ul className="space-y-3 text-sm text-indigo-50 font-medium tracking-wide">
                                            {recommendationChecklist.map((reason, idx) => (
                                                <li key={idx} className="flex items-start">
                                                    <i className="bi bi-check-circle-fill text-emerald-400 mr-3 mt-0.5 drop-shadow-sm text-base"></i> 
                                                    <span className="leading-tight opacity-90">{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Render Average Rating */}
                    {ratingStats && ratingStats.totalReviews > 0 ? (
                        <div className="flex items-center text-yellow-400 mb-4">
                            <i className="bi bi-star-fill mr-1"></i>
                            <span className="font-bold text-gray-800 text-lg">{ratingStats.averageRating}</span>
                            <span className="text-sm text-gray-500 ml-2">({ratingStats.totalReviews} reviews)</span>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 mb-4">No reviews yet</div>
                    )}

                    {/* Trust Score Section */}
                    {property.trust_score !== undefined && (
                        <div className="mt-4 mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm animate-fade-in-up">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <i className="bi bi-shield-check text-blue-600 mr-2 text-xl"></i> Trust Score
                                </h3>
                                <span className={`px-3 py-1 bg-white rounded-full text-sm font-black shadow-sm ${property.trust_score > 80 ? 'text-green-600 border-green-200' : property.trust_score > 50 ? 'text-yellow-600 border-yellow-200' : 'text-red-600 border-red-200'} border`}>
                                    {property.trust_score > 80 ? '🟢 ' : property.trust_score > 50 ? '🟡 ' : '🔴 '}
                                    {property.trust_score} / 100
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {property.trust_factors && property.trust_factors.map((factor, idx) => (
                                    <span key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center ${factor.includes('✔') ? 'bg-green-50 text-green-700 border border-green-100' : factor.includes('⚠') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-700'}`}>
                                        {factor.replace('✔ ', '').replace('⚠ ', '').replace('➖ ', '')}
                                        {factor.includes('✔') && <i className="bi bi-check-circle-fill ml-1.5 opacity-70"></i>}
                                        {factor.includes('⚠') && <i className="bi bi-exclamation-triangle-fill ml-1.5 opacity-70"></i>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-gray-600 text-base mb-6 flex items-center"><i className="bi bi-geo-alt-fill text-gray-400 mr-2 text-xl"></i> {property.location}</p>

                    <div className="mt-auto">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm">
                                {property.owner_name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Owner</h4>
                                <p className="font-bold text-gray-900">{property.owner_name}</p>
                                {/* Note: Strict logic would hide these until booking is approved, based on requirements. Handled minimally here. */}
                            </div>
                        </div>

                        {(!user || user.role === 'User') && (
                            <button
                                onClick={handleBooking}
                                disabled={property.status === 'booked' || bookingLoading}
                                className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all flex justify-center items-center ${property.status === 'booked'
                                    ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed'
                                    : loading
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 hover:translate-y-[-2px]'
                                    }`}
                            >
                                {property.status === 'booked' ? (
                                    <><i className="bi bi-x-circle mr-2"></i> Property Already Booked</>
                                ) : bookingLoading ? (
                                    <><i className="bi bi-hourglass-split mr-2 animate-spin"></i> Sending Request...</>
                                ) : (
                                    <><i className="bi bi-calendar-check mr-2"></i> Request to Book</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content & Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
                    </div>

                    {images.length > 1 && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><i className="bi bi-images mr-2 text-gray-400"></i> Property Gallery</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {images.slice(1).map((img, idx) => (
                                    <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-gray-100 group">
                                        <img src={`http://localhost:5000/${img}`} alt={`${property.title} - ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Insights</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Listed On</p>
                                    <p className="font-semibold">{new Date(property.created_at).toLocaleDateString()}</p>
                                </div>
                            </li>
                            <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Security Deposit</p>
                                    <p className="font-semibold">{property.deposit}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Target Audience Preferences & Amenities */}
            {compatData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Target Audience Preferences</h3>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Area Type</p>
                                <p className="font-bold text-gray-900">{compatData.areaType || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Noise Level</p>
                                <p className="font-bold text-gray-900">{compatData.noiseLevel || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Lifestyle Fit</p>
                                <p className="font-bold text-gray-900">{compatData.lifestyleType || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">House Rules</p>
                                <p className="font-bold text-gray-900">{compatData.rules || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Suitable For</p>
                                <p className="font-bold text-gray-900">{compatData.suitableFor || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Cleanliness</p>
                                <p className="font-bold text-gray-900">{compatData.cleanliness || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Nearby Amenities</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest Hospital</p>
                                <p className="font-bold text-gray-900">{compatData.hospital || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest College</p>
                                <p className="font-bold text-gray-900">{compatData.college || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest School</p>
                                <p className="font-bold text-gray-900">{compatData.school || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest Garden</p>
                                <p className="font-bold text-gray-900">{compatData.garden || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Map Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <i className="bi bi-geo-alt text-blue-600 mr-2 text-2xl drop-shadow-sm"></i> Location Map
                    </h3>
                </div>
                <div className="w-full rounded-2xl overflow-hidden relative shadow-inner">
                    <MapComponent properties={[property]} height="450px" />
                </div>
            </div>

            {/* Ratings and Reviews Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center"><i className="bi bi-star-half text-yellow-400 mr-2 text-2xl"></i> Property Reviews</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Review Form */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h4 className="text-lg font-bold text-gray-800 mb-4">Write a Review</h4>
                        {(!user || user.id === property.owner_id) ? (
                            <p className="text-gray-500 italic text-sm p-4 bg-white rounded-xl">You must be logged in as a tenant to review this property.</p>
                        ) : (
                            <form onSubmit={submitReview} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button 
                                                type="button" 
                                                key={star}
                                                onClick={() => setNewRating({ ...newRating, rating: star })}
                                                className={`text-2xl transition-transform hover:scale-110 ${newRating.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                            >
                                                <i className="bi bi-star-fill"></i>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
                                    <textarea 
                                        rows="3" 
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                        placeholder="Share your experience with this property..."
                                        value={newRating.comment}
                                        onChange={(e) => setNewRating({ ...newRating, comment: e.target.value })}
                                    ></textarea>
                                </div>
                                <button type="submit" disabled={reviewLoading} className="w-full bg-gray-900 text-white rounded-xl py-3 font-medium hover:bg-black transition-colors disabled:opacity-50">
                                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Review List */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {reviews.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <i className="bi bi-chat-square-text text-3xl mb-2 block"></i>
                                No reviews have been left yet.<br/>Be the first to review!
                            </div>
                        ) : (
                            reviews.map(review => (
                                <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                                {review.user_name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{review.user_name}</span>
                                        </div>
                                        <div className="text-yellow-400 text-sm flex">
                                            {[...Array(5)].map((_, i) => (
                                                <i key={i} className={i < review.rating ? "bi bi-star-fill" : "bi bi-star text-gray-200"}></i>
                                            ))}
                                        </div>
                                    </div>
                                    {review.comment && <p className="text-gray-600 text-sm leading-relaxed mt-2">{review.comment}</p>}
                                    <p className="text-xs text-gray-400 mt-3">{new Date(review.created_at).toLocaleDateString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* AI Negotiation Bot Modal */}
            {isBotOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transform transition-all">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                    <i className="bi bi-robot text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Smart Negotiation Bot</h3>
                                    <p className="text-purple-100 text-xs text-opacity-80">Powered Bargaining</p>
                                </div>
                            </div>
                            <button onClick={() => setIsBotOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <i className="bi bi-x-lg text-xl"></i>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 bg-gray-50/50 overflow-y-auto max-h-[60vh]">
                            {/* Chat Message */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex-shrink-0 flex items-center justify-center text-white text-xs shadow-sm shadow-blue-200">
                                    <i className="bi bi-robot"></i>
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700">
                                    Based on market trends and similar properties in <b>{property.location}</b>, you can negotiate this rent to around <b>{targetPrice}</b>. 
                                    {overpricedPercent > 0 ? ` The current price is slightly above average.` : ` This is already a highly competitive price.`}
                                </div>
                            </div>

                            {/* Data Points */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Market Avg</p>
                                    <p className="font-black text-gray-800 text-lg">{fairPrice}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Overpriced By</p>
                                    <p className="font-black text-red-500 text-lg">{overpricedPercent}%</p>
                                </div>
                            </div>

                            {/* Confidence Score */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-0.5">Negotiation Success Chance</p>
                                    <p className={`text-sm font-black text-${confidenceColor}-600 leading-none`}>{confidence}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-full bg-${confidenceColor}-100 text-${confidenceColor}-600 flex items-center justify-center flex-shrink-0 ml-3`}>
                                    <i className={`bi ${confidenceColor === 'green' ? 'bi-emoji-sunglasses' : confidenceColor === 'yellow' ? 'bi-emoji-smile' : 'bi-emoji-neutral'} text-xl`}></i>
                                </div>
                            </div>

                            {/* Target Box */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl text-center shadow-inner">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Target Negotiation Price</p>
                                <p className="text-3xl font-black text-emerald-700">{targetPrice}</p>
                            </div>

                            {/* Script Generator */}
                            <div className="pt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-xs font-bold text-gray-600"><i className="bi bi-magic text-purple-500 mr-1"></i> Auto-Generated Script</p>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedScript);
                                            setScriptCopied(true);
                                            setTimeout(() => setScriptCopied(false), 2000);
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition"
                                    >
                                        {scriptCopied ? <><i className="bi bi-check2"></i> Copied!</> : <><i className="bi bi-clipboard"></i> Copy</>}
                                    </button>
                                </div>
                                <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600 leading-relaxed font-mono border border-gray-200 h-28 overflow-y-auto whitespace-pre-wrap selection:bg-purple-200">
                                    {generatedScript}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                            <button onClick={() => setIsBotOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
                            <button 
                                onClick={() => {
                                    setIsBotOpen(false);
                                    if(property.owner_email) {
                                        window.location.href = `mailto:${property.owner_email}?subject=Interested in ${property.title}&body=${encodeURIComponent(generatedScript)}`;
                                    } else {
                                        alert("Owner email is hidden or unavailable until your booking is accepted.");
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-black shadow-md transition flex items-center justify-center gap-2"
                            >
                                Send Email <i className="bi bi-envelope-fill"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;
