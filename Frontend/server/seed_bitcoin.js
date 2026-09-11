import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const mongoURL = 'mongodb://localhost:27017';
const dbName = 'RedisTransactions';

export async function seedBitcoinDatabase(force = false) {
  const client = new MongoClient(mongoURL);
  await client.connect();
  const db = client.db(dbName);

  const blockCol = db.collection('bitcoin_blocks');
  const txCol = db.collection('bitcoin_transactions');
  const entityCol = db.collection('bitcoin_entities');
  const riskCol = db.collection('bitcoin_risk_events');
  const invCol = db.collection('bitcoin_investigations');

  const existingTxs = await txCol.countDocuments();
  if (!force && existingTxs > 0) {
    console.log(`Bitcoin data already seeded (${existingTxs} transactions).`);
    await client.close();
    return;
  }

  if (force) {
    await blockCol.deleteMany({});
    await txCol.deleteMany({});
    await entityCol.deleteMany({});
    await riskCol.deleteMany({});
    await invCol.deleteMany({});
    console.log('Cleared existing Bitcoin collections.');
  }

  console.log('⚡ Seeding Bitcoin blocks, transactions, entities, and risk leads...');

  const sampleAddresses = [
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "bc1q9d4j20f28euehwh3k7e2x9v48q983dhh484d8s",
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    "bc1p5d7rjq7g6rd2ee07nvz5fqxs5zj0qq7587tw4w",
    "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5",
    "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97",
    "1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp"
  ];

  const entities = [];
  for (let i = 1; i <= 8; i++) {
    const eid = `ENT_BTC_00${i}`;
    const isHighRisk = i <= 3;
    const score = isHighRisk ? 75 + Math.floor(Math.random() * 20) : 10 + Math.floor(Math.random() * 30);
    entities.push({
      entity_id: eid,
      label: `Cluster Entity #${i}`,
      primary_address: sampleAddresses[(i - 1) % sampleAddresses.length],
      addresses: [sampleAddresses[(i - 1) % sampleAddresses.length], sampleAddresses[(i + 2) % sampleAddresses.length]],
      first_seen: '2024-01-10T08:00:00Z',
      last_seen: new Date().toISOString(),
      tx_count: isHighRisk ? 142 : 28,
      total_received_btc: parseFloat((isHighRisk ? 45.8 + i * 12.3 : 2.4 + i * 0.8).toFixed(4)),
      total_sent_btc: parseFloat((isHighRisk ? 44.1 + i * 11.9 : 2.1 + i * 0.7).toFixed(4)),
      balance_btc: parseFloat((0.2 + i * 0.1).toFixed(4)),
      velocity_1h: isHighRisk ? 8.4 : 1.2,
      velocity_24h: isHighRisk ? 42.0 : 4.5,
      unique_counterparties: isHighRisk ? 68 : 8,
      cluster_id: isHighRisk ? 2 : (i % 2),
      cluster_description: isHighRisk ? 'High-velocity fast-layering & rapid forwarding' : 'Standard merchant & retail flows',
      risk_score: score,
      risk_level: score >= 75 ? 'CRITICAL' : (score >= 50 ? 'HIGH' : (score >= 25 ? 'MEDIUM' : 'LOW')),
      pagerank: isHighRisk ? 0.0124 : 0.0018
    });
  }

  const blocks = [];
  const transactions = [];
  const riskEvents = [];

  const baseHeight = 840250;
  const now = Math.floor(Date.now() / 1000);

  for (let b = 0; b < 10; b++) {
    const height = baseHeight - b;
    const blockTime = now - b * 600;
    const blockHash = crypto.createHash('sha256').update(`block_${height}`).digest('hex');
    
    blocks.push({
      height: height,
      hash: blockHash,
      time: blockTime,
      timestamp: new Date(blockTime * 1000).toISOString(),
      tx_count: 15,
      size: 1420500 + Math.floor(Math.random() * 200000),
      difficulty: 83145000000000,
      status: 'confirmed'
    });

    for (let t = 0; t < 6; t++) {
      const txid = crypto.createHash('sha256').update(`tx_${height}_${t}`).digest('hex');
      const entity = entities[(b + t) % entities.length];
      const isAnom = entity.risk_score >= 50;
      const amount = parseFloat((isAnom ? 2.5 + Math.random() * 15 : 0.05 + Math.random() * 1.5).toFixed(6));
      const fee = parseFloat((0.00008 + Math.random() * 0.0003).toFixed(6));
      
      const inAddr = entity.addresses[0];
      const outAddr = sampleAddresses[(t + 1) % sampleAddresses.length];
      const changeAddr = entity.addresses[1] || inAddr;

      const signals = [];
      const explanations = [];

      if (isAnom) {
        signals.push('velocity_spike', 'rapid_forwarding', 'peel_chain_pattern');
        explanations.push(`Rapid transaction velocity (${entity.velocity_1h} tx/hr), peel-chain structural movement, and sudden high-value transfer.`);
      } else {
        explanations.push('Transaction parameters match standard baseline behaviors.');
      }

      const txDoc = {
        txid: txid,
        block_height: height,
        block_hash: blockHash,
        timestamp: blockTime,
        date: new Date(blockTime * 1000).toISOString().split('T')[0],
        time: new Date(blockTime * 1000).toTimeString().split(' ')[0],
        version: 2,
        size: 245,
        vsize: 180,
        weight: 720,
        entity_id: entity.entity_id,
        input_count: isAnom ? 2 : 1,
        output_count: isAnom ? 2 : 2,
        total_input_btc: parseFloat((amount + fee).toFixed(6)),
        total_output_btc: amount,
        fee_btc: fee,
        inputs: [
          {
            prev_txid: crypto.createHash('sha256').update(`prev_${txid}`).digest('hex'),
            prev_vout: 0,
            value_btc: parseFloat((amount + fee).toFixed(6)),
            script_type: 'P2WPKH',
            address: inAddr
          }
        ],
        outputs: [
          {
            vout: 0,
            value_btc: parseFloat((amount * 0.85).toFixed(6)),
            script_type: 'P2WPKH',
            address: outAddr,
            is_op_return: false
          },
          {
            vout: 1,
            value_btc: parseFloat((amount * 0.15).toFixed(6)),
            script_type: 'P2WPKH',
            address: changeAddr,
            is_op_return: false
          }
        ],
        input_addresses: [inAddr],
        output_addresses: [outAddr, changeAddr],
        risk_score: entity.risk_score,
        risk_level: entity.risk_level,
        signals: signals,
        explanation: explanations.join(' '),
        cluster_id: entity.cluster_id,
        status: 'confirmed'
      };

      transactions.push(txDoc);

      if (isAnom) {
        riskEvents.push({
          lead_id: `LEAD_${txid.slice(0, 10).toUpperCase()}`,
          txid: txid,
          entity_id: entity.entity_id,
          risk_score: entity.risk_score,
          risk_level: entity.risk_level,
          signals: signals,
          explanation: txDoc.explanation,
          timestamp: blockTime,
          created_at: new Date(blockTime * 1000).toISOString()
        });
      }
    }
  }

  // Pre-seed investigations
  const investigations = [
    {
      investigation_id: 'INV-2026-001',
      title: 'High-Velocity Peel-Chain Entity ENT_BTC_001',
      description: 'Multiple rapid forwardings detected through P2WPKH addresses with asymmetrical change splits.',
      priority: 'CRITICAL',
      status: 'UNDER_REVIEW',
      risk_score: 92,
      created_by: 'Lead Investigator',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      entities: ['ENT_BTC_001'],
      transactions: [transactions[0]?.txid || ''],
      notes: 'Monitored 142 hops over a 24-hour cycle. High correlation with mixer-like dispersion motif.'
    },
    {
      investigation_id: 'INV-2026-002',
      title: 'Dormant Whale Awakening ENT_BTC_002',
      description: 'UTXOs dormant for over 18 months spent within sub-minute burst intervals.',
      priority: 'HIGH',
      status: 'OPEN',
      risk_score: 78,
      created_by: 'Analyst Vinith',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      entities: ['ENT_BTC_002'],
      transactions: [transactions[2]?.txid || ''],
      notes: 'Initial hop routed to 4 new Taproot addresses.'
    }
  ];

  await blockCol.insertMany(blocks);
  await txCol.insertMany(transactions);
  await entityCol.insertMany(entities);
  if (riskEvents.length > 0) await riskCol.insertMany(riskEvents);
  await invCol.insertMany(investigations);

  console.log(`✅ Seeded ${blocks.length} blocks, ${transactions.length} txs, ${entities.length} entities, ${riskEvents.length} risk leads, ${investigations.length} investigations.`);
  await client.close();
}

if (process.argv[1] && process.argv[1].includes('seed_bitcoin.js')) {
  seedBitcoinDatabase(true).then(() => {
    console.log('Bitcoin seed complete.');
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
