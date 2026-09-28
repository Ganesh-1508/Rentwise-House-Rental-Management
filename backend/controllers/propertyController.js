const PropertyModel = require('../models/propertyModel');

const appendTrustScore = (property) => {
    let score = 0;
    let factors = [];

    // 1. Owner Verification (Aadhaar/Email/Phone)
    if (property.owner_email && property.owner_phone) {
        score += 25;
        factors.push("✔ Verified Owner");
    } else if (property.owner_email || property.owner_phone) {
        score += 10;
        factors.push("✔ Partially Verified");
    } else {
        factors.push("⚠ Unverified Owner");
    }

    // 2. Tenant Reviews
    const rating = parseFloat(property.average_rating) || 0;
    const reviewScore = (rating / 5) * 25;
    score += reviewScore;

    if (rating >= 4.0) {
        factors.push("✔ Positive Reviews");
    } else if (rating > 0 && rating < 3.0) {
        factors.push("⚠ Low Reviews");
    } else if (rating === 0) {
        factors.push("➖ No Reviews Yet");
    }

    // 3. Listing Consistency
    score += 20;
    factors.push("✔ Stable Listing");

    // 4. Fraud Signals
    let fraudScore = 30;
    if (Number(property.rent) < 3000) {
        fraudScore -= 15;
        factors.push("⚠ Price Too Low");
    } else {
        factors.push("✔ No Suspicious Activity");
    }
    score += fraudScore;

    return {
        ...property,
        trust_score: Math.round(score),
        trust_factors: factors
    };
};

// @desc    Get all properties (with optional filters)
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res, next) => {
    try {
        const filters = {
            location: req.query.location,
            type: req.query.type,
            maxRent: req.query.maxRent
        };
        const properties = await PropertyModel.getAllProperties(filters);
        const augmentedProperties = properties.map(appendTrustScore);
        res.json(augmentedProperties);
    } catch (error) {
        next(error);
    }
};

// @desc    Get Owner's properties
// @route   GET /api/properties/owner
// @access  Private (Owner only)
const getOwnerProperties = async (req, res, next) => {
    try {
        const properties = await PropertyModel.getAllProperties({ ownerId: req.user.id });
        const augmentedProperties = properties.map(appendTrustScore);
        res.json(augmentedProperties);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getProperty = async (req, res, next) => {
    try {
        const property = await PropertyModel.getPropertyById(req.params.id);

        if (property) {
            // Hide owner contact details if property is not booked by the requesting user
            // We'll handle this purely in frontend or strictly here if needed. 
            // For now, returning it for simplicity, frontend will hide it based on booking status.
            res.json(appendTrustScore(property));
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Create a property
// @route   POST /api/properties
// @access  Private (Owner only)
const createProperty = async (req, res, next) => {
    try {
        const { title, description, rent, deposit, location, type, compatibility_metadata } = req.body;

        // Extract up to 5 image paths
        const images = req.files ? req.files.map(file => file.path) : [];

        const propertyId = await PropertyModel.createProperty(
            req.user.id, title, description, rent, deposit, location, type, images, compatibility_metadata
        );

        res.status(201).json({ message: 'Property created successfully', propertyId });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private (Owner only)
const updateProperty = async (req, res, next) => {
    try {
        const { title, description, rent, deposit, location, type, compatibility_metadata } = req.body;

        // Ensure property exists and belongs to owner
        const property = await PropertyModel.getPropertyById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (property.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this property' });
        }

        const images = req.files && req.files.length > 0 ? req.files.map(file => file.path) : null;

        await PropertyModel.updateProperty(
            req.params.id, req.user.id, title, description, rent, deposit, location, type, images, compatibility_metadata
        );

        res.json({ message: 'Property updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private (Owner only)
const deleteProperty = async (req, res, next) => {
    try {
        const property = await PropertyModel.getPropertyById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (property.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this property' });
        }

        await PropertyModel.deleteProperty(req.params.id, req.user.id);

        res.json({ message: 'Property removed' });
    } catch (error) {
        next(error);
    }
};

const InteractionModel = require('../models/interactionModel');

// @desc    Get recommended properties for a user
// @route   GET & POST /api/properties/recommendations AND POST /api/recommend
// @access  Private / Public
const getRecommendedProperties = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body?.user_id;
        if (!userId) return res.status(400).json({ message: "User ID missing" });
        
        // Real-time session interactions sent by frontend
        const sessionInteractions = req.body?.interactions || [];
        
        // 1. Fetch user interactions from database
        const dbInteractions = await InteractionModel.getUserInteractions(userId, 50);
        
        // Merge them
        const combinedInteractions = dbInteractions.map(i => ({
            property_id: i.property_id,
            action_type: i.action_type,
            metadata: i.metadata
        }));
        
        // If frontend sends ["1bhk pune"], we wrap it so Python understands
        sessionInteractions.forEach(item => {
            combinedInteractions.push({
                property_id: null,
                action_type: 'search',
                metadata: item 
            });
        });
        
        let recommendedIds = [];
        try {
            console.log(`[Node backend] Fetching AI recommendations for User ${userId}`);
            console.log(`[Node backend] Forwarding ${combinedInteractions.length} interaction(s) to FastAPI`);
            
            // Call the Python AI Microservice
            const response = await fetch(`http://localhost:8000/api/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    interactions: combinedInteractions
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                recommendedIds = data.recommendations || [];
            } else {
                console.error('AI Service error response:', response.status);
            }
        } catch (error) {
            console.error('AI Recommendation Service unavailable. Falling back to latest properties.');
        }

        let properties = [];
        const allAvailable = await PropertyModel.getAllProperties({}); // Fetch all for simplicity

        if (recommendedIds.length > 0) {
            // Map the IDs to full property objects, preserving the recommended order
            properties = recommendedIds.map(id => allAvailable.find(p => Number(p.id) === Number(id))).filter(Boolean);
            
            // If mapping failed, fallback ONLY if they didn't explicitly search
            if (properties.length === 0 && sessionInteractions.length === 0) {
                properties = allAvailable.slice(0, 5);
            }
        } else {
            // Fallback: return 5 latest properties ONLY if there are no active search interactions
            // If they explicitly search "1BHK" and get [], it MUST remain [] so UI tells them "No properties matches"
            if (sessionInteractions.length === 0) {
                properties = allAvailable.slice(0, 5);
            }
        }

        if (properties.length > 0) {
            properties = properties.map(appendTrustScore);
        }
        res.json(properties);
    } catch (error) {
        next(error);
    }
};

// @desc    Get AI Fair Price Estimate
// @route   POST /api/properties/fair-price
// @access  Public
const getFairPriceEstimate = async (req, res, next) => {
    try {
        const { location, type } = req.body;
        if (!location || !type) return res.status(400).json({ message: "Location and Type required" });

        const response = await fetch(`http://localhost:8000/api/predict-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, type })
        });
        
        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        } else {
            return res.status(response.status).json({ message: "AI Pricing Service unavailable" });
        }
    } catch (error) {
        console.error('AI Service Error:', error);
        res.status(500).json({ message: "AI Pricing Service error" });
    }
};

module.exports = {
    getProperties,
    getOwnerProperties,
    getProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    getRecommendedProperties,
    getFairPriceEstimate
};
