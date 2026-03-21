import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import cors from 'cors';

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
    
    // Setup change streams to watch for new transactions
    await setupChangeStreams();
    
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Setup change streams to watch for new transactions
async function setupChangeStreams() {
  // Change streams require replica set or sharded cluster.
  const hello = await db.admin().command({ hello: 1 });
  if (!hello.setName) {
    console.warn('MongoDB is not running as a replica set. Falling back to polling for realtime updates.');
    startPollingFallback();
    return;
  }

  const fraudCollection = db.collection('fraud_transactions');
  const legitCollection = db.collection('legit_transactions');
  
  const fraudChangeStream = fraudCollection.watch([], { fullDocument: 'updateLookup' });
  const legitChangeStream = legitCollection.watch([], { fullDocument: 'updateLookup' });
  
  fraudChangeStream.on('change', async (change) => {
    if (change.operationType === 'insert') {
      const newTransaction = change.fullDocument;
      console.log('New fraud transaction detected:', newTransaction._id);
      io.emit('newTransaction', newTransaction);
    }
  });
  
  legitChangeStream.on('change', async (change) => {
    if (change.operationType === 'insert') {
      const newTransaction = change.fullDocument;
      console.log('New legitimate transaction detected:', newTransaction._id);
      io.emit('newTransaction', newTransaction);
    }
  });

  const onChangeStreamError = (error) => {
    console.error('Change stream error. Realtime updates disabled:', error.message);
    fraudChangeStream.close().catch(() => {});
    legitChangeStream.close().catch(() => {});
  };

  fraudChangeStream.on('error', onChangeStreamError);
  legitChangeStream.on('error', onChangeStreamError);
  
  console.log('Change streams set up successfully');
}

// Standalone MongoDB fallback: poll for new inserts and emit them over sockets.
function startPollingFallback() {
  const collections = [
    { name: 'fraud_transactions', label: 'fraud' },
    { name: 'legit_transactions', label: 'legitimate' }
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

      const newTransactions = await db
        .collection(cfg.name)
        .find(query)
        .sort({ _id: 1 })
        .toArray();

      if (newTransactions.length > 0) {
        for (const tx of newTransactions) {
          console.log(`New ${cfg.label} transaction detected (polling):`, tx._id);
          io.emit('newTransaction', tx);
        }
        lastSeenByCollection.set(cfg.name, newTransactions[newTransactions.length - 1]._id);
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

// API Routes
app.get('/api/transactions', async (req, res) => {
  try {
    const fraudTransactions = await db.collection('fraud_transactions').find().toArray();
    const legitTransactions = await db.collection('legit_transactions').find().toArray();
    const allTransactions = [...fraudTransactions, ...legitTransactions];
    
    res.json(allTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/transactions/stats', async (req, res) => {
  try {
    const fraudCount = await db.collection('fraud_transactions').countDocuments();
    const legitCount = await db.collection('legit_transactions').countDocuments();
    const totalCount = fraudCount + legitCount;
    
    const fraudPercentage = totalCount > 0 ? (fraudCount / totalCount) * 100 : 0;
    
    // Calculate average amount
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
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch transaction stats' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
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