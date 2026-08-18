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

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone git@github.com:railsfactory-dinesh/aws-infrastructure-dashboard.git
cd aws-infrastructure-dashboard

# Install dependencies
npm install

# Build & Start Server
npm run build
npm start
```
Access at **[http://localhost:3001](http://localhost:3001)**.

---

## 🐳 Docker & Nginx Reverse Proxy Deployment (Port 80)

The application includes an **Nginx reverse proxy container** so you don't need to expose port 3001 directly to users:

```bash
# Start Dashboard + Nginx Reverse Proxy
docker-compose up -d --build
```
Access the dashboard on standard **Port 80** at **`http://localhost`**.

---

## 🔒 Private Network & Secure Deployment Options (ALB / VPN)

If your EC2 instance is running inside a **Private VPC Subnet** without a public IP:

### Architecture 1: Private EC2 + AWS Internal Application Load Balancer (ALB)
1. **EC2 Instance**: Place the instance in a Private Subnet.
2. **Internal ALB**: Provision an **Internal Application Load Balancer (ALB)** in your VPC.
3. **Target Group**: Point the ALB Target Group to the EC2 instance on **Port 80** (Nginx) or **Port 3001**.
4. **Access**: Internal team members access `http://internal-devops-dashboard.yourdomain.internal` over VPN or Direct Connect.

### Architecture 2: Private EC2 + AWS Client VPN / OpenVPN Access
1. **EC2 Instance**: Place the instance in a Private Subnet (e.g. Private IP `10.0.2.45`).
2. **VPN Connection**: Team members connect to AWS Client VPN or OpenVPN Access Server.
3. **Access**: Access the Private IP directly on Port 80 via browser (`http://10.0.2.45`).

---

## ☁️ Step-by-Step Production EC2 Deployment

### Step 1: Attach IAM Role to EC2 Instance (Best Practice)
Attach an IAM Role with read-only permissions (`ReadOnlyAccess` or specific ECS/EC2/RDS/S3 permissions) to the EC2 instance.

### Step 2: Install Docker & Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### Step 3: Clone & Launch Container Stack
```bash
git clone git@github.com:railsfactory-dinesh/aws-infrastructure-dashboard.git
cd aws-infrastructure-dashboard

# Pull latest fixes
git pull origin main

# Option A: Standard Docker Build & Up (Recommended)
docker build -t aws-infrastructure-dashboard-aws-dashboard .
docker-compose up -d

# Option B: Install buildx plugin if using direct docker-compose build
sudo apt-get install -y docker-buildx-plugin
docker-compose up -d --build
```

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
├── Dockerfile              # Multi-stage Docker container build
├── docker-compose.yml      # Docker Compose with Nginx reverse proxy
├── nginx/
│   └── conf.d/
│       └── default.conf    # Nginx reverse proxy configuration (Port 80)
├── README.md               # Project documentation & deployment guide
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
│       ├── KPICards.jsx    # Clickable summary KPI cards
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
