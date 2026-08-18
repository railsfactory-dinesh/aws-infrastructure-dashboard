import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Executes an AWS CLI command safely with profile and region
 */
function runAwsCli(cmd, profile = 'default', region = 'us-east-1', timeoutMs = 30000) {
  let fullCmd = `aws ${cmd} --region ${region} --no-cli-pager`;

  // Do not append --profile when using IAM Role / env vars / default
  const isDirectAuth =
    Boolean(process.env.AWS_ACCESS_KEY_ID) ||
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
    // Fallback: try without --profile (EC2 IAM Role)
    if (!isDirectAuth && fullCmd.includes('--profile')) {
      try {
        const fallbackCmd = `aws ${cmd} --region ${region} --no-cli-pager`;
        const stdout = execSync(fallbackCmd, {
          encoding: 'utf8',
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, AWS_PAGER: '' }
        });
        return JSON.parse(stdout);
      } catch (_) { /* fall through */ }
    }
    const stderr = error.stderr ? error.stderr.toString().substring(0, 300) : error.message;
    throw new Error(`AWS CLI error: ${stderr}`);
  }
}

/**
 * Gets available AWS CLI profiles
 */
export function getAwsProfiles() {
  const profiles = new Set(['iam-role (EC2 metadata)', 'default']);

  try {
    const cliProfiles = execSync('aws configure list-profiles --no-cli-pager', {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, AWS_PAGER: '' }
    });
    cliProfiles.split('\n').map(p => p.trim()).filter(Boolean).forEach(p => profiles.add(p));
  } catch (_) {
    const homeDir = os.homedir();
    [path.join(homeDir, '.aws', 'credentials'), path.join(homeDir, '.aws', 'config')].forEach(filePath => {
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
 * Fetch ECS data (clusters + services)
 */
async function fetchECS(profile, region) {
  let clusters = [];
  let totalRunningTasks = 0;
  let totalDesiredTasks = 0;
  let totalAllocatedCpuUnits = 0;
  let totalAllocatedMemMiB = 0;
  let ecsInstanceIds = new Set();

  try {
    const clustersListRaw = runAwsCli('ecs list-clusters', profile, region);
    const clusterArns = clustersListRaw.clusterArns || [];

    if (clusterArns.length > 0) {
      const clustersDetailRaw = runAwsCli(`ecs describe-clusters --clusters ${clusterArns.join(' ')}`, profile, region);
      const rawClusters = clustersDetailRaw.clusters || [];

      // Describe each cluster's services in parallel
      await Promise.all(rawClusters.map(async (clusterObj) => {
        const clusterName = clusterObj.clusterName;
        let services = [];

        try {
          const servicesListRaw = runAwsCli(`ecs list-services --cluster ${clusterName}`, profile, region);
          const serviceArns = servicesListRaw.serviceArns || [];

          if (serviceArns.length > 0) {
            // Describe all service chunks in parallel
            const chunks = [];
            for (let i = 0; i < serviceArns.length; i += 10) {
              chunks.push(serviceArns.slice(i, i + 10));
            }

            await Promise.all(chunks.map(async (chunk) => {
              try {
                const servicesDetailRaw = runAwsCli(`ecs describe-services --cluster ${clusterName} --services ${chunk.join(' ')}`, profile, region);
                const rawServices = servicesDetailRaw.services || [];

                for (const svc of rawServices) {
                  totalRunningTasks += (svc.runningCount || 0);
                  totalDesiredTasks += (svc.desiredCount || 0);

                  let cpuPerTask = 'N/A', memoryPerTask = 'N/A';
                  let cpuUnitsNum = 0, memMiBNum = 0;

                  try {
                    const taskDefRaw = runAwsCli(`ecs describe-task-definition --task-definition ${svc.taskDefinition}`, profile, region);
                    const taskDef = taskDefRaw.taskDefinition || {};
                    const cpuVal = taskDef.cpu || taskDef.containerDefinitions?.[0]?.cpu;
                    const memVal = taskDef.memory || taskDef.containerDefinitions?.[0]?.memory;

                    if (cpuVal) {
                      cpuUnitsNum = parseInt(cpuVal, 10);
                      cpuPerTask = `${cpuUnitsNum} (${(cpuUnitsNum / 1024).toFixed(2).replace(/\.00$/, '')} vCPU)`;
                    }
                    if (memVal) {
                      memMiBNum = parseInt(memVal, 10);
                      memoryPerTask = `${memMiBNum} MiB (${(memMiBNum / 1024).toFixed(2).replace(/\.00$/, '')} GB)`;
                    }
                  } catch (_) { /* ignore task def error */ }

                  totalAllocatedCpuUnits += cpuUnitsNum * (svc.runningCount || 0);
                  totalAllocatedMemMiB += memMiBNum * (svc.runningCount || 0);

                  let resolvedLaunchType = 'EC2';
                  if (svc.launchType?.toUpperCase().includes('FARGATE')) {
                    resolvedLaunchType = 'FARGATE';
                  } else if (svc.capacityProviderStrategy?.some(cp => (cp.capacityProvider || '').toUpperCase().includes('FARGATE'))) {
                    resolvedLaunchType = 'FARGATE';
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
              } catch (chunkErr) {
                console.warn(`[ECS Chunk Warning] ${clusterName}:`, chunkErr.message);
              }
            }));
          }
        } catch (svcErr) {
          console.warn(`[ECS Services Warning] ${clusterName}:`, svcErr.message);
        }

        // Fetch container instances
        try {
          const ciListRaw = runAwsCli(`ecs list-container-instances --cluster ${clusterName}`, profile, region);
          const ciArns = ciListRaw.containerInstanceArns || [];
          if (ciArns.length > 0) {
            const ciDetailRaw = runAwsCli(`ecs describe-container-instances --cluster ${clusterName} --container-instances ${ciArns.join(' ')}`, profile, region);
            (ciDetailRaw.containerInstances || []).forEach(ci => {
              if (ci.ec2InstanceId) ecsInstanceIds.add(ci.ec2InstanceId);
            });
          }
        } catch (_) { /* ignore */ }

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
      }));
    }
  } catch (err) {
    console.warn('[ECS Fetch Warning]:', err.message);
  }

  return { clusters, ecsInstanceIds, totalRunningTasks, totalDesiredTasks, totalAllocatedCpuUnits, totalAllocatedMemMiB };
}

/**
 * Fetch EC2 instances
 */
async function fetchEC2(profile, region, ecsInstanceIds) {
  let ec2Instances = [];
  let runningCount = 0, stoppedCount = 0;
  let ecsContainerInstancesCount = 0, standaloneInstancesCount = 0;

  try {
    const ec2Raw = runAwsCli('ec2 describe-instances', profile, region);
    const reservations = ec2Raw.Reservations || [];

    reservations.forEach(res => {
      (res.Instances || []).forEach(inst => {
        const instanceId = inst.InstanceId;
        const nameTag = (inst.Tags || []).find(t => t.Key === 'Name')?.Value || 'Unassigned';
        const isEcsInstance = ecsInstanceIds.has(instanceId) || nameTag.toLowerCase().includes('ecs');
        const state = inst.State?.Name || 'unknown';

        if (state === 'running') runningCount++;
        if (state === 'stopped') stoppedCount++;
        if (isEcsInstance) ecsContainerInstancesCount++; else standaloneInstancesCount++;

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
  } catch (err) {
    console.warn('[EC2 Fetch Warning]:', err.message);
  }

  return { ec2Instances, runningCount, stoppedCount, ecsContainerInstancesCount, standaloneInstancesCount };
}

/**
 * Fetch RDS instances
 */
async function fetchRDS(profile, region) {
  let rdsInstances = [];
  let totalRdsStorageGb = 0, multiAzCount = 0;

  try {
    const rdsRaw = runAwsCli('rds describe-db-instances', profile, region);
    (rdsRaw.DBInstances || []).forEach(db => {
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
  } catch (err) {
    console.warn('[RDS Fetch Warning]:', err.message);
  }

  return { rdsInstances, totalRdsStorageGb, multiAzCount };
}

/**
 * Fetch S3 buckets
 */
async function fetchS3(profile, region) {
  let s3Buckets = [];

  try {
    const s3Raw = runAwsCli('s3api list-buckets', profile, region);
    s3Buckets = (s3Raw.Buckets || []).map(b => ({
      name: b.Name,
      creationDate: b.CreationDate,
      region,
      estimatedSizeFormatted: 'Active',
      estimatedObjects: 'N/A'
    }));
  } catch (err) {
    console.warn('[S3 Fetch Warning]:', err.message);
  }

  return { s3Buckets };
}

/**
 * Fetches complete infrastructure details via AWS CLI — all resources in parallel
 */
export async function fetchInfrastructureData(profile = 'default', region = 'us-east-1') {
  console.log(`[Fetcher] Starting parallel AWS fetch for profile='${profile}' region='${region}'`);
  const t0 = Date.now();

  // First fetch ECS to get the set of ECS-managed EC2 instance IDs
  const ecsResult = await fetchECS(profile, region);

  // Then run EC2 (needs ecsInstanceIds), RDS, S3 in parallel
  const [ec2Result, rdsResult, s3Result] = await Promise.all([
    fetchEC2(profile, region, ecsResult.ecsInstanceIds),
    fetchRDS(profile, region),
    fetchS3(profile, region)
  ]);

  const { clusters, totalRunningTasks, totalDesiredTasks, totalAllocatedCpuUnits, totalAllocatedMemMiB } = ecsResult;
  const { ec2Instances, runningCount, stoppedCount, ecsContainerInstancesCount, standaloneInstancesCount } = ec2Result;
  const { rdsInstances, totalRdsStorageGb, multiAzCount } = rdsResult;
  const { s3Buckets } = s3Result;

  const totalServices = clusters.reduce((acc, c) => acc + (c.services?.length || 0), 0);

  console.log(`[Fetcher] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — EC2:${ec2Instances.length} ECS:${clusters.length} RDS:${rdsInstances.length} S3:${s3Buckets.length}`);

  return {
    meta: {
      profile,
      region,
      lastUpdated: new Date().toISOString(),
      executionMode: profile.includes('iam-role') ? 'EC2 IAM Role (IMDS)' : `AWS CLI Profile '${profile}'`
    },
    // Global summary for KPI cards
    summary: {
      totalClusters: clusters.length,
      totalServices,
      totalRunningTasks,
      totalDesiredTasks,
      totalAllocatedCpu: (totalAllocatedCpuUnits / 1024).toFixed(2),
      totalAllocatedMemGb: (totalAllocatedMemMiB / 1024).toFixed(2),
      totalEc2: ec2Instances.length,
      totalEc2Instances: ec2Instances.length,
      totalRunningEc2: runningCount,
      totalStoppedEc2: stoppedCount,
      totalContainerInstances: ecsContainerInstancesCount,
      totalStandaloneEc2: standaloneInstancesCount,
      totalRds: rdsInstances.length,
      totalRdsInstances: rdsInstances.length,
      totalRdsStorageGb,
      multiAzCount,
      totalS3Buckets: s3Buckets.length
    },
    // ECS tab — ECSOverview reads ecsData.clusters[]
    ecs: {
      clusters,
      totalClusters: clusters.length,
      totalServices,
      totalRunningTasks,
      totalDesiredTasks,
      totalAllocatedCpu: (totalAllocatedCpuUnits / 1024).toFixed(2),
      totalAllocatedMemGb: (totalAllocatedMemMiB / 1024).toFixed(2)
    },
    // EC2 tab — EC2Breakdown reads ec2Data.instances[] and ec2Data.summary.*
    ec2: {
      instances: ec2Instances,
      summary: {
        totalInstances: ec2Instances.length,
        runningCount,
        stoppedCount,
        ecsContainerInstancesCount,
        standaloneInstancesCount
      }
    },
    // RDS tab — RDSOverview reads rdsData.instances[] and rdsData.summary.*
    rds: {
      instances: rdsInstances,
      summary: {
        totalInstances: rdsInstances.length,
        totalStorageGb: totalRdsStorageGb,
        multiAzCount
      }
    },
    // S3 tab — S3Overview reads s3Data.buckets[] and s3Data.summary.*
    s3: {
      buckets: s3Buckets,
      storageLens: [],
      summary: {
        totalBuckets: s3Buckets.length
      }
    }
  };
}
