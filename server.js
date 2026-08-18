import express from 'express';
import cors from 'cors';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getAwsProfiles, fetchInfrastructureData, loadCredentialsFromSecretsManager } from './lib/awsFetcher.js';
import { getMockInfrastructureData } from './lib/mockData.js';
import { generateExecutiveReport } from './lib/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Flexible CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// HTTP Basic Authentication Middleware
app.use((req, res, next) => {
  // Allow container health checks and debug without authentication pass-through
  if (req.path === '/healthz' || req.path === '/api/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const expectedUser = process.env.BASIC_AUTH_USER || 'admin';
  const expectedPass = process.env.BASIC_AUTH_PASS || 'R9tW3xQ8zM5k2026';

  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');

    if ((user === expectedUser || user === 'devops') && pass === expectedPass) {
      return next();
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="AWS Infrastructure Dashboard"');
  return res.status(401).send('Authentication Required');
});

// Optionally load credentials from AWS Secrets Manager if AWS_SECRET_NAME env var is set
if (process.env.AWS_SECRET_NAME) {
  loadCredentialsFromSecretsManager(process.env.AWS_SECRET_NAME, process.env.AWS_REGION || 'us-east-1');
}

// Serve static frontend build
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API: Debug - test AWS CLI connectivity directly from container
app.get('/api/debug', (req, res) => {
  const region = req.query.region || 'us-east-1';
  const results = {};

  // Test 1: Check AWS CLI version
  try {
    results.awsVersion = execSync('aws --version --no-cli-pager', {
      encoding: 'utf8', timeout: 5000, env: { ...process.env, AWS_PAGER: '' }
    }).trim();
  } catch (e) {
    results.awsVersion = `ERROR: ${e.message}`;
  }

  // Test 2: Check IMDS token availability (IMDSv2)
  try {
    const token = execSync(
      `curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 10" --connect-timeout 2`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    results.imdsToken = token ? `OK (token length: ${token.length})` : 'EMPTY TOKEN - IMDS not reachable';
  } catch (e) {
    results.imdsToken = `ERROR: ${e.message}`;
  }

  // Test 3: Get caller identity (fastest IAM role test)
  try {
    const identity = execSync(`aws sts get-caller-identity --region ${region} --no-cli-pager`, {
      encoding: 'utf8', timeout: 10000, env: { ...process.env, AWS_PAGER: '' }
    });
    results.callerIdentity = JSON.parse(identity);
  } catch (e) {
    results.callerIdentity = `ERROR: ${e.stderr || e.message}`;
  }

  // Test 4: Quick EC2 instance count
  try {
    const ec2Raw = execSync(`aws ec2 describe-instances --region ${region} --query "Reservations[*].Instances[*].InstanceId" --output json --no-cli-pager`, {
      encoding: 'utf8', timeout: 15000, env: { ...process.env, AWS_PAGER: '' }
    });
    const ids = JSON.parse(ec2Raw).flat();
    results.ec2InstanceCount = ids.length;
    results.ec2InstanceIds = ids.slice(0, 5); // first 5 only
  } catch (e) {
    results.ec2InstanceCount = `ERROR: ${e.stderr || e.message}`;
  }

  // Test 5: Environment info
  results.env = {
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    AWS_PAGER: process.env.AWS_PAGER,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET (env var)' : 'NOT SET',
    HOME: process.env.HOME,
    PATH: process.env.PATH
  };

  res.json({ success: true, debug: results });
});

// API: Get available AWS CLI Profiles
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = getAwsProfiles();
    res.json({ 
      success: true, 
      profiles,
      secretsManagerActive: Boolean(process.env.AWS_SECRET_NAME),
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, profiles: ['default', 'iam-role (EC2 metadata)'] });
  }
});

// API: Fetch infrastructure data - REAL AWS data only, no silent fallback
app.get('/api/infrastructure', async (req, res) => {
  const profile = req.query.profile || 'default';
  const region = req.query.region || 'us-east-1';
  const useMock = req.query.mock === 'true';

  if (useMock) {
    console.log(`[API] Returning mock data for profile '${profile}' (${region})`);
    return res.json({
      success: true,
      data: getMockInfrastructureData(profile, region)
    });
  }

  console.log(`[API] Fetching LIVE AWS data for profile '${profile}' in region '${region}'...`);

  try {
    const data = await fetchInfrastructureData(profile, region);
    console.log(`[API] SUCCESS - EC2: ${data.summary?.totalEc2 ?? 0}, ECS: ${data.summary?.totalClusters ?? 0}, RDS: ${data.summary?.totalRds ?? 0}, S3: ${data.summary?.totalS3Buckets ?? 0}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error(`[API ERROR] Live AWS query failed for profile '${profile}': ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Run GET /api/debug to diagnose AWS CLI connectivity from within the container.'
    });
  }
});

// API: Direct mock dataset endpoint
app.get('/api/mock', (req, res) => {
  const profile = req.query.profile || 'default';
  const region = req.query.region || 'us-east-1';
  res.json({
    success: true,
    data: getMockInfrastructureData(profile, region)
  });
});

// API: Export executive report HTML
app.post('/api/export-report', (req, res) => {
  const { data, clientName } = req.body;
  const html = generateExecutiveReport(data || getMockInfrastructureData(), { clientName });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>AWS Infrastructure API Backend Running on Port ${PORT}</h2>
          <p>This backend API supports both <strong>S3 Static Hosting</strong> and <strong>EC2 Full-Stack Deployment</strong>.</p>
        </div>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AWS DevOps Dashboard Backend listening on http://localhost:${PORT}`);
  console.log(`   Debug endpoint: http://localhost:${PORT}/api/debug`);
});
