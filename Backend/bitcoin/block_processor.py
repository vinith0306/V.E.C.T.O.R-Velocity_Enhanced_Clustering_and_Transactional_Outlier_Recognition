"""
Bitcoin Block & Stream Processor
Core engine coordinating block ingestion, UTXO state transitions, graph updates,
feature extraction, V.E.C.T.O.R ML evaluation, and multi-model risk scoring.
"""

import os
import json
import joblib
import logging
import numpy as np
import redis
import pymongo
from typing import Dict, Any, List, Optional
from bitcoin.config import (
    REDIS_HOST, REDIS_PORT, REDIS_DB,
    STREAM_BITCOIN_BLOCKS, STREAM_BITCOIN_TXS, STREAM_BITCOIN_RISK,
    MONGO_URI, MONGO_DB_NAME,
    COLL_BLOCKS, COLL_TRANSACTIONS, COLL_UTXOS, COLL_ENTITIES, COLL_ADDRESSES, COLL_RISK_EVENTS,
    MODEL_DIR
)
from bitcoin.rpc_client import BitcoinRPCClient
from bitcoin.transaction_parser import BitcoinTransactionParser
from bitcoin.utxo_manager import UTXOManager
from bitcoin.entity_profiler import EntityProfiler
from bitcoin.transaction_graph import BitcoinTransactionGraph
from bitcoin.bitcoin_rules import BitcoinRulesEngine
from bitcoin.bitcoin_features import BitcoinFeatureEngine
from bitcoin.risk_engine import BitcoinRiskEngine
from bitcoin.schemas import BITCOIN_FEATURE_KEYS

logger = logging.getLogger("VECTOR.BitcoinProcessor")

class BitcoinBlockProcessor:
    def __init__(self, use_mock: bool = False):
        self.rpc = BitcoinRPCClient(force_mock=use_mock)
        self.utxo_mgr = UTXOManager()
        self.entity_profiler = EntityProfiler()
        self.graph = BitcoinTransactionGraph()
        self.risk_engine = BitcoinRiskEngine()
        
        # Redis client
        try:
            self.redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
            self.redis.ping()
        except Exception:
            self.redis = None

        # MongoDB client
        try:
            self.mongo = pymongo.MongoClient(MONGO_URI)
            self.db = self.mongo[MONGO_DB_NAME]
        except Exception:
            self.db = None

        # Load ML models if present
        self.models_loaded = False
        self._load_models()

    def _load_models(self):
        try:
            scaler_path = os.path.join(MODEL_DIR, "bitcoin_scaler.joblib")
            xgb_path = os.path.join(MODEL_DIR, "bitcoin_fallback_xgboost.joblib")
            if os.path.exists(scaler_path) and os.path.exists(xgb_path):
                self.scaler = joblib.load(scaler_path)
                self.xgb_fallback = joblib.load(xgb_path)
                self.models_loaded = True
                logger.info("Loaded Bitcoin ML models and scaler successfully.")
        except Exception as e:
            logger.warning(f"ML models could not be loaded: {e}. Will use heuristic/fallback scoring.")

    def process_block(self, block_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process an entire Bitcoin block: parse transactions, update graph & UTXOs,
        extract behavioral features, run risk scoring, and persist outputs.
        """
        block_height = block_data.get("height", 800000)
        block_hash = block_data.get("hash", "")
        block_time = block_data.get("time")
        raw_txs = block_data.get("tx", [])

        processed_txs = []

        # Store block summary
        if self.db is not None:
            self.db[COLL_BLOCKS].update_one(
                {"hash": block_hash},
                {"$set": {
                    "height": block_height,
                    "hash": block_hash,
                    "time": block_time,
                    "tx_count": len(raw_txs),
                    "size": block_data.get("size", 1000000),
                    "status": "confirmed"
                }},
                upsert=True
            )

        for raw_tx in raw_txs:
            # 1. Parse transaction
            tx = BitcoinTransactionParser.parse_transaction(
                raw_tx,
                block_height=block_height,
                block_hash=block_hash,
                block_time=block_time,
                status="confirmed"
            )

            # 2. Derive entity from common inputs
            primary_addr = tx["input_addresses"][0] if tx["input_addresses"] else (tx["output_addresses"][0] if tx["output_addresses"] else "unknown")
            entity_id = self.entity_profiler.get_or_create_entity(tx["input_addresses"], primary_addr)
            tx["entity_id"] = entity_id

            # 3. Process UTXO lifecycle
            utxo_stats = self.utxo_mgr.process_transaction(tx)

            # 4. Ingest into transaction graph
            self.graph.add_transaction(tx, entity_id=entity_id)
            graph_stats = self.graph.get_node_features(entity_id)
            motif_stats = self.graph.detect_motifs(tx)

            # 5. Evaluate behavioral rules/heuristics
            rule_eval = BitcoinRulesEngine.evaluate_heuristics(tx, utxo_stats=utxo_stats)

            # 6. Extract behavioral features
            features = BitcoinFeatureEngine.compute_features(
                tx=tx,
                entity_id=entity_id,
                entity_history=[],
                utxo_stats=utxo_stats,
                graph_stats=graph_stats,
                motif_stats=motif_stats
            )

            # 7. ML Model Anomaly Scoring
            ml_score = 0.15
            model_type = "xgboost_cold_start"

            if self.models_loaded:
                try:
                    feat_vec = BitcoinFeatureEngine.feature_dict_to_array(features).reshape(1, -1)
                    feat_scaled = self.scaler.transform(feat_vec)
                    prob = self.xgb_fallback.predict_proba(feat_scaled)[0][1]
                    ml_score = float(prob)
                except Exception:
                    ml_score = 0.20

            # 8. Multi-Model Risk Engine
            risk_eval = self.risk_engine.evaluate_risk(
                ml_score=ml_score,
                model_type=model_type,
                features=features,
                rule_eval=rule_eval,
                graph_stats=graph_stats
            )

            tx["risk_score"] = risk_eval["risk_score"]
            tx["risk_level"] = risk_eval["risk_level"]
            tx["risk_components"] = risk_eval["components"]
            tx["signals"] = risk_eval["signals"]
            tx["explanation"] = risk_eval["explanation"]
            tx["cluster_id"] = 0

            processed_txs.append(tx)

            # 9. Persistence to MongoDB
            if self.db is not None:
                self.db[COLL_TRANSACTIONS].update_one({"txid": tx["txid"]}, {"$set": tx}, upsert=True)
                
                # Update entity profile
                self.db[COLL_ENTITIES].update_one(
                    {"entity_id": entity_id},
                    {"$set": {
                        "entity_id": entity_id,
                        "last_seen": tx["timestamp"],
                        "risk_score": tx["risk_score"],
                        "risk_level": tx["risk_level"],
                        "cluster_id": tx["cluster_id"]
                    }, "$inc": {"tx_count": 1, "total_received_btc": tx["total_output_btc"]}},
                    upsert=True
                )

                # Record risk event if HIGH or CRITICAL
                if tx["risk_score"] >= 50:
                    self.db[COLL_RISK_EVENTS].insert_one({
                        "lead_id": f"LEAD_{tx['txid'][:10]}",
                        "txid": tx["txid"],
                        "entity_id": entity_id,
                        "risk_score": tx["risk_score"],
                        "risk_level": tx["risk_level"],
                        "signals": tx["signals"],
                        "explanation": tx["explanation"],
                        "timestamp": tx["timestamp"]
                    })

            # 10. Publish to Redis Stream
            if self.redis is not None:
                try:
                    self.redis.xadd(STREAM_BITCOIN_TXS, {"data": json.dumps({
                        "txid": tx["txid"],
                        "entity_id": entity_id,
                        "amount_btc": tx["total_output_btc"],
                        "risk_score": tx["risk_score"],
                        "risk_level": tx["risk_level"]
                    })})
                except Exception:
                    pass

        return processed_txs
