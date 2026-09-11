import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import { seedDatabase } from './seed.js';
import { seedBitcoinDatabase } from './seed_bitcoin.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURL = 'mongodb://localhost:27017';
const dbName = 'RedisTransactions';
const pollIntervalMs = Number(process.env.TXN_POLL_MS || 2000);
let db;

// Connect to MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoURL);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    
    // Auto-seed financial & bitcoin databases if empty
    await seedDatabase(false).catch(err => console.warn('Auto-seed warning (Financial):', err.message));
    await seedBitcoinDatabase(false).catch(err => console.warn('Auto-seed warning (Bitcoin):', err.message));
    
    // Setup change streams or polling fallback
    await setupChangeStreams();
    
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Setup change streams
async function setupChangeStreams() {
  try {
    const hello = await db.admin().command({ hello: 1 });
    if (!hello.setName) {
      console.warn('MongoDB is not running as a replica set. Falling back to polling for realtime updates.');
      startPollingFallback();
      return;
    }
  } catch (e) {
    startPollingFallback();
  }
}

// Standalone MongoDB fallback: poll for new inserts and emit them over sockets.
function startPollingFallback() {
  const collections = [
    { name: 'fraud_transactions', label: 'fraud', event: 'newTransaction' },
    { name: 'legit_transactions', label: 'legitimate', event: 'newTransaction' },
    { name: 'bitcoin_transactions', label: 'bitcoin_tx', event: 'bitcoin:newTransaction' },
    { name: 'bitcoin_risk_events', label: 'bitcoin_risk', event: 'bitcoin:newRiskEvent' }
  ];

  const lastSeenByCollection = new Map();

  const initialize = async () => {
    for (const cfg of collections) {
      const latest = await db.collection(cfg.name).find().sort({ _id: -1 }).limit(1).toArray();
      lastSeenByCollection.set(cfg.name, latest[0]?._id || null);
    }
  };

  const poll = async () => {
    for (const cfg of collections) {
      const lastSeen = lastSeenByCollection.get(cfg.name);
      const query = lastSeen ? { _id: { $gt: lastSeen } } : {};

      const newDocs = await db
        .collection(cfg.name)
        .find(query)
        .sort({ _id: 1 })
        .toArray();

      if (newDocs.length > 0) {
        for (const doc of newDocs) {
          io.emit(cfg.event, doc);
        }
        lastSeenByCollection.set(cfg.name, newDocs[newDocs.length - 1]._id);
      }
    }
  };

  initialize()
    .then(() => {
      setInterval(() => {
        poll().catch((error) => {
          console.error('Polling fallback error:', error.message);
        });
      }, pollIntervalMs);

      console.log(`Polling fallback started (${pollIntervalMs} ms interval)`);
    })
    .catch((error) => {
      console.error('Failed to initialize polling fallback:', error.message);
    });
}

// ==========================================
// Financial Monitoring API Routes (Existing)
// ==========================================
app.get('/api/transactions', async (req, res) => {
  try {
    const fraudTransactions = await db.collection('fraud_transactions').find().toArray();
    const legitTransactions = await db.collection('legit_transactions').find().toArray();
    res.json([...fraudTransactions, ...legitTransactions]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/transactions/stats', async (req, res) => {
  try {
    const fraudCount = await db.collection('fraud_transactions').countDocuments();
    const legitCount = await db.collection('legit_transactions').countDocuments();
    const totalCount = fraudCount + legitCount;
    const fraudPercentage = totalCount > 0 ? (fraudCount / totalCount) * 100 : 0;
    
    const fraudAmountCursor = await db.collection('fraud_transactions').aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$Amount' } } }
    ]).toArray();
    const legitAmountCursor = await db.collection('legit_transactions').aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$Amount' } } }
    ]).toArray();
    
    const fraudAmount = fraudAmountCursor.length > 0 ? fraudAmountCursor[0].totalAmount : 0;
    const legitAmount = legitAmountCursor.length > 0 ? legitAmountCursor[0].totalAmount : 0;
    const totalAmount = fraudAmount + legitAmount;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;
    
    res.json({
      totalTransactions: totalCount,
      fraudTransactions: fraudCount,
      legitTransactions: legitCount,
      fraudPercentage: parseFloat(fraudPercentage.toFixed(2)),
      avgAmount: parseFloat(avgAmount.toFixed(2)),
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction stats' });
  }
});

// ==========================================
// V.E.C.T.O.R-BITCOIN API Routes (New)
// ==========================================

// 1. Status & Overview
app.get('/api/bitcoin/status', async (req, res) => {
  try {
    const totalBlocks = await db.collection('bitcoin_blocks').countDocuments();
    const totalTxs = await db.collection('bitcoin_transactions').countDocuments();
    const totalEntities = await db.collection('bitcoin_entities').countDocuments();
    const criticalLeads = await db.collection('bitcoin_risk_events').countDocuments({ risk_level: 'CRITICAL' });
    const highLeads = await db.collection('bitcoin_risk_events').countDocuments({ risk_level: 'HIGH' });
    
    const latestBlock = await db.collection('bitcoin_blocks').find().sort({ height: -1 }).limit(1).toArray();
    
    // Volume aggregation
    const volCursor = await db.collection('bitcoin_transactions').aggregate([
      { $group: { _id: null, totalBtc: { $sum: '$total_output_btc' } } }
    ]).toArray();
    const totalBtcMonitored = volCursor[0]?.totalBtc || 0.0;

    res.json({
      current_block_height: latestBlock[0]?.height || 840250,
      total_blocks_processed: totalBlocks,
      total_transactions: totalTxs,
      total_entities: totalEntities,
      total_btc_monitored: parseFloat(totalBtcMonitored.toFixed(4)),
      critical_leads_count: criticalLeads,
      high_leads_count: highLeads,
      network: 'regtest',
      node_status: 'connected',
      model_status: 'operational',
      tps: 18.5,
      model_latency_ms: 12.4
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Blocks
app.get('/api/bitcoin/blocks', async (req, res) => {
  try {
    const blocks = await db.collection('bitcoin_blocks').find().sort({ height: -1 }).limit(20).toArray();
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bitcoin/blocks/:height', async (req, res) => {
  try {
    const height = parseInt(req.params.height, 10);
    const block = await db.collection('bitcoin_blocks').findOne({ height: height });
    if (!block) return res.status(404).json({ error: 'Block not found' });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Transactions
app.get('/api/bitcoin/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const txs = await db.collection('bitcoin_transactions').find().sort({ block_height: -1, _id: -1 }).limit(limit).toArray();
    res.json(txs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bitcoin/transactions/:txid', async (req, res) => {
  try {
    const tx = await db.collection('bitcoin_transactions').findOne({ txid: req.params.txid });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Entities & Addresses
app.get('/api/bitcoin/entities', async (req, res) => {
  try {
    const entities = await db.collection('bitcoin_entities').find().sort({ risk_score: -1 }).toArray();
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bitcoin/entity/:entity_id', async (req, res) => {
  try {
    const entity = await db.collection('bitcoin_entities').findOne({ entity_id: req.params.entity_id });
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    const txs = await db.collection('bitcoin_transactions').find({ entity_id: req.params.entity_id }).limit(20).toArray();
    res.json({ entity, transactions: txs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bitcoin/address/:address', async (req, res) => {
  try {
    const addr = req.params.address;
    const txs = await db.collection('bitcoin_transactions').find({
      $or: [{ input_addresses: addr }, { output_addresses: addr }]
    }).limit(30).toArray();
    
    let received = 0, sent = 0;
    for (const tx of txs) {
      if (tx.output_addresses?.includes(addr)) received += (tx.total_output_btc || 0);
      if (tx.input_addresses?.includes(addr)) sent += (tx.total_input_btc || 0);
    }

    res.json({
      address: addr,
      tx_count: txs.length,
      total_received_btc: parseFloat(received.toFixed(4)),
      total_sent_btc: parseFloat(sent.toFixed(4)),
      balance_btc: parseFloat(Math.max(0, received - sent).toFixed(4)),
      transactions: txs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Graph Explorer Subgraph
app.get('/api/bitcoin/graph/:node_id', async (req, res) => {
  try {
    const nodeId = req.params.node_id;
    const txs = await db.collection('bitcoin_transactions').find({
      $or: [{ txid: nodeId }, { entity_id: nodeId }, { input_addresses: nodeId }, { output_addresses: nodeId }]
    }).limit(15).toArray();

    const nodesMap = new Map();
    const edges = [];

    for (const tx of txs) {
      nodesMap.set(tx.txid, {
        id: tx.txid,
        label: `TX:${tx.txid.slice(0, 6)}...`,
        type: 'transaction',
        risk_score: tx.risk_score || 0,
        risk_level: tx.risk_level || 'LOW',
        value_btc: tx.total_output_btc
      });

      for (const inp of tx.inputs || []) {
        if (inp.address) {
          if (!nodesMap.has(inp.address)) {
            nodesMap.set(inp.address, {
              id: inp.address,
              label: `Addr:${inp.address.slice(0, 6)}...`,
              type: 'address',
              risk_score: tx.risk_score || 0,
              risk_level: tx.risk_level || 'LOW'
            });
          }
          edges.push({ source: inp.address, target: tx.txid, edge_type: 'SPENT', value_btc: inp.value_btc });
        }
      }

      for (const out of tx.outputs || []) {
        if (out.address) {
          if (!nodesMap.has(out.address)) {
            nodesMap.set(out.address, {
              id: out.address,
              label: `Addr:${out.address.slice(0, 6)}...`,
              type: 'address',
              risk_score: tx.risk_score || 0,
              risk_level: tx.risk_level || 'LOW'
            });
          }
          edges.push({ source: tx.txid, target: out.address, edge_type: 'CREATED', value_btc: out.value_btc });
        }
      }
    }

    res.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Risk Queue
app.get('/api/bitcoin/risk-queue', async (req, res) => {
  try {
    const leads = await db.collection('bitcoin_risk_events').find().sort({ risk_score: -1, _id: -1 }).toArray();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Behavioral Clusters
app.get('/api/bitcoin/clusters', async (req, res) => {
  try {
    res.json([
      {
        cluster_id: 0,
        name: 'Retail & Micropayment Stream',
        description: 'Frequent sub-0.1 BTC transactions with high young-UTXO turnover.',
        entity_count: 34,
        avg_volume_btc: 0.042,
        avg_velocity_1h: 6.8,
        anomaly_rate_pct: 3.2
      },
      {
        cluster_id: 1,
        name: 'Settlement & Custodial Storage',
        description: 'Infrequent high-value movements with older UTXO holding ages.',
        entity_count: 18,
        avg_volume_btc: 48.5,
        avg_velocity_1h: 0.4,
        anomaly_rate_pct: 1.5
      },
      {
        cluster_id: 2,
        name: 'High-Velocity Layering & Peel Dispersion',
        description: 'Rapid forwarding, multiple hops, asymmetric change splits.',
        entity_count: 12,
        avg_volume_btc: 8.9,
        avg_velocity_1h: 38.2,
        anomaly_rate_pct: 84.6
      }
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Investigations
app.get('/api/bitcoin/investigations', async (req, res) => {
  try {
    const invs = await db.collection('bitcoin_investigations').find().sort({ _id: -1 }).toArray();
    res.json(invs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bitcoin/investigations', async (req, res) => {
  try {
    const body = req.body;
    const newInv = {
      investigation_id: `INV-${Date.now().toString().slice(-6)}`,
      title: body.title || 'Untitled Investigation',
      description: body.description || '',
      priority: body.priority || 'MEDIUM',
      status: 'OPEN',
      risk_score: body.risk_score || 50,
      created_by: body.created_by || 'Analyst Vinith',
      created_at: new Date().toISOString(),
      entities: body.entities || [],
      transactions: body.transactions || [],
      notes: body.notes || ''
    };
    await db.collection('bitcoin_investigations').insertOne(newInv);
    res.status(201).json(newInv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected to real-time feed:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await connectToMongo();
});

export default app;