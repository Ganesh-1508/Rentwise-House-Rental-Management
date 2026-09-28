from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mysql.connector
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.linear_model import LinearRegression
import os
import re
import json
import warnings
from typing import List, Optional, Any
from dotenv import load_dotenv

warnings.filterwarnings('ignore', category=UserWarning, message='.*pandas only supports SQLAlchemy connectable.*')

load_dotenv('../backend/.env')

app = FastAPI(title="House Rental AI Recommendation Engine")

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'house_rent_db')
    )

class Interaction(BaseModel):
    property_id: Optional[int] = None
    action_type: str
    metadata: Optional[Any] = None

class RecommendationRequest(BaseModel):
    user_id: int
    interactions: List[Interaction]

class PricePredictionRequest(BaseModel):
    location: str
    type: str

def normalize_text(text):
    if not text or not isinstance(text, str):
        return ""
    text = text.lower()
    # Normalize BHK/RK formats: "1 bhk", "1-bhk", "1bhk " -> "1bhk"
    text = re.sub(r'(\d+)\s*[-]*\s*bhk', r'\1bhk', text)
    text = re.sub(r'(\d+)\s*[-]*\s*rk', r'\1rk', text)
    # Remove extra spaces
    return " ".join(text.split())

@app.post("/api/predict-price")
def predict_price(req: PricePredictionRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    properties_query = "SELECT type, location, rent FROM properties WHERE status = 'available'"
    cursor.execute(properties_query)
    rows = cursor.fetchall()
    properties_df = pd.DataFrame(rows)
    cursor.close()
    conn.close()
    
    try:
        target_type = normalize_text(req.type)
        target_loc = normalize_text(req.location)
        
        # 1. Base Type Anchors (General Market Domain Knowledge)
        type_anchors = {
            '1rk': 10000,
            '1bhk': 15000,
            '2bhk': 22000,
            '3bhk': 35000,
            '4bhk': 50000
        }
        
        anchor_price = type_anchors.get(target_type, 15000)
        
        if properties_df.empty:
            return {"predicted_price": anchor_price}
            
        properties_df['type'] = properties_df['type'].apply(normalize_text)
        properties_df['location'] = properties_df['location'].apply(normalize_text)
        properties_df['rent'] = properties_df['rent'].astype(float)
        
        # 2. Isolate exact matches for this area
        exact_matches = properties_df[
            (properties_df['type'] == target_type) & 
            (properties_df['location'].str.contains(target_loc))
        ]
        
        if not exact_matches.empty:
            # 3. Filter out catastrophic outliers (e.g. 1RK > 25,000)
            valid_matches = exact_matches[
                (exact_matches['rent'] <= anchor_price * 2.2) & 
                (exact_matches['rent'] >= anchor_price * 0.4)
            ]
            
            if not valid_matches.empty:
                # Use the clean database average for this specific location
                predicted_rent = valid_matches['rent'].mean()
            else:
                # If everything in this area is an extreme outlier, fallback to the anchor
                predicted_rent = anchor_price
        else:
            # 4. Try broader type-only matching if location has no data
            type_matches = properties_df[properties_df['type'] == target_type]
            if not type_matches.empty:
                # Filter outliers globally for this type
                valid_types = type_matches[
                    (type_matches['rent'] <= anchor_price * 2.2) & 
                    (type_matches['rent'] >= anchor_price * 0.4)
                ]
                if not valid_types.empty:
                    predicted_rent = valid_types['rent'].mean()
                else:
                    predicted_rent = anchor_price
            else:
                predicted_rent = anchor_price
            
        return {"predicted_price": int(round(predicted_rent, -2))}
        
    except Exception as e:
        print(f"ML Model Error: {e}")
        return {"predicted_price": None, "message": "Failed to predict"}

@app.get("/")
def read_root():
    return {"message": "AI Recommendation Engine is running!"}

@app.post("/api/recommend")
def get_recommendations(req: RecommendationRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    properties_query = """
        SELECT p.id, p.title, p.description, p.type, p.location, p.rent,
               COALESCE(AVG(r.rating), 0) as average_rating
        FROM properties p 
        LEFT JOIN reviews r ON p.id = r.property_id
        WHERE p.status = 'available'
        GROUP BY p.id, p.title, p.description, p.type, p.location, p.rent
    """
    cursor.execute(properties_query)
    rows = cursor.fetchall()
    properties_df = pd.DataFrame(rows)
    cursor.close()
    conn.close()
    
    if properties_df.empty:
        return {"recommendations": []}

    target_loc = ""
    target_type = ""
    target_rent = float('inf')
    
    for interaction in req.interactions:
        if interaction.action_type == 'search' and interaction.metadata:
            meta = interaction.metadata
            if isinstance(meta, str):
                try: meta = json.loads(meta)
                except Exception: pass
            
            if isinstance(meta, dict):
                loc = meta.get('location', '')
                ptype = meta.get('type', '')
                mrent = meta.get('maxRent', '')
                
                if loc: target_loc = str(loc).lower().strip()
                if ptype: target_type = str(ptype).lower().strip()
                if mrent:
                    try: target_rent = float(mrent)
                    except ValueError: pass

    def calculate_score(row):
        score = 0
        p_type = str(row['type']).lower()
        p_loc = str(row['location']).lower()
        p_rent = float(row['rent'])
        p_rating = float(row['average_rating'])
        
        # 1. Price Match (+30)
        if target_rent != float('inf') and p_rent <= target_rent:
            score += 30
        elif target_rent == float('inf'):
            score += 15 # Baseline if no budget selected
            
        # 2. Location Match (+30)
        if target_loc and target_loc in p_loc:
            score += 30
        elif target_loc == "":
            score += 15 # Baseline
            
        # 3. BHK Match (+30)
        if target_type and target_type in p_type:
            score += 30
        elif target_type == "":
            score += 15 # Baseline
            
        # 4. Rating Match (+10 max, 2 pts per star)
        score += p_rating * 2
        
        return score

    # Compute deterministic scores
    properties_df['score'] = properties_df.apply(calculate_score, axis=1)
    
    # Sort strictly by highest score first
    sorted_df = properties_df.sort_values(by='score', ascending=False)
    
    # Extract Top 5 Best Recommendations
    top_ids = sorted_df.head(5)['id'].tolist()
    
    print(f"--- [AI Logic] user_id: {req.user_id} ---")
    print(f"Targets - Loc: '{target_loc}', Type: '{target_type}', Rent: {target_rent}")
    print(f"Recommendation Sequence (Highest Score First): {top_ids}")
    
    return {"recommendations": [int(x) for x in top_ids]}
