"""
COMMON CONSTANTS - Single source of truth for feature keys and encodings
This file is imported by ALL scripts (training, inference, producer, consumer)
to ensure consistency across the entire pipeline.
"""

# ========== CRITICAL: Feature Key Order (MUST match training) ==========
FEATURE_KEYS = [
    "Amount",
    "Avg_Amount",
    "Active_Loan_Count",
    "Session_Time",
    "Transactions_Per_Day",
    "Velocity",
    "Large_Transaction_Flag",
    "Large_Transaction_Frequency",
    "Merchant_Type_Code",
    "Device_Type_Code",
]

# ========== Merchant Category Encoding ==========
# IMPORTANT: This map must include BOTH training categories AND UI choices
# to avoid silent mis-encoding to 0 (Luxury Goods)
MERCHANT_MAP = {
    # Training categories
    'Luxury Goods': 0,
    'Travel': 1,
    'Electronics': 2,
    'Apparel': 3,
    'Food Delivery': 4,
    'Online Services': 5,
    'Groceries': 6,
    'Utilities': 7,
    'Medical': 8,
    'Wellness': 9,
    'Organic Grocery': 10,
    'Jewelry': 11,
    'Health': 12,
    'Hygiene Products': 13,
    'Apparel (gifts)': 14,
    'Food': 15,
    'Apparel Deals': 16,
    
    # UI categories (mapped to nearest training category)
    'Grocery': 6,
    'Gas Station': 1,  # → Travel
    'Restaurant': 15,  # → Food
    'Online Shopping': 5,  # → Online Services
    'ATM': 7,  # → Utilities
    'Department Store': 3,  # → Apparel
    'Pharmacy': 8,  # → Medical
    'Entertainment': 5,  # → Online Services
    'Insurance': 5,  # → Online Services
    'Other': 5,  # → Online Services (default safe choice)
    
    # Unknown/invalid
    'UNKNOWN': -1,
}

# ========== Device Type Encoding ==========
DEVICE_MAP = {
    'Mobile': 0,
    'PC': 1,
    'Tablet': 2,
    'UNKNOWN': -1,
}

# ========== Payment Method Encoding (if used) ==========
PAYMENT_METHOD_MAP = {
    'Credit Card': 0,
    'Debit Card': 1,
    'UPI': 2,
    'Net Banking': 3,
    'Wallet': 4,
    'UNKNOWN': -1,
}

# ========== Feature Configuration ==========
NUM_FEATURES = len(FEATURE_KEYS)
ANOMALY_THRESHOLD = 0.5  # Decision boundary for fraud detection


def validate_feature_vector(feature_dict):
    """
    Validate that a feature dictionary has all required keys.
    Raises ValueError if any key is missing.
    """
    missing = [key for key in FEATURE_KEYS if key not in feature_dict]
    if missing:
        raise ValueError(f"Missing features in vector: {missing}")
    return True


def build_feature_array(feature_dict):
    """
    Build a numpy array from a feature dictionary in EXACT FEATURE_KEYS order.
    This is the ONLY way to construct feature vectors for model input.
    """
    import numpy as np
    try:
        validate_feature_vector(feature_dict)
        return np.array([[feature_dict[key] for key in FEATURE_KEYS]], dtype=float)
    except (KeyError, ValueError) as e:
        raise ValueError(f"Cannot build feature array: {e}")
