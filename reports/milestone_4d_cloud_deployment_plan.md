# Milestone 4D — Cloud Deployment Plan

## 1. Selected Cloud Provider & Architecture Decision
**Provider**: AWS (Amazon Web Services) or Azure (User preference required)
**Compute Strategy**: IaaS (Infrastructure as a Service) using a GPU-accelerated Virtual Machine.
- **Why?** The backend requires an NVIDIA GPU for real-time YOLOv11n-seg inference. Serverless platforms (like AWS Fargate or Azure Container Apps) do not reliably or cost-effectively support persistent GPU passthrough for Docker containers in this specific configuration.
- **Recommended Instance**: 
  - AWS: `g4dn.xlarge` (1 NVIDIA T4 GPU, 4 vCPUs, 16GB RAM)
  - Azure: `Standard_NC4as_T4_v3` (1 NVIDIA T4 GPU, 4 vCPUs, 28GB RAM)

## 2. Deployment Architecture
- **Frontend**: Deployed via Docker alongside the backend on the same VM, exposed via port 3000 (or proxied through NGINX to port 80/443).
- **Backend**: Deployed via Docker with `--gpus all` passthrough to utilize the host VM's NVIDIA drivers. Exposed via port 8000.
- **Database**: Retains the existing MongoDB Atlas cloud cluster.
- **Storage/Volumes**: 
  - The current `docker-compose.yml` heavily relies on local bind mounts (`./dataset` and `./ai-model`) to avoid a bloated Docker image. 
  - *Cloud Adaptation*: We must securely transfer the model weights (`best.pt`) and the MVTec dataset to the cloud VM's storage volume (EBS on AWS) before starting the containers, as they are not baked into the Dockerfile.

## 3. Environment & Security
- **Frontend URL**: `NEXT_PUBLIC_API_URL` must be dynamically set to the public IP or domain of the cloud VM (e.g., `http://<EC2-PUBLIC-IP>:8000/api/v1`).
- **Backend CORS**: `CORS_ORIGINS` must be updated to explicitly allow the frontend's public IP/domain.
- **Secrets**: The JWT `SECRET_KEY` and `MONGODB_URL` will be injected via an `.env.production` file on the remote server, NEVER committed to version control.

## 4. Rollback Strategy
If the cloud deployment fails, the rollback strategy is trivial: the local production Docker architecture and native development environments remain 100% untouched. Cloud infrastructure can simply be terminated.

---

> [!WARNING]
> ## 🛑 CRITICAL BLOCKER: CLOUD ACCESS & CREDENTIALS
> As an automated assistant operating within your local workstation, **I do not have access to your AWS or Azure billing accounts to provision a GPU cloud instance.**
> 
> To proceed with Phase 4 and Phase 5 (Actual Cloud Deployment), you must provide either:
> 1. **AWS CLI Credentials** with permissions to launch EC2 instances (`g4dn.xlarge`), configure Security Groups, and SSH access.
> 2. **Azure CLI Credentials** with permissions to launch N-series VMs.
> 3. **Manual Provisioning**: You manually provision a GPU-enabled Ubuntu server on AWS/Azure, install Docker and the NVIDIA Container Toolkit, and provide me with the SSH connection details (IP address and SSH key) to deploy the code.
> 
> *If you do not have an active AWS/Azure account with GPU quota approvals, we cannot execute the live deployment phase.*
