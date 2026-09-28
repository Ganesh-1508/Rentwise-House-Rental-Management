export const calculateProfessionMatch = (property, profession) => {
    let score = 55; // Base default score so no property feels "0% compatible"
    
    // Parse compatibility data safely
    let compData = null;
    if (property.compatibility_metadata) {
        try {
            compData = typeof property.compatibility_metadata === 'string' ? JSON.parse(property.compatibility_metadata) : property.compatibility_metadata;
        } catch(e){}
    }
    
    const rent = Number(property.rent) || 0;
    const type = property.type ? property.type.toLowerCase() : '';
    
    if (profession === 'Student') {
        // Owner Data Match
        if (compData && compData.suitableFor === 'Students') score += 25;
        else if (compData && (compData.suitableFor === 'Anyone' || compData.suitableFor === 'Working Professionals')) score += 10;
        
        // Rent Logic (Students want cheaper)
        if (rent <= 18000) score += 20;
        else if (rent <= 25000) score += 5;
        else score -= 15;
        
        // Size Logic (Smaller is better for single students)
        if (type.includes('1 bhk') || type.includes('1 rk')) score += 15;
        
    } else if (profession === 'Working Professional') {
        // Owner Data Match
        if (compData && compData.suitableFor === 'Working Professionals') score += 25;
        else if (compData && compData.suitableFor === 'Anyone') score += 15;
        
        // Rent Logic (Mid-tier to premium)
        if (rent >= 15000 && rent <= 40000) score += 15;
        
        // Size Logic
        if (type.includes('1 bhk') || type.includes('2 bhk')) score += 15;
        
    } else if (profession === 'Family') {
        // Owner Data Match
        if (compData && compData.suitableFor === 'Families') score += 25;
        else if (compData && compData.suitableFor === 'Anyone') score += 10;
        else if (compData && compData.suitableFor === 'Students') score -= 20;
        
        // Rent Logic (Families have varied budgets, usually higher)
        if (rent >= 20000) score += 10;

        // Size Logic (Families need space)
        if (type.includes('2 bhk') || type.includes('3 bhk') || type.includes('4 bhk') || type.includes('villa')) score += 30;
        else if (type.includes('1 rk') || type.includes('1 bhk')) score -= 25; 
    }
    
    // Add small randomization based on ID to make scores feel unique but deterministic
    const idHash = (property.id * 7) % 11;
    score += idHash;

    // Floor and Ceiling to standard match percentages (45% to 99%)
    return Math.min(99, Math.max(45, Math.floor(score)));
};
