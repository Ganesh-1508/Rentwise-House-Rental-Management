import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AddProperty = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewImages, setPreviewImages] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rent: '',
        deposit: '',
        location: '',
        type: '1RK',
        images: []
    });

    const [compatibilityData, setCompatibilityData] = useState({
        areaType: 'Moderate',
        noiseLevel: 'Medium',
        lifestyleType: 'Peaceful / Family Friendly',
        rules: 'Pets Allowed',
        suitableFor: 'Working Professionals',
        cleanliness: 'Medium',
        hospital: '',
        college: '',
        school: '',
        garden: ''
    });

    const handleCompatibilityChange = (e) => {
        setCompatibilityData({ ...compatibilityData, [e.target.name]: e.target.value });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            alert('You can only upload up to 5 images.');
            return;
        }

        setFormData({ ...formData, images: files });

        // Generate previews
        const previews = files.map(file => URL.createObjectURL(file));
        setPreviewImages(previews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'images') {
                formData.images.forEach(image => {
                    data.append('images', image);
                });
            } else {
                data.append(key, formData[key]);
            }
        });

        // Append structured AI settings as JSON
        data.append('compatibility_metadata', JSON.stringify(compatibilityData));

        try {
            await api.post('/properties', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/owner/properties');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add property');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Add New Property</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Property Title</label>
                            <input type="text" name="title" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="e.g. Beautiful 2BHK Apartment in Downtown" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea name="description" required rows="4" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="Describe the property, amenities, nearby places..."></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rent (per month)</label>
                            <input type="number" name="rent" required min="0" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="1500" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deposit</label>
                            <input type="number" name="deposit" required min="0" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="3000" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <input type="text" name="location" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="e.g. New York, NY" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                            <select name="type" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white">
                                <option value="1RK">1 RK</option>
                                <option value="1BHK">1 BHK</option>
                                <option value="2BHK">2 BHK</option>
                                <option value="3BHK">3 BHK</option>
                                <option value="Villa">Villa</option>
                                <option value="Studio">Studio</option>
                            </select>
                        </div>
                    </div>

                    {/* Compatibility Form Section */}
                    <div className="pt-6 border-t border-gray-100">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-inner">
                            <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center">
                                <i className="bi bi-people-fill text-blue-600 mr-2"></i> Target Audience Preferences
                            </h3>
                            <p className="text-sm text-blue-700 mb-5">
                                Describe the ideal lifestyle parameters for this property to help us recommend it to the right tenant profiles (Students, Professionals, Families).
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
                                    <select name="areaType" value={compatibilityData.areaType} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Quiet Residential</option>
                                        <option>Moderate</option>
                                        <option>Busy / Commercial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Noise Level</label>
                                    <select name="noiseLevel" value={compatibilityData.noiseLevel} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lifestyle Fit</label>
                                    <select name="lifestyleType" value={compatibilityData.lifestyleType} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Peaceful / Family Friendly</option>
                                        <option>Student Friendly</option>
                                        <option>Party Friendly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">House Rules</label>
                                    <select name="rules" value={compatibilityData.rules} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>No Parties</option>
                                        <option>No Smoking</option>
                                        <option>Pets Allowed</option>
                                        <option>No Restrictions</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Suitable For</label>
                                    <select name="suitableFor" value={compatibilityData.suitableFor} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Students</option>
                                        <option>Working Professionals</option>
                                        <option>Families</option>
                                        <option>Anyone</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cleanliness Baseline</label>
                                    <select name="cleanliness" value={compatibilityData.cleanliness} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-inner mt-6">
                            <h3 className="text-xl font-bold text-green-900 mb-2 flex items-center">
                                Nearby Amenities & Places
                            </h3>
                            <p className="text-sm text-green-700 mb-5">
                                Mention the nearest important landmarks to increase property value and attraction.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Hospital</label>
                                    <input type="text" name="hospital" value={compatibilityData.hospital} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest College</label>
                                    <input type="text" name="college" value={compatibilityData.college} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest School</label>
                                    <input type="text" name="school" value={compatibilityData.school} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Garden / Park</label>
                                    <input type="text" name="garden" value={compatibilityData.garden} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images (Max 5)</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />

                        {previewImages.length > 0 && (
                            <div className="mt-4 grid grid-cols-5 gap-4">
                                {previewImages.map((src, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                                        <img src={src} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end space-x-4">
                        <button type="button" onClick={() => navigate('/owner/properties')} className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className={`px-6 py-2.5 font-medium rounded-xl text-white ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'} shadow-lg transition-all`}>
                            {loading ? 'Adding...' : 'Add Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProperty;
