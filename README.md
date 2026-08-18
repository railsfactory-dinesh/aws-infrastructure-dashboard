# AWS Infrastructure Executive Dashboard

A sleek, modern, executive-ready dashboard built for DevOps Engineers, Project Managers, Team Leads, and Clients to inspect and present AWS infrastructure details without navigating the AWS Management Console.

---

## 🌟 Key Features

- **AWS Profile Chooser**: Dynamically switch between local AWS CLI profiles (e.g. `default`, `production`, `staging`, `devops`), EC2 IAM Roles, or AWS Secrets Manager.
- **ECS Clusters, Services & Task Resource Allocation**:
  - Displays all active ECS clusters (`production`, `staging`, `uat`, `preprod`).
  - Tracks desired vs. running tasks per service with visual health indicators.
  - **Task Specs**: Displays exact CPU (e.g., `1024 (1 vCPU)`) and Memory (e.g., `2048 MiB (2 GB)`) assigned per task, plus total aggregated service allocations.
  - Badges **`EC2`** and **`FARGATE`** launch types cleanly.
  - Maps EC2 container instance host IDs supporting each microservice.
- **EC2 Classification Breakdown**:
  - Categorizes EC2 nodes into **ECS Container EC2 Instances** (nodes registered to ECS) vs. **Standalone Non-ECS EC2 Instances** (Jump Hosts, Bastion nodes, CI/CD workers).
  - Displays Instance Name tag, Instance ID, Type (`t3.xlarge`, `c5.2xlarge`), IPs, Availability Zone, and running/stopped states.
- **RDS Database Overview**:
  - Displays DB Instance Identifiers, Engine & Version (`PostgreSQL 15.4`, `MySQL 8.0.35`), DB Instance Class (`db.r6g.xlarge`), Allocated Storage (GB), Storage Type (`gp2`/`gp3`), and Multi-AZ high availability status.
- **S3 & Storage Lens Analytics**:
  - Lists S3 buckets with creation dates, regions, and S3 Storage Lens dashboard stats (Standard vs. Infrequent Access vs. Glacier storage).
- **Client Presentation Mode**:
  - 1-click toggle to obfuscate sensitive Account IDs, internal private IPs, and ARNs when presenting live to clients.
- **Executive Report Export**:
  - Generates downloadable and printable executive summary HTML reports for stakeholder meetings.
- **Demo / Offline Mode Switch**:
  - Instant high-quality sample snapshot available for offline testing or client demos when disconnected.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ or v20+
- **AWS CLI**: v2 installed and configured (`aws configure` or `~/.aws/credentials` or EC2 IAM Role)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aws-infrastructure-dashboard.git
cd aws-infrastructure-dashboard

# Install dependencies
npm install
```

---

## ☁️ Dual Deployment Support: S3 Static & EC2 Hosting

The dashboard supports **both** S3 static web hosting and EC2 instance deployments out of the box:

### Architecture 1: Deploying Frontend to AWS S3 + Backend API on EC2

1. **Build Frontend with Backend API URL**:
   Set `VITE_API_BASE_URL` to point to your backend API server running on EC2:
   ```bash
   VITE_API_BASE_URL="http://your-ec2-backend-ip:3001" npm run build
   ```
2. **Deploy to S3 Bucket**:
   Sync the built `dist/` directory to your S3 bucket:
   ```bash
   aws s3 sync dist/ s3://your-s3-dashboard-bucket --delete
   ```
3. **Run Backend API on EC2**:
   ```bash
   CORS_ORIGIN="http://your-s3-dashboard-bucket.s3-website-us-east-1.amazonaws.com" AWS_SECRET_NAME="my-read-only-aws-credentials" npm start
   ```

---

### Architecture 2: Deploying Full-Stack on an AWS EC2 Instance (Recommended)

1. **Deploy Repository to EC2**:
   Clone the code onto your EC2 instance.
2. **Configure Authentication**:
   - **Option A (IAM Role - Best Practice)**: Attach an IAM Role with read-only permissions (`ReadOnlyAccess`) to the EC2 instance. The server automatically uses instance metadata (IMDS)—**no hardcoded access keys needed!**
   - **Option B (AWS Secrets Manager)**: Pass environment variable `AWS_SECRET_NAME="my-read-only-secret"`. The server fetches the access keys dynamically on startup.
3. **Start Server**:
   ```bash
   npm run build
   npm start
   ```
   Open **`http://<EC2-Public-IP>:3001`**.

---

## 🔐 IAM Permissions Required

Minimum read-only permissions required for the IAM Role or Secrets Manager user:

- `ecs:ListClusters`, `ecs:DescribeClusters`, `ecs:ListServices`, `ecs:DescribeServices`, `ecs:DescribeTaskDefinition`, `ecs:ListContainerInstances`, `ecs:DescribeContainerInstances`
- `ec2:DescribeInstances`
- `rds:DescribeDBInstances`
- `s3:ListAllMyBuckets`, `s3control:ListStorageLensConfigurations`
- `secretsmanager:GetSecretValue` *(required only if fetching keys from Secrets Manager)*

---

## 🛠️ Project Structure

```
aws-infrastructure-dashboard/
├── README.md               # Project documentation & dual deployment guide
├── server.js               # Express API server with CORS & Secrets Manager support
├── lib/
│   ├── awsFetcher.js       # AWS CLI wrapper & Secrets Manager integration
│   ├── mockData.js         # Realistic presentation dataset for demo mode
│   └── reportGenerator.js  # Executive HTML client report generator
├── src/
│   ├── App.jsx             # Main SPA layout & tab routing
│   ├── index.css           # Dark theme glassmorphism styling
│   └── components/
│       ├── Navbar.jsx      # Top header with profile selector & controls
│       ├── KPICards.jsx    # Summary KPI cards
│       ├── ECSOverview.jsx # ECS Clusters, Services & Task CPU/Mem specs
│       ├── EC2Breakdown.jsx# Categorized EC2 hosts (ECS vs Standalone)
│       ├── RDSOverview.jsx # Database instance types & storage breakdown
│       ├── S3Overview.jsx  # S3 Buckets & Storage Lens analytics
│       └── ExecutiveReportModal.jsx # Executive client report modal
├── dist/                   # Production bundled frontend build
└── package.json
```

---

## 📝 License

DevOps Utility Tool — Designed for Infrastructure Monitoring & Executive Presentations.
