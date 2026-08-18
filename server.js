import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAwsProfiles, fetchInfrastructureData, loadCredentialsFromSecretsManager } from './lib/awsFetcher.js';
import { getMockInfrastructureData } from './lib/mockData.js';
import { generateExecutiveReport } from './lib/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Flexible CORS Configuration to support frontend hosted on S3, CloudFront, or local
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// HTTP Basic Authentication Middleware
app.use((req, res, next) => {
  // Allow container health checks without authentication
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

// Serve static frontend build if hosted on EC2 (or standalone full-stack)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

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
    res.status(500).json({ success: false, error: error.message, profiles: ['default', 'iam-role'] });
  }
});

// API: Fetch infrastructure data
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

  try {
    console.log(`[API] Fetching real AWS data for profile '${profile}' in region '${region}'...`);
    const data = fetchInfrastructureData(profile, region);
    res.json({ success: true, data });
  } catch (error) {
    console.warn(`[API Warning] Live AWS query failed for profile '${profile}': ${error.message}. Returning fallback presentation dataset.`);
    const mockFallback = getMockInfrastructureData(profile, region);
    mockFallback.meta.warning = `Could not connect using profile '${profile}': ${error.message}. Loaded cached presentation dataset.`;
    res.json({
      success: true,
      data: mockFallback
    });
  }
});

// API: Direct mock dataset endpoint
app.get('/api/mock', (req, res) => {
  const profile = req.query.profile || 'pb';
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

// Fallback to index.html for SPA client side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>AWS Infrastructure API Backend Running on Port ${PORT}</h2>
          <p>This backend API supports both <strong>S3 Static Hosting</strong> (cross-origin API calls) and <strong>EC2 Full-Stack Deployment</strong>.</p>
        </div>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AWS DevOps Dashboard Backend listening on http://localhost:${PORT}`);
});
