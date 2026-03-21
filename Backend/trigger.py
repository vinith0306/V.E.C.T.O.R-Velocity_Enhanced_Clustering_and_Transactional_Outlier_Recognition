import os
import json
import numpy as np
import joblib
import pandas as pd
import redis
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
import umap
import hdbscan
from xgboost import XGBClassifier
from collections import defaultdict
from datetime import datetime, timedelta
from common_constants import (
    FEATURE_KEYS,
    MERCHANT_MAP,
    DEVICE_MAP,
    NUM_FEATURES,
    ANOMALY_THRESHOLD,
    validate_feature_vector,
    build_feature_array
)

# ========== Constants ==========
JSON_FILE = "user_feature_data.json"
CLUSTER_MAP_FILE = "user_cluster_mapping.json"
MODEL_DIR = "cluster_models"
FRAUD_CSV = "transactions.csv"

os.makedirs(MODEL_DIR, exist_ok=True)

# ========== Redis ==========
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# ========== Load / Save JSON ==========
def load_feature_data():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_feature_data(data):
    with open(JSON_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def load_cluster_mapping():
    if os.path.exists(CLUSTER_MAP_FILE):
        with open(CLUSTER_MAP_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_cluster_mapping(mapping):
    with open(CLUSTER_MAP_FILE, 'w') as f:
        json.dump(mapping, f, indent=4)

# ========== NEW: Trimmed K-Means Aggregation ==========
def trimmed_kmeans_aggregation(user_data, trim_percent=0.15):
    """
    Use trimmed K-means to find robust aggregate features for a user
    Removes outliers (potential fraud) before computing centroids
    """
    try:
        if len(user_data) < 3:
            return fallback_simple_aggregation(user_data)
        
        # Extract transaction-level features
        tx_features = extract_transaction_features(user_data)
        
        if len(tx_features) < 3:
            return fallback_simple_aggregation(user_data)
        
        # Standardize features for clustering
        numeric_features = tx_features.select_dtypes(include=[np.number])
        
        if len(numeric_features.columns) == 0:
            return fallback_simple_aggregation(user_data)
            
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(numeric_features)
        
        # Use K-means with k=1 to find initial centroid
        kmeans = KMeans(n_clusters=1, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        
        # Calculate distances to centroid
        distances = np.linalg.norm(X_scaled - kmeans.cluster_centers_[0], axis=1)
        
        # Remove most extreme points (likely outliers/fraud)
        n_trim = max(1, int(len(tx_features) * trim_percent))
        if n_trim < len(tx_features):
            # Keep the closest points (normal transactions)
            keep_indices = np.argsort(distances)[:-n_trim]
            trimmed_data = tx_features.iloc[keep_indices]
            print(f"   Trimmed {n_trim} outliers from {len(tx_features)} transactions")
        else:
            trimmed_data = tx_features
        
        # Compute robust centroid from trimmed data
        centroid = {}
        for col in numeric_features.columns:
            centroid[col] = float(trimmed_data[col].mean())
        
        # Add derived features
        centroid = add_derived_features(centroid, tx_features, trimmed_data, user_data)
        
        return centroid
        
    except Exception as e:
        print(f"   ⚠️ Error in trimmed k-means, falling back to simple aggregation: {e}")
        return fallback_simple_aggregation(user_data)

def extract_transaction_features(user_data):
    """Extract features for each individual transaction"""
    features = []
    
    amounts = user_data['Amount'].astype(float)
    user_avg = amounts.mean()
    
    # Convert dates for time-based features
    user_data = user_data.copy()
    if 'Date' in user_data.columns:
        user_data['Date'] = pd.to_datetime(user_data['Date'])
        user_data = user_data.sort_values('Date')
    
    for idx, row in user_data.iterrows():
        tx_features = {}
        
        # Amount-based features
        tx_features['Amount'] = float(row['Amount'])
        tx_features['Amount_Deviation'] = abs(float(row['Amount']) - user_avg)
        tx_features['Amount_Ratio'] = float(row['Amount']) / max(user_avg, 1.0)
        
        # Session and loan features
        tx_features['Session_Time'] = float(row.get('Session_Time', 0))
        tx_features['Active_Loan_Count'] = float(row.get('Active_Loan_Count', 0))
        
        # Categorical features
        merchant_code = MERCHANT_MAP.get(row.get('Merchant_Type', ''), 0)
        device_code = DEVICE_MAP.get(row.get('Device_Type', ''), 0)
        tx_features['Merchant_Type_Code'] = float(merchant_code)
        tx_features['Device_Type_Code'] = float(device_code)
        
        # Time-based features (if available)
        if 'Date' in user_data.columns:
            tx_features['Hour_Of_Day'] = float(row['Date'].hour)
            tx_features['Day_Of_Week'] = float(row['Date'].weekday())
        else:
            tx_features['Hour_Of_Day'] = 12.0  # Default noon
            tx_features['Day_Of_Week'] = 1.0   # Default Tuesday
        
        features.append(tx_features)
    
    return pd.DataFrame(features)

def add_derived_features(centroid, all_data, normal_data, original_user_data):
    """Add derived aggregate features based on the robust centroid"""
    
    # Ensure Avg_Amount matches Amount for consistency
    if 'Amount' in centroid:
        centroid['Avg_Amount'] = centroid['Amount']
    
    # Calculate time-based features from original data
    if 'Date' in original_user_data.columns:
        dates = pd.to_datetime(original_user_data['Date'])
        date_range = (dates.max() - dates.min()).days + 1
        centroid['Transactions_Per_Day'] = float(len(normal_data) / max(date_range, 1))
        
        # Velocity (transactions per month)
        months = dates.dt.to_period('M').nunique()
        centroid['Velocity'] = float(len(normal_data) / max(months, 1))
    else:
        centroid['Transactions_Per_Day'] = 1.0
        centroid['Velocity'] = 1.0
    
    # Large transaction analysis
    if 'Amount' in normal_data.columns:
        normal_amounts = normal_data['Amount']
        avg_normal_amount = normal_amounts.mean()
        large_threshold = avg_normal_amount * 1.5
        
        # Check if ANY transaction (including outliers) exceeds threshold
        all_amounts = all_data['Amount']
        large_txns = all_amounts[all_amounts > large_threshold]
        centroid['Large_Transaction_Flag'] = float(1 if len(large_txns) > 0 else 0)
        
        # Large transaction frequency
        if len(large_txns) > 1 and 'Date' in original_user_data.columns:
            # Estimate frequency based on transaction count
            total_days = (pd.to_datetime(original_user_data['Date']).max() - 
                         pd.to_datetime(original_user_data['Date']).min()).days + 1
            large_tx_freq = total_days / max(len(large_txns), 1)
            centroid['Large_Transaction_Frequency'] = float(large_tx_freq)
        else:
            centroid['Large_Transaction_Frequency'] = 30.0
    else:
        centroid['Large_Transaction_Flag'] = 0.0
        centroid['Large_Transaction_Frequency'] = 30.0
    
    return centroid

def fallback_simple_aggregation(user_data):
    """Fallback for users with very few transactions"""
    amounts = user_data['Amount'].astype(float)
    session_times = user_data['Session_Time'].astype(float) if 'Session_Time' in user_data.columns else pd.Series([0]).astype(float)
    active_loans = user_data['Active_Loan_Count'].astype(float) if 'Active_Loan_Count' in user_data.columns else pd.Series([0]).astype(float)
    
    # Date processing for time-based features
    if 'Date' in user_data.columns:
        dates = pd.to_datetime(user_data['Date'])
        date_range = (dates.max() - dates.min()).days + 1
        tx_per_day = len(user_data) / max(date_range, 1)
        months = dates.dt.to_period('M').nunique()
        velocity = len(user_data) / max(months, 1)
    else:
        tx_per_day = 1.0
        velocity = 1.0
    
    # Large transaction analysis
    avg_amount = amounts.mean()
    large_threshold = avg_amount * 1.5
    large_txns = amounts[amounts > large_threshold]
    large_txn_flag = 1 if len(large_txns) > 0 else 0
    
    # Merchant and device encoding
    merchant_categories = user_data['Merchant_Type'] if 'Merchant_Type' in user_data.columns else pd.Series([''])
    device_types = user_data['Device_Type'] if 'Device_Type' in user_data.columns else pd.Series([''])
    
    merchant_mode = merchant_categories.mode()
    most_common_merchant = merchant_mode.iloc[0] if len(merchant_mode) > 0 else ''
    device_mode = device_types.mode()
    most_common_device = device_mode.iloc[0] if len(device_mode) > 0 else ''
    
    merchant_code = MERCHANT_MAP.get(most_common_merchant, 0)
    device_code = DEVICE_MAP.get(most_common_device, 0)
    
    return {
        'Amount': float(avg_amount),
        'Avg_Amount': float(avg_amount),
        'Active_Loan_Count': float(active_loans.mean()),
        'Session_Time': float(session_times.mean()),
        'Transactions_Per_Day': float(tx_per_day),
        'Velocity': float(velocity),
        'Large_Transaction_Flag': float(large_txn_flag),
        'Large_Transaction_Frequency': 30.0,
        'Merchant_Type_Code': float(merchant_code),
        'Device_Type_Code': float(device_code)
    }

# ========== Enhanced CSV Processing with Trimmed K-Means ==========
def process_csv_to_user_features():
    """Process CSV data into user-level feature representations using trimmed K-means"""
    if not os.path.exists(FRAUD_CSV):
        print("❌ No fraud.csv found. Cannot bootstrap.")
        return {}

    print("📥 Processing fraud.csv with trimmed K-means aggregation...")
    df = pd.read_csv(FRAUD_CSV)
    df = df.dropna(subset=["User_ID", "Amount", "Date"])

    print(f"📊 Loaded {len(df)} transactions from CSV")
    
    user_features = {}
    
    for user_id, user_data in df.groupby('User_ID'):
        try:
            print(f"🔄 Processing user {user_id} with {len(user_data)} transactions...")
            
            # Use trimmed K-means instead of simple aggregation
            robust_features = trimmed_kmeans_aggregation(user_data, trim_percent=0.15)
            
            # Ensure all required features are present
            for key in FEATURE_KEYS:
                if key not in robust_features:
                    robust_features[key] = 0.0
            
            user_features[user_id] = robust_features
            
        except Exception as e:
            print(f"⚠️ Error processing user {user_id}: {e}")
            continue
    
    print(f"✅ Processed {len(user_features)} users with trimmed K-means aggregation")
    return user_features

# ========== Enhanced Redis Integration ==========
def update_from_redis(json_data):
    """Update user features from Redis data"""
    print("🔄 Syncing from Redis...")
    new_count = 0
    updated_count = 0
    
    for key in r.scan_iter("user:*"):
        if ":tx:" in key or ":velocity:" in key:
            continue
            
        user_id = key.split(":")[1]
        user_hash = r.hgetall(key)
        
        if not user_hash:
            continue
            
        # Create feature vector from Redis data
        try:
            redis_features = {}
            for feature_key in FEATURE_KEYS:
                if feature_key in ['Merchant_Type_Code', 'Device_Type_Code']:
                    # These should be encoded values already in Redis
                    redis_features[feature_key] = float(user_hash.get(feature_key, 0.0))
                else:
                    redis_features[feature_key] = float(user_hash.get(feature_key, 0.0))
            
            if user_id not in json_data:
                new_count += 1
                json_data[user_id] = redis_features
            else:
                # Update existing user data
                json_data[user_id].update(redis_features)
                updated_count += 1
                
        except Exception as e:
            print(f"⚠️ Error processing Redis data for user {user_id}: {e}")
            continue

    print(f"✅ Added {new_count} new users, updated {updated_count} users from Redis")
    return json_data

# ========== FIXED: Clustering + Model Training ==========
def generate_user_cluster_hashmap():
    print("🔁 Starting comprehensive clustering and training...")

    # Step 1: Load existing data or process CSV
    json_data = load_feature_data()
    if not json_data:
        json_data = process_csv_to_user_features()
        if json_data:
            save_feature_data(json_data)

    # Step 2: Update from Redis
    if json_data:
        json_data = update_from_redis(json_data)
        save_feature_data(json_data)
    
    if not json_data:
        print("❌ No data available for clustering.")
        return {}

    print(f"📊 Total users for clustering: {len(json_data)}")

    # Step 3: Prepare feature matrix
    user_ids = list(json_data.keys())
    feature_matrix = []
    
    for user_id in user_ids:
        user_features = json_data[user_id]
        # Ensure all 10 features are present in correct order
        feature_row = [user_features.get(key, 0.0) for key in FEATURE_KEYS]
        feature_matrix.append(feature_row)
    
    feature_matrix = np.array(feature_matrix)
    print(f"📈 Feature matrix shape: {feature_matrix.shape}")
    
    # Validate feature matrix
    if feature_matrix.shape[1] != 10:
        print(f"❌ Feature matrix has {feature_matrix.shape[1]} features, expected 10")
        return {}

    # Step 4: UMAP + HDBSCAN Clustering
    print("🧮 Performing UMAP dimensionality reduction...")
    reducer = umap.UMAP(n_components=2, random_state=42, n_neighbors=15, min_dist=0.1)
    embedding = reducer.fit_transform(feature_matrix)

    print("🔍 Performing HDBSCAN clustering...")
    clusterer = hdbscan.HDBSCAN(min_cluster_size=max(10, len(user_ids)//20), 
                                min_samples=5, 
                                cluster_selection_epsilon=0.1)
    clusters = clusterer.fit_predict(embedding)

    # Step 5: Create cluster mapping and group data
    cluster_map = {}
    cluster_data = defaultdict(list)
    cluster_stats = defaultdict(int)

    for i, user_id in enumerate(user_ids):
        cluster = int(clusters[i]) if clusters[i] >= 0 else -1
        cluster_map[user_id] = {"Cluster": cluster}
        cluster_data[cluster].append(feature_matrix[i])
        cluster_stats[cluster] += 1

    print(f"📊 Clustering Results:")
    for cluster_id, count in sorted(cluster_stats.items()):
        noise_label = " (Noise)" if cluster_id == -1 else ""
        print(f"   Cluster {cluster_id}{noise_label}: {count} users")

    # Step 5.5: FIXED - Train Fallback XGBoost Model on all data
    print("\n🚀 Training fallback XGBoost model on all transactions...")
    try:
        df_all = pd.read_csv(FRAUD_CSV)
        df_all = df_all.dropna(subset=["User_ID", "Amount", "Date"])
        
        # Feature engineering for fallback
        df_all['Amount'] = df_all['Amount'].astype(float)
        df_all['Avg_Amount'] = df_all.groupby('User_ID')['Amount'].transform('mean')
        df_all['Active_Loan_Count'] = df_all['Active_Loan_Count'].astype(float)
        df_all['Session_Time'] = df_all['Session_Time'].astype(float)
        
        # Process merchant and device codes
        df_all['Merchant_Type_Code'] = df_all['Merchant_Type'].map(MERCHANT_MAP).fillna(0)
        df_all['Device_Type_Code'] = df_all['Device_Type'].map(DEVICE_MAP).fillna(0)
        
        # Timestamp processing
        df_all['Date'] = pd.to_datetime(df_all['Date'], errors='coerce')
        df_all['Tx_Date'] = df_all['Date'].dt.date
        
        # Calculate transactions per day
        tx_per_day = df_all.groupby(['User_ID', 'Tx_Date']).size().groupby('User_ID').mean()
        df_all['Transactions_Per_Day'] = df_all['User_ID'].map(tx_per_day).fillna(1.0)
        
        # Calculate velocity
        months_per_user = df_all.groupby('User_ID')['Date'].apply(lambda x: x.dt.to_period('M').nunique())
        velocity = df_all.groupby('User_ID').size() / months_per_user.replace(0, 1)
        df_all['Velocity'] = df_all['User_ID'].map(velocity).fillna(1.0)
        
        # Calculate large transaction features
        df_all['Large_Transaction_Flag'] = 0.0
        df_all['Large_Transaction_Frequency'] = 30.0
        
        for user_id in df_all['User_ID'].unique():
            user_mask = df_all['User_ID'] == user_id
            user_amounts = df_all.loc[user_mask, 'Amount']
            
            if len(user_amounts) > 0:
                avg_amt = user_amounts.mean()
                large_threshold = avg_amt * 1.5
                large_txns = user_amounts[user_amounts > large_threshold]
                
                flag = 1.0 if len(large_txns) > 0 else 0.0
                df_all.loc[user_mask, 'Large_Transaction_Flag'] = flag
                
                if len(large_txns) > 1:
                    user_dates = df_all.loc[user_mask, 'Date'].sort_values()
                    large_dates = df_all.loc[user_mask & (df_all['Amount'] > large_threshold), 'Date']
                    if len(large_dates) > 1:
                        date_diffs = large_dates.sort_values().diff().dt.days.dropna()
                        if len(date_diffs) > 0:
                            avg_freq = date_diffs.mean()
                            df_all.loc[user_mask, 'Large_Transaction_Frequency'] = max(avg_freq, 1.0)
        
        # Create binary labels: use Anomaly column if available, else flag suspicious transactions
        if 'Anomaly' in df_all.columns:
            y_all = df_all['Anomaly'].astype(int)
        else:
            # Default: transactions with high Amount (outliers) are anomalies
            amount_threshold = df_all['Amount'].quantile(0.95)
            y_all = (df_all['Amount'] > amount_threshold).astype(int)
        
        # Build feature matrix
        feature_matrix_all = df_all[FEATURE_KEYS].fillna(0).values
        print(f"📊 Fallback training data shape: {feature_matrix_all.shape} with {y_all.sum()} anomalies")
        
        # Scale data
        fallback_scaler = MinMaxScaler()
        X_scaled_all = fallback_scaler.fit_transform(feature_matrix_all)
        
        # Train XGBoost classifier
        fallback_model = XGBClassifier(
            objective='binary:logistic',
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbosity=0
        )
        fallback_model.fit(X_scaled_all, y_all)
        
        # Save fallback model and scaler
        joblib.dump(fallback_model, f"{MODEL_DIR}/fallback_xgboost_model.joblib")
        joblib.dump(fallback_scaler, f"{MODEL_DIR}/fallback_scaler.joblib")
        
        print(f"✅ Fallback XGBoost model trained on {len(X_scaled_all)} transactions")
        print(f"   📁 Model saved: {MODEL_DIR}/fallback_xgboost_model.joblib")
        print(f"   📁 Scaler saved: {MODEL_DIR}/fallback_scaler.joblib")
        
    except Exception as e:
        print(f"❌ Error training fallback XGBoost model: {e}")
        import traceback
        traceback.print_exc()

    # Step 6: FIXED - Train Isolation Forest models using all transactions per cluster
    print("📂 Loading all transactions for cluster-level training...")
    df = pd.read_csv(FRAUD_CSV)
    df = df.dropna(subset=["User_ID", "Amount", "Date"])
    trained_clusters = 0
    print("📋 Columns in full dataframe:", df.columns.tolist())

    for cluster_id, _ in cluster_data.items():
        if cluster_id == -1:
            continue

        cluster_users = [uid for uid, meta in cluster_map.items() if meta['Cluster'] == cluster_id]
        cluster_df = df[df['User_ID'].isin(cluster_users)].copy()
        
        if len(cluster_df) < 10:
            print(f"⚠️ Cluster {cluster_id} has only {len(cluster_df)} transactions, skipping.")
            continue

        try:
            # Extract and process basic features
            cluster_df['Amount'] = cluster_df['Amount'].astype(float)
            cluster_df['Avg_Amount'] = cluster_df.groupby('User_ID')['Amount'].transform('mean')
            cluster_df['Active_Loan_Count'] = cluster_df['Active_Loan_Count'].astype(float)
            cluster_df['Session_Time'] = cluster_df['Session_Time'].astype(float)

            # Process merchant and device codes
            cluster_df['Merchant_Type_Code'] = cluster_df['Merchant_Type'].map(MERCHANT_MAP).fillna(0)
            cluster_df['Device_Type_Code'] = cluster_df['Device_Type'].map(DEVICE_MAP).fillna(0)

            # Timestamp processing for time-based features
            cluster_df['Date'] = pd.to_datetime(cluster_df['Date'], errors='coerce')
            cluster_df['Tx_Date'] = cluster_df['Date'].dt.date
            
            # Calculate transactions per day per user
            tx_per_day = cluster_df.groupby(['User_ID', 'Tx_Date']).size().groupby('User_ID').mean()
            cluster_df['Transactions_Per_Day'] = cluster_df['User_ID'].map(tx_per_day).fillna(1.0)

            # Calculate velocity (transactions per month)
            months_per_user = cluster_df.groupby('User_ID')['Date'].apply(lambda x: x.dt.to_period('M').nunique())
            velocity = cluster_df.groupby('User_ID').size() / months_per_user.replace(0, 1)
            cluster_df['Velocity'] = cluster_df['User_ID'].map(velocity).fillna(1.0)

            # FIXED: Calculate large transaction features properly
            print(f"🔧 Computing large transaction features for cluster {cluster_id}...")
            
            # Initialize with default values
            cluster_df['Large_Transaction_Flag'] = 0.0
            cluster_df['Large_Transaction_Frequency'] = 30.0
            
            # Calculate for each user separately
            for user_id in cluster_df['User_ID'].unique():
                user_mask = cluster_df['User_ID'] == user_id
                user_amounts = cluster_df.loc[user_mask, 'Amount']
                
                if len(user_amounts) > 0:
                    avg_amt = user_amounts.mean()
                    large_threshold = avg_amt * 1.5
                    large_txns = user_amounts[user_amounts > large_threshold]
                    
                    # Set flag
                    flag = 1.0 if len(large_txns) > 0 else 0.0
                    cluster_df.loc[user_mask, 'Large_Transaction_Flag'] = flag
                    
                    # Calculate frequency
                    if len(large_txns) > 1:
                        user_dates = cluster_df.loc[user_mask, 'Date'].sort_values()
                        large_dates = cluster_df.loc[user_mask & (cluster_df['Amount'] > large_threshold), 'Date']
                        if len(large_dates) > 1:
                            date_diffs = large_dates.sort_values().diff().dt.days.dropna()
                            if len(date_diffs) > 0:
                                avg_freq = date_diffs.mean()
                                cluster_df.loc[user_mask, 'Large_Transaction_Frequency'] = max(avg_freq, 1.0)

            # Verify all required features are present
            missing_features = [f for f in FEATURE_KEYS if f not in cluster_df.columns]
            if missing_features:
                print(f"⚠️ Missing features for cluster {cluster_id}: {missing_features}")
                continue

            # Build feature matrix
            feature_matrix_cluster = cluster_df[FEATURE_KEYS].fillna(0).values
            print(f"📊 Feature matrix for cluster {cluster_id}: shape {feature_matrix_cluster.shape}")

            # Scale and train
            scaler = MinMaxScaler()
            X_scaled = scaler.fit_transform(feature_matrix_cluster)

            model = IsolationForest(contamination=0.1, n_estimators=100, random_state=42)
            model.fit(X_scaled)

            # Get score range for normalization
            train_scores = model.decision_function(X_scaled)
            score_min, score_max = train_scores.min(), train_scores.max()
            
            # Save everything as one bundle
            bundle = (model, scaler, score_min, score_max)
            joblib.dump(bundle, f"{MODEL_DIR}/cluster_{cluster_id}_bundle.pkl")

            trained_clusters += 1
            print(f"✅ Trained Isolation Forest for Cluster {cluster_id} on {len(X_scaled)} transactions")

        except Exception as e:
            print(f"❌ Error training model for cluster {cluster_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    # Step 7: Save cluster mapping
    save_cluster_mapping(cluster_map)
    
    print(f"""
🏁 Clustering and Training Complete!
   📊 Total Users: {len(user_ids)}
   🎯 Clusters Found: {len([c for c in cluster_stats.keys() if c != -1])}
   🤖 Per-Cluster Models Trained: {trained_clusters}
   🚀 Fallback XGBoost Model: Trained
   📁 Cluster mapping saved to: {CLUSTER_MAP_FILE}
   💾 User features saved to: {JSON_FILE}
   📦 Models directory: {MODEL_DIR}/
   🔧 Used Trimmed K-Means for robust aggregation
    """)

    return cluster_map

# ========== Quick Load Function ==========
def quick_load_cluster_mapping():
    """Quick load of cluster mapping without recomputing"""
    cluster_map = load_cluster_mapping()
    if cluster_map:
        print(f"⚡ Quick loaded cluster mapping for {len(cluster_map)} users")
        return cluster_map
    else:
        print("⚠️ No existing cluster mapping found, running full clustering...")
        return generate_user_cluster_hashmap()

if __name__ == "__main__":
    # For testing
    result = generate_user_cluster_hashmap()
    print(f"Generated cluster mapping for {len(result)} users")