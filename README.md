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

### Prerequisites
- **Node.js**: v18+ or v20+
- **AWS CLI**: v2 installed and configured (`aws configure` or `~/.aws/credentials` or EC2 IAM Role)

### Local Setup

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

## 🐳 Docker & Docker Compose Deployment (Recommended)

You can easily run the application using **Docker Compose**:

### 1. Run with Docker Compose
```bash
# Clone repo & run container
git clone git@github.com:railsfactory-dinesh/aws-infrastructure-dashboard.git
cd aws-infrastructure-dashboard

# Start using Docker Compose
docker-compose up -d --build
```
Access at **[http://localhost:3001](http://localhost:3001)**.

### 2. Docker Compose Commands
- **View Container Logs**: `docker-compose logs -f`
- **Stop Container**: `docker-compose down`
- **Rebuild & Restart**: `docker-compose up -d --build`

---

## ☁️ Production EC2 Deployment Guide

Follow these steps to deploy the application on an AWS EC2 instance:

### Step 1: Launch an EC2 Instance
- **AMI**: Ubuntu 22.04 LTS or Amazon Linux 2023.
- **Instance Type**: `t3.micro` or `t3.small`.
- **Security Group**: Allow Inbound HTTP traffic on port **3001** (or port 80/443 via Nginx reverse proxy).

### Step 2: Attach IAM Role to EC2 (Best Practice)
Attach an IAM Role to the EC2 instance with Read-Only AWS policies:
- `ReadOnlyAccess` (or specific `ecs:Describe*`, `ec2:Describe*`, `rds:Describe*`, `s3:List*` permissions).

### Step 3: Install Docker & Docker Compose on EC2
```bash
# Ubuntu
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### Step 4: Clone & Start Application
```bash
git clone git@github.com:railsfactory-dinesh/aws-infrastructure-dashboard.git
cd aws-infrastructure-dashboard

# Start the dashboard container
docker-compose up -d --build
```
Access your dashboard at **`http://<YOUR_EC2_PUBLIC_IP>:3001`**.

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
├── docker-compose.yml      # Docker Compose configuration
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
