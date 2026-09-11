"""
Bitcoin Core JSON-RPC Client
Provides robust RPC communication with Bitcoin Core full node (mainnet, testnet, regtest)
along with automated synthetic simulation fallback for development and isolated environments.
"""

import json
import logging
import time
import urllib.request
import urllib.error
import base64
import random
import hashlib
from typing import Dict, Any, List, Optional
from bitcoin.config import (
    BITCOIN_RPC_HOST,
    BITCOIN_RPC_PORT,
    BITCOIN_RPC_USER,
    BITCOIN_RPC_PASSWORD,
    RPC_TIMEOUT
)

logger = logging.getLogger("VECTOR.BitcoinRPC")

class BitcoinRPCClient:
    def __init__(
        self,
        host: str = BITCOIN_RPC_HOST,
        port: int = BITCOIN_RPC_PORT,
        user: str = BITCOIN_RPC_USER,
        password: str = BITCOIN_RPC_PASSWORD,
        timeout: int = RPC_TIMEOUT,
        force_mock: bool = False
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.timeout = timeout
        self.url = f"http://{self.host}:{self.port}"
        self.force_mock = force_mock
        self._is_live_node = None
        self._mock_height = 840100

    def _call(self, method: str, params: Optional[List[Any]] = None) -> Any:
        """Execute a JSON-RPC method call to Bitcoin Core."""
        if self.force_mock or self._is_live_node is False:
            return self._mock_call(method, params or [])

        payload = json.dumps({
            "jsonrpc": "2.0",
            "id": "vector_rpc",
            "method": method,
            "params": params or []
        }).encode("utf-8")

        req = urllib.request.Request(self.url, data=payload, headers={"Content-Type": "application/json"})
        if self.user and self.password:
            auth_str = f"{self.user}:{self.password}".encode("utf-8")
            req.add_header("Authorization", f"Basic {base64.b64encode(auth_str).decode('utf-8')}")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                if res_data.get("error"):
                    raise RuntimeError(f"RPC Error [{method}]: {res_data['error']}")
                self._is_live_node = True
                return res_data.get("result")
        except (urllib.error.URLError, TimeoutError, ConnectionRefusedError) as e:
            if self._is_live_node is None:
                logger.warning(f"Bitcoin Core node not reachable at {self.url} ({e}). Switching to built-in simulation mode.")
                self._is_live_node = False
                return self._mock_call(method, params or [])
            elif not self._is_live_node:
                return self._mock_call(method, params or [])
            else:
                raise e

    def get_blockchain_info(self) -> Dict[str, Any]:
        return self._call("getblockchaininfo")

    def get_block_count(self) -> int:
        return self._call("getblockcount")

    def get_block_hash(self, height: int) -> str:
        return self._call("getblockhash", [height])

    def get_block(self, block_hash: str, verbosity: int = 2) -> Dict[str, Any]:
        """
        Verbosity 2 returns transaction details.
        Verbosity 3 returns previous output info if available.
        """
        return self._call("getblock", [block_hash, verbosity])

    def get_raw_transaction(self, txid: str, verbose: bool = True) -> Dict[str, Any]:
        return self._call("getrawtransaction", [txid, verbose])

    def get_tx_out(self, txid: str, vout: int) -> Optional[Dict[str, Any]]:
        return self._call("gettxout", [txid, vout])

    def get_mempool_info(self) -> Dict[str, Any]:
        return self._call("getmempoolinfo")

    def get_raw_mempool(self) -> List[str]:
        return self._call("getrawmempool")

    # ========== Built-in Realistic Simulation Generator ==========
    def _mock_call(self, method: str, params: List[Any]) -> Any:
        if method == "getblockchaininfo":
            return {
                "chain": "regtest",
                "blocks": self._mock_height,
                "headers": self._mock_height,
                "bestblockhash": hashlib.sha256(str(self._mock_height).encode()).hexdigest(),
                "difficulty": 1.0,
                "mediantime": int(time.time()) - 600,
                "verificationprogress": 1.0,
                "pruned": False
            }
        elif method == "getblockcount":
            self._mock_height += 1
            return self._mock_height
        elif method == "getblockhash":
            height = params[0] if params else self._mock_height
            return hashlib.sha256(f"block_{height}".encode()).hexdigest()
        elif method == "getblock":
            block_hash = params[0]
            height = self._mock_height
            return self._generate_mock_block(block_hash, height)
        elif method == "getmempoolinfo":
            return {
                "loaded": True,
                "size": random.randint(150, 2500),
                "bytes": random.randint(500000, 10000000),
                "usage": random.randint(1000000, 15000000),
                "maxmempool": 300000000,
                "mempoolminfee": 0.00001
            }
        elif method == "getrawmempool":
            return [hashlib.sha256(f"mempool_tx_{i}".encode()).hexdigest() for i in range(10)]
        return {}

    def _generate_mock_block(self, block_hash: str, height: int) -> Dict[str, Any]:
        now = int(time.time())
        num_txs = random.randint(8, 20)
        txs = []
        
        sample_addresses = [
            "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            "bc1q9d4j20f28euehwh3k7e2x9v48q983dhh484d8s",
            "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
            "bc1p5d7rjq7g6rd2ee07nvz5fqxs5zj0qq7587tw4w",
            "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        ]

        for i in range(num_txs):
            txid = hashlib.sha256(f"{block_hash}_tx_{i}_{random.random()}".encode()).hexdigest()
            in_addr = random.choice(sample_addresses)
            out_addr1 = random.choice(sample_addresses)
            out_addr2 = random.choice(sample_addresses)
            val = round(random.uniform(0.01, 15.5), 6)
            
            txs.append({
                "txid": txid,
                "hash": txid,
                "version": 2,
                "size": random.randint(200, 450),
                "vsize": random.randint(160, 380),
                "weight": random.randint(600, 1500),
                "locktime": 0,
                "vin": [
                    {
                        "txid": hashlib.sha256(f"prev_{i}_{random.random()}".encode()).hexdigest(),
                        "vout": 0,
                        "scriptSig": {"asm": "", "hex": ""},
                        "sequence": 4294967295,
                        "prevout": {
                            "value": val + round(random.uniform(0.0001, 0.001), 6),
                            "scriptPubKey": {
                                "asm": f"OP_DUP OP_HASH160 {in_addr} OP_EQUALVERIFY OP_CHECKSIG",
                                "hex": "76a914...",
                                "type": "pubkeyhash",
                                "address": in_addr
                            }
                        }
                    }
                ],
                "vout": [
                    {
                        "value": round(val * 0.9, 6),
                        "n": 0,
                        "scriptPubKey": {
                            "asm": f"OP_DUP OP_HASH160 {out_addr1} OP_EQUALVERIFY OP_CHECKSIG",
                            "hex": "76a914...",
                            "type": "pubkeyhash",
                            "address": out_addr1
                        }
                    },
                    {
                        "value": round(val * 0.1, 6),
                        "n": 1,
                        "scriptPubKey": {
                            "asm": f"OP_DUP OP_HASH160 {out_addr2} OP_EQUALVERIFY OP_CHECKSIG",
                            "hex": "76a914...",
                            "type": "pubkeyhash",
                            "address": out_addr2
                        }
                    }
                ],
                "fee": round(random.uniform(0.00005, 0.0003), 6)
            })

        return {
            "hash": block_hash,
            "confirmations": 1,
            "height": height,
            "version": 536870912,
            "time": now,
            "mediantime": now - 60,
            "nonce": random.randint(1000000, 9999999),
            "bits": "1a00ffff",
            "difficulty": 1.0,
            "nTx": len(txs),
            "previousblockhash": hashlib.sha256(f"prev_block_{height-1}".encode()).hexdigest(),
            "tx": txs
        }
