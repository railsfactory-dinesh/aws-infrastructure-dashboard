import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getAwsProfiles, fetchInfrastructureData } from './lib/awsFetcher.js';
import { getMockInfrastructureData } from './lib/mockData.js';
import { generateExecutiveReport } from './lib/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory session store (token -> { user, createdAt })
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Valid users from env or hardcoded defaults
const VALID_USERS = {
  admin: process.env.BASIC_AUTH_PASS || 'R9tW3xQ8zM5k2026',
  devops: process.env.BASIC_AUTH_PASS || 'R9tW3xQ8zM5k2026'
};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validateToken(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// CORS
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static frontend build (before auth so login page loads)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// PUBLIC routes (no auth needed)
app.get('/healthz', (req, res) => res.send('OK\n'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// POST /api/login — validate credentials, return token
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required.' });
  }

  const expectedPass = VALID_USERS[username];
  if (!expectedPass || password !== expectedPass) {
    console.warn(`[Auth] Failed login attempt for user: '${username}'`);
    return res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }

  const token = generateToken();
  sessions.set(token, { user: username, createdAt: Date.now() });
  console.log(`[Auth] User '${username}' logged in. Active sessions: ${sessions.size}`);

  return res.json({ success: true, token, user: username });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// Auth middleware for all /api/* routes below
app.use('/api', (req, res, next) => {
  // Already handled public routes above
  if (req.path === '/login' || req.path === '/logout' || req.path === '/health') return next();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = validateToken(token);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  req.authUser = session.user;
  next();
});

// API: Debug — test AWS CLI connectivity from container
app.get('/api/debug', (req, res) => {
  const region = req.query.region || 'us-east-1';
  const results = {};

  try {
    results.awsVersion = execSync('aws --version --no-cli-pager', {
      encoding: 'utf8', timeout: 5000, env: { ...process.env, AWS_PAGER: '' }
    }).trim();
  } catch (e) { results.awsVersion = `ERROR: ${e.message}`; }

  try {
    const token = execSync(
      `curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 10" --connect-timeout 2`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    results.imdsToken = token ? `OK (token length: ${token.length})` : 'EMPTY - IMDS not reachable';
  } catch (e) { results.imdsToken = `ERROR: ${e.message}`; }

  try {
    const identity = execSync(`aws sts get-caller-identity --region ${region} --no-cli-pager`, {
      encoding: 'utf8', timeout: 10000, env: { ...process.env, AWS_PAGER: '' }
    });
    results.callerIdentity = JSON.parse(identity);
  } catch (e) { results.callerIdentity = `ERROR: ${e.stderr || e.message}`; }

  try {
    const ec2Raw = execSync(`aws ec2 describe-instances --region ${region} --query "Reservations[*].Instances[*].InstanceId" --output json --no-cli-pager`, {
      encoding: 'utf8', timeout: 15000, env: { ...process.env, AWS_PAGER: '' }
    });
    const ids = JSON.parse(ec2Raw).flat();
    results.ec2InstanceCount = ids.length;
    results.ec2InstanceIds = ids.slice(0, 5);
  } catch (e) { results.ec2InstanceCount = `ERROR: ${e.stderr || e.message}`; }

  results.env = {
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    AWS_PAGER: process.env.AWS_PAGER,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    HOME: process.env.HOME
  };

  res.json({ success: true, debug: results });
});

// API: Get available AWS CLI Profiles
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = getAwsProfiles();
    res.json({ success: true, profiles, environment: process.env.NODE_ENV || 'production' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, profiles: ['iam-role (EC2 metadata)', 'default'] });
  }
});

// API: Fetch infrastructure data — real AWS data
app.get('/api/infrastructure', async (req, res) => {
  const profile = req.query.profile || 'default';
  const region = req.query.region || 'us-east-1';
  const useMock = req.query.mock === 'true';

  if (useMock) {
    console.log(`[API] Returning mock data for profile '${profile}' (${region})`);
    return res.json({ success: true, data: getMockInfrastructureData(profile, region) });
  }

  console.log(`[API] Fetching LIVE AWS data: profile='${profile}' region='${region}' user='${req.authUser}'`);

  try {
    const data = await fetchInfrastructureData(profile, region);
    console.log(`[API] SUCCESS — EC2:${data.summary?.totalEc2 ?? 0} ECS:${data.summary?.totalClusters ?? 0} RDS:${data.summary?.totalRds ?? 0} S3:${data.summary?.totalS3Buckets ?? 0}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error(`[API ERROR] ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Run GET /api/debug to diagnose AWS CLI connectivity.'
    });
  }
});

// API: Mock data
app.get('/api/mock', (req, res) => {
  const profile = req.query.profile || 'default';
  const region = req.query.region || 'us-east-1';
  res.json({ success: true, data: getMockInfrastructureData(profile, region) });
});

// API: Export executive report
app.post('/api/export-report', (req, res) => {
  const { data, clientName } = req.body;
  const html = generateExecutiveReport(data || getMockInfrastructureData(), { clientName });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(200).send('<h2>AWS Infrastructure Dashboard</h2>');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AWS DevOps Dashboard listening on http://localhost:${PORT}`);
  console.log(`   Login endpoint: POST /api/login`);
});
