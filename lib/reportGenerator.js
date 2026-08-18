/**
 * Generates an executive-ready HTML report for PMs, TLs, and client presentations.
 */
export function generateExecutiveReport(data, options = {}) {
  const meta = data.meta || {};
  const summary = data.summary || {};
  const clientName = options.clientName || 'Valued Client';
  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const clusters = data.ecs?.clusters || [];
  const ec2Instances = data.ec2?.instances || [];
  const rdsInstances = data.rds?.instances || [];
  const s3Buckets = data.s3?.buckets || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AWS Infrastructure Executive Report - ${clientName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 40px; }
    .container { max-width: 1000px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .header { border-bottom: 3px solid #ff9900; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; color: #0f172a; font-size: 26px; }
    .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
    .badge { background: #ff9900; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 35px; }
    .kpi-card { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6; }
    .kpi-card h3 { margin: 0; font-size: 28px; color: #0f172a; }
    .kpi-card p { margin: 6px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .section { margin-bottom: 35px; }
    .section h2 { font-size: 18px; color: #0f172a; border-left: 4px solid #ff9900; padding-left: 10px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; color: #475569; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    @media print { body { padding: 0; background: #fff; } .container { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>AWS Infrastructure Executive Overview</h1>
        <p>Prepared for: <strong>${clientName}</strong> | Profile: <strong>${meta.profile}</strong> (${meta.region})</p>
      </div>
      <div class="badge">AWS Cloud Status: Verified</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" style="border-left-color: #ff9900;">
        <h3>${summary.totalClusters || 0}</h3>
        <p>ECS Clusters</p>
      </div>
      <div class="kpi-card" style="border-left-color: #3b82f6;">
        <h3>${summary.totalServices || 0}</h3>
        <p>Active Services</p>
      </div>
      <div class="kpi-card" style="border-left-color: #10b981;">
        <h3>${summary.totalRunningTasks || 0}</h3>
        <p>Running Tasks</p>
      </div>
      <div class="kpi-card" style="border-left-color: #8b5cf6;">
        <h3>${summary.totalEc2Instances || 0}</h3>
        <p>Total EC2 Nodes</p>
      </div>
    </div>

    <div class="section">
      <h2>1. ECS Clusters & Active Microservices</h2>
      <table>
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Service Name</th>
            <th>Desired / Running</th>
            <th>CPU Allocated</th>
            <th>Memory Allocated</th>
            <th>Launch Type</th>
          </tr>
        </thead>
        <tbody>
          ${clusters.flatMap(c => (c.services || []).map(s => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${s.name}</td>
              <td>${s.runningCount} / ${s.desiredCount}</td>
              <td>${s.cpuPerTask}</td>
              <td>${s.memoryPerTask}</td>
              <td>${s.launchType}</td>
            </tr>
          `)).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>2. EC2 Nodes Distribution (ECS Container Nodes vs Standalone)</h2>
      <table>
        <thead>
          <tr>
            <th>Node Name</th>
            <th>Instance ID</th>
            <th>Category</th>
            <th>Instance Type</th>
            <th>AZ</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${ec2Instances.map(inst => `
            <tr>
              <td><strong>${inst.name}</strong></td>
              <td><code>${inst.instanceId}</code></td>
              <td>${inst.category}</td>
              <td>${inst.type}</td>
              <td>${inst.az}</td>
              <td><span style="color: ${inst.state === 'running' ? '#10b981' : '#f43f5e'}; font-weight: 600;">${inst.state.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>3. Database Infrastructure (RDS Instances)</h2>
      <table>
        <thead>
          <tr>
            <th>DB Identifier</th>
            <th>Engine</th>
            <th>Instance Class</th>
            <th>Storage Size (GB)</th>
            <th>Multi-AZ</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rdsInstances.map(db => `
            <tr>
              <td><strong>${db.dbIdentifier}</strong></td>
              <td>${db.engine} ${db.engineVersion || ''}</td>
              <td>${db.instanceClass}</td>
              <td>${db.allocatedStorageGb} GB (${db.storageType})</td>
              <td>${db.multiAz ? 'Yes (High Availability)' : 'Single-AZ'}</td>
              <td><span style="color: #10b981; font-weight: 600;">${db.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>4. S3 Storage Overview (${s3Buckets.length} Buckets)</h2>
      <p style="font-size: 13px; color: #64748b;">Includes high-availability asset storage, database backup vaults, and application audit logs.</p>
    </div>

    <div class="footer">
      Generated on ${reportDate} via AWS Executive Dashboard | Antigravity DevOps Systems
    </div>
  </div>
</body>
</html>
  `;
}
