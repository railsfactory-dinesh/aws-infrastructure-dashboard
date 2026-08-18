import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMockInfrastructureData } from './mockData.js';

let secretsManagerLoaded = false;

/**
 * Optionally loads credentials from AWS Secrets Manager if AWS_SECRET_NAME is provided
 */
export function loadCredentialsFromSecretsManager(secretName = process.env.AWS_SECRET_NAME, region = 'us-east-1') {
  if (!secretName || secretsManagerLoaded) return;

  try {
    console.log(`[Secrets Manager] Fetching credentials from secret: ${secretName}...`);
    const stdout = execSync(`aws secretsmanager get-secret-value --secret-id ${secretName} --region ${region}`, {
      encoding: 'utf8',
      timeout: 10000
    });
    const parsed = JSON.parse(stdout);
    const secretString = parsed.SecretString ? JSON.parse(parsed.SecretString) : {};

    if (secretString.AWS_ACCESS_KEY_ID && secretString.AWS_SECRET_ACCESS_KEY) {
      process.env.AWS_ACCESS_KEY_ID = secretString.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = secretString.AWS_SECRET_ACCESS_KEY;
      if (secretString.AWS_SESSION_TOKEN) {
        process.env.AWS_SESSION_TOKEN = secretString.AWS_SESSION_TOKEN;
      }
      if (secretString.AWS_REGION || secretString.AWS_DEFAULT_REGION) {
        process.env.AWS_DEFAULT_REGION = secretString.AWS_REGION || secretString.AWS_DEFAULT_REGION;
      }
      secretsManagerLoaded = true;
      console.log(`[Secrets Manager] Successfully loaded AWS credentials from secret '${secretName}'.`);
    }
  } catch (err) {
    console.warn(`[Secrets Manager Warning] Could not load secret '${secretName}':`, err.message);
  }
}

/**
 * Executes an AWS CLI command safely with profile and region
 */
function runAwsCli(cmd, profile = 'default', region = 'us-east-1', timeoutMs = 15000) {
  // Check if secrets manager credentials need auto-loading
  if (process.env.AWS_SECRET_NAME && !secretsManagerLoaded) {
    loadCredentialsFromSecretsManager(process.env.AWS_SECRET_NAME, region);
  }

  let fullCmd = `aws ${cmd} --region ${region} --no-cli-pager`;
  
  // Do not append --profile when using IAM Role, env vars, or default
  const isDirectAuth = Boolean(process.env.AWS_ACCESS_KEY_ID) || 
                       !profile || 
                       profile === 'default' || 
                       profile.includes('iam-role') || 
                       profile.includes('env');
  
  if (!isDirectAuth) {
    fullCmd += ` --profile ${profile}`;
  }

  try {
    const stdout = execSync(fullCmd, {
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, AWS_PAGER: '' }
    });
    return JSON.parse(stdout);
  } catch (error) {
    // If it failed with profile, try without --profile (fallback to default IMDS / EC2 IAM Role)
    if (profile && profile !== 'default' && fullCmd.includes('--profile')) {
      try {
        const fallbackCmd = `aws ${cmd} --region ${region}`;
        const stdout = execSync(fallbackCmd, {
          encoding: 'utf8',
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env }
        });
        return JSON.parse(stdout);
      } catch (fallbackErr) {
        // Fall through to primary error
      }
    }

    const stderr = error.stderr ? error.stderr.toString() : error.message;
    console.warn(`[AWS CLI Warning] Command failed: ${fullCmd}\nStderr: ${stderr}`);
    throw new Error(`AWS CLI error (${profile}/${region}): ${stderr || error.message}`);
  }
}

/**
 * Gets available AWS CLI profiles from config/credentials files or CLI
 */
export function getAwsProfiles() {
  const profiles = new Set(['default', 'iam-role (EC2 metadata)', 'env (Secrets Manager/Env)']);

  try {
    const cliProfiles = execSync('aws configure list-profiles', { encoding: 'utf8', timeout: 5000 });
    cliProfiles.split('\n').map(p => p.trim()).filter(Boolean).forEach(p => profiles.add(p));
  } catch (e) {
    // Fallback to checking ~/.aws files
    const homeDir = os.homedir();
    const credPath = path.join(homeDir, '.aws', 'credentials');
    const configPath = path.join(homeDir, '.aws', 'config');

    [credPath, configPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/\[(?:profile\s+)?([^\]]+)\]/g);
        if (matches) {
          matches.forEach(m => {
            const clean = m.replace(/\[(?:profile\s+)?([^\]]+)\]/, '$1').trim();
            if (clean) profiles.add(clean);
          });
        }
      }
    });
  }

  return Array.from(profiles);
}

/**
 * Fetches complete infrastructure details via AWS CLI
 */
export function fetchInfrastructureData(profile = 'default', region = 'us-east-1') {
  try {
    // 1. ECS Clusters
    const clustersListRaw = runAwsCli('ecs list-clusters', profile, region);
    const clusterArns = clustersListRaw.clusterArns || [];
    
    let clusters = [];
    let ecsInstanceIds = new Set();
    let totalRunningTasks = 0;
    let totalDesiredTasks = 0;
    let totalAllocatedCpuUnits = 0;
    let totalAllocatedMemMiB = 0;

    if (clusterArns.length > 0) {
      // Describe clusters
      const clustersDetailRaw = runAwsCli(`ecs describe-clusters --clusters ${clusterArns.join(' ')}`, profile, region);
      const rawClusters = clustersDetailRaw.clusters || [];

      for (const clusterObj of rawClusters) {
        const clusterName = clusterObj.clusterName;
        
        // List Services
        let services = [];
        try {
          const servicesListRaw = runAwsCli(`ecs list-services --cluster ${clusterName}`, profile, region);
          const serviceArns = servicesListRaw.serviceArns || [];

          if (serviceArns.length > 0) {
            // Describe services in chunks of 10
            for (let i = 0; i < serviceArns.length; i += 10) {
              const chunk = serviceArns.slice(i, i + 10);
              const servicesDetailRaw = runAwsCli(`ecs describe-services --cluster ${clusterName} --services ${chunk.join(' ')}`, profile, region);
              const rawServices = servicesDetailRaw.services || [];

              for (const svc of rawServices) {
                totalRunningTasks += (svc.runningCount || 0);
                totalDesiredTasks += (svc.desiredCount || 0);

                // Fetch Task Definition specs (CPU & Memory)
                let cpuPerTask = 'N/A';
                let memoryPerTask = 'N/A';
                let cpuUnitsNum = 0;
                let memMiBNum = 0;

                try {
                  const taskDefRaw = runAwsCli(`ecs describe-task-definition --task-definition ${svc.taskDefinition}`, profile, region);
                  const taskDef = taskDefRaw.taskDefinition || {};
                  
                  // Extract CPU & Memory from task level or container definitions
                  const cpuVal = taskDef.cpu || (taskDef.containerDefinitions && taskDef.containerDefinitions[0]?.cpu);
                  const memVal = taskDef.memory || (taskDef.containerDefinitions && taskDef.containerDefinitions[0]?.memory);

                  if (cpuVal) {
                    cpuUnitsNum = parseInt(cpuVal, 10);
                    const vCpu = (cpuUnitsNum / 1024).toFixed(2).replace(/\.00$/, '');
                    cpuPerTask = `${cpuUnitsNum} (${vCpu} vCPU)`;
                  }

                  if (memVal) {
                    memMiBNum = parseInt(memVal, 10);
                    const memGb = (memMiBNum / 1024).toFixed(2).replace(/\.00$/, '');
                    memoryPerTask = `${memMiBNum} MiB (${memGb} GB)`;
                  }
                } catch (tdErr) {
                  // Fallback if task definition fetch fails
                }

                totalAllocatedCpuUnits += (cpuUnitsNum * (svc.runningCount || 0));
                totalAllocatedMemMiB += (memMiBNum * (svc.runningCount || 0));

                // Determine Launch Type with precision (FARGATE vs EC2)
                let resolvedLaunchType = 'EC2';
                if (svc.launchType) {
                  resolvedLaunchType = svc.launchType.toUpperCase().includes('FARGATE') ? 'FARGATE' : 'EC2';
                } else if (svc.capacityProviderStrategy && svc.capacityProviderStrategy.length > 0) {
                  const hasFargate = svc.capacityProviderStrategy.some(cp => 
                    (cp.capacityProvider || '').toUpperCase().includes('FARGATE')
                  );
                  resolvedLaunchType = hasFargate ? 'FARGATE' : 'EC2';
                }

                services.push({
                  name: svc.serviceName,
                  arn: svc.serviceArn,
                  status: svc.status,
                  desiredCount: svc.desiredCount || 0,
                  runningCount: svc.runningCount || 0,
                  pendingCount: svc.pendingCount || 0,
                  launchType: resolvedLaunchType,
                  taskDefinition: svc.taskDefinition ? svc.taskDefinition.split('/').pop() : 'N/A',
                  cpuPerTask,
                  memoryPerTask,
                  totalCpu: cpuUnitsNum ? `${(cpuUnitsNum * svc.runningCount / 1024).toFixed(1)} vCPU` : 'N/A',
                  totalMemory: memMiBNum ? `${(memMiBNum * svc.runningCount / 1024).toFixed(1)} GB` : 'N/A',
                  instancesCount: 0,
                  instances: []
                });
              }
            }
          }
        } catch (svcErr) {
          console.warn(`Could not list services for cluster ${clusterName}`, svcErr.message);
        }

        // Fetch container instances for this cluster to map EC2 instance IDs
        try {
          const containerInstListRaw = runAwsCli(`ecs list-container-instances --cluster ${clusterName}`, profile, region);
          const containerInstArns = containerInstListRaw.containerInstanceArns || [];
          if (containerInstArns.length > 0) {
            const containerInstDetailRaw = runAwsCli(`ecs describe-container-instances --cluster ${clusterName} --container-instances ${containerInstArns.join(' ')}`, profile, region);
            const containerInsts = containerInstDetailRaw.containerInstances || [];
            containerInsts.forEach(ci => {
              if (ci.ec2InstanceId) {
                ecsInstanceIds.add(ci.ec2InstanceId);
              }
            });
          }
        } catch (ciErr) {
          // Ignore container instance fetch error
        }

        clusters.push({
          name: clusterName,
          arn: clusterObj.clusterArn,
          status: clusterObj.status,
          runningTasksCount: clusterObj.runningTasksCount || 0,
          pendingTasksCount: clusterObj.pendingTasksCount || 0,
          activeServicesCount: clusterObj.activeServicesCount || 0,
          registeredContainerInstancesCount: clusterObj.registeredContainerInstancesCount || 0,
          capacityProviders: clusterObj.capacityProviders || [],
          services
        });
      }
    }

    // 2. EC2 Instances
    const ec2Raw = runAwsCli('ec2 describe-instances', profile, region);
    const reservations = ec2Raw.Reservations || [];
    let ec2Instances = [];
    let ecsContainerInstancesCount = 0;
    let standaloneInstancesCount = 0;
    let runningCount = 0;
    let stoppedCount = 0;

    reservations.forEach(res => {
      (res.Instances || []).forEach(inst => {
        const instanceId = inst.InstanceId;
        const nameTag = (inst.Tags || []).find(t => t.Key === 'Name')?.Value || 'Unassigned';
        const isEcsInstance = ecsInstanceIds.has(instanceId) || nameTag.toLowerCase().includes('ecs');
        const state = inst.State?.Name || 'unknown';

        if (state === 'running') runningCount++;
        if (state === 'stopped') stoppedCount++;

        if (isEcsInstance) {
          ecsContainerInstancesCount++;
        } else {
          standaloneInstancesCount++;
        }

        ec2Instances.push({
          instanceId,
          name: nameTag,
          type: inst.InstanceType || 'N/A',
          category: isEcsInstance ? 'ECS Container Instance' : 'Standalone EC2 (Non-ECS)',
          isEcsInstance,
          clusterName: isEcsInstance ? 'ECS Cluster' : 'N/A',
          state,
          publicIp: inst.PublicIpAddress || 'N/A (Private Only)',
          privateIp: inst.PrivateIpAddress || 'N/A',
          az: inst.Placement?.AvailabilityZone || region,
          launchTime: inst.LaunchTime || 'N/A',
          vpcId: inst.VpcId || 'N/A',
          platform: inst.PlatformDetails || 'Linux/UNIX'
        });
      });
    });

    // 3. RDS DB Instances
    let rdsInstances = [];
    let totalRdsStorageGb = 0;
    let multiAzCount = 0;

    try {
      const rdsRaw = runAwsCli('rds describe-db-instances', profile, region);
      const rawDbList = rdsRaw.DBInstances || [];

      rawDbList.forEach(db => {
        const storageGb = db.AllocatedStorage || 0;
        totalRdsStorageGb += storageGb;
        if (db.MultiAZ) multiAzCount++;

        rdsInstances.push({
          dbIdentifier: db.DBInstanceIdentifier,
          engine: db.Engine,
          engineVersion: db.EngineVersion,
          instanceClass: db.DBInstanceClass,
          allocatedStorageGb: storageGb,
          maxAllocatedStorageGb: db.MaxAllocatedStorage || 'N/A',
          storageType: db.StorageType || 'gp3',
          iops: db.Iops || null,
          multiAz: db.MultiAZ || false,
          status: db.DBInstanceStatus || 'available',
          endpoint: db.Endpoint?.Address || 'N/A',
          port: db.Endpoint?.Port || 5432,
          createdTime: db.InstanceCreateTime || 'N/A'
        });
      });
    } catch (rdsErr) {
      console.warn('RDS Fetch Warning:', rdsErr.message);
    }

    // 4. S3 Buckets
    let s3Buckets = [];
    try {
      const s3Raw = runAwsCli('s3api list-buckets', profile, region);
      const rawBuckets = s3Raw.Buckets || [];

      s3Buckets = rawBuckets.map(b => ({
        name: b.Name,
        creationDate: b.CreationDate,
        region: region,
        estimatedSizeFormatted: 'Active',
        estimatedObjects: 'N/A'
      }));
    } catch (s3Err) {
      console.warn('S3 Fetch Warning:', s3Err.message);
    }

    return {
      meta: {
        profile,
        region,
        lastUpdated: new Date().toISOString(),
        isMock: false
      },
      summary: {
        totalClusters: clusters.length,
        totalServices: clusters.reduce((acc, c) => acc + c.services.length, 0),
        totalRunningTasks,
        totalDesiredTasks,
        totalContainerInstances: ecsContainerInstancesCount,
        totalStandaloneEc2: standaloneInstancesCount,
        totalEc2Instances: ec2Instances.length,
        totalAllocatedCpu: `${(totalAllocatedCpuUnits / 1024).toFixed(1)} vCPU`,
        totalAllocatedMemory: `${(totalAllocatedMemMiB / 1024).toFixed(1)} GB`,
        totalS3Buckets: s3Buckets.length,
        totalS3StorageBytes: 0,
        totalS3ObjectCount: 0,
        totalRdsInstances: rdsInstances.length,
        totalRdsStorageGb
      },
      ecs: { clusters },
      ec2: {
        summary: {
          totalInstances: ec2Instances.length,
          ecsContainerInstancesCount,
          standaloneInstancesCount,
          runningCount,
          stoppedCount
        },
        instances: ec2Instances
      },
      rds: {
        summary: {
          totalDatabases: rdsInstances.length,
          totalStorageGb: totalRdsStorageGb,
          multiAzCount,
          primaryEngine: rdsInstances[0]?.engine || 'N/A'
        },
        instances: rdsInstances
      },
      s3: {
        summary: {
          totalBuckets: s3Buckets.length,
          storageLensEnabled: false
        },
        buckets: s3Buckets,
        storageLens: []
      }
    };
  } catch (error) {
    console.error(`AWS Fetch Error for profile ${profile}:`, error.message);
    throw error;
  }
}
