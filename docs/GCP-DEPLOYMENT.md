# GCP Deployment Guide (Free Tier + Docker CI/CD)

This guide walks you through hosting Sentra LeadGen **for free forever** on Google Cloud Platform (GCP). We will use an `e2-micro` Compute Engine instance (which falls under GCP's Always Free tier), Docker for containerization, and GitHub Actions for continuous deployment. 

Because we map the SQLite database to a persistent Docker volume, **your data will never expire or be deleted upon a server restart.**

---

## Phase 1: Set Up the Free GCP Virtual Machine

1. Log into your [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `sentra-production`).
3. Navigate to **Compute Engine -> VM Instances** and click **Create Instance**.
4. **Configuration (Critical for Free Tier):**
   * **Region:** Choose a US region like `us-central1` (Iowa), `us-east1` (South Carolina), or `us-west1` (Oregon). *These are the only regions eligible for the free tier.*
   * **Machine Type:** Select `e2-micro` (2 vCPU, 1 GB memory).
   * **Boot Disk:** Change the OS to **Ubuntu 22.04 LTS**. Increase the disk size up to **30 GB Standard Persistent Disk** (the maximum free limit).
   * **Firewall:** Check both **Allow HTTP traffic** and **Allow HTTPS traffic**.
5. Click **Create**.
6. Once spun up, note the **External IP Address** of your new VM.

---

## Phase 2: Install Docker on the VM

1. SSH into your VM by clicking the **SSH** button next to your instance in the GCP console.
2. Run the following commands to install Docker:

```bash
# Update packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker’s official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow your user to run Docker commands without sudo
sudo usermod -aG docker $USER
```
*(You may need to close the SSH window and reopen it for the permission changes to take effect.)*

---

## Phase 3: Create the Dockerfile

If you haven't already, ensure a `Dockerfile` exists in the root of your repository:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma Client & Database
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
```

---

## Phase 4: Configure GitHub Actions CI/CD

We will automate deployments using GitHub Actions. Whenever you push to the `master` branch, GitHub will SSH into your VM, pull the latest code, and restart the Docker container.

### 1. Generate SSH Keys
On your local machine (or inside the GCP VM), generate an SSH key pair:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```
* Leave the passphrase empty.
* Copy the contents of the **public key** (`id_rsa.pub`) and paste it into the `~/.ssh/authorized_keys` file on your GCP VM.
* Copy the contents of the **private key** (`id_rsa`).

### 2. Add GitHub Repository Secrets
Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**. Add the following repository secrets:

* `GCP_HOST`: Your VM's External IP address.
* `GCP_USERNAME`: The username you use to SSH into the VM (usually your Google account username before the @).
* `GCP_SSH_PRIVATE_KEY`: The contents of the private key (`id_rsa`) you just generated.

### 3. Create the Workflow File
In your repository, create the file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [ "master" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.GCP_HOST }}
          username: ${{ secrets.GCP_USERNAME }}
          key: ${{ secrets.GCP_SSH_PRIVATE_KEY }}
          script: |
            # Clone repo if it doesn't exist, otherwise pull latest
            if [ ! -d "Sentra-Leadgen" ]; then
              git clone https://github.com/aka-aadi/Sentra-Leadgen.git
            fi
            
            cd Sentra-Leadgen
            git pull origin master
            
            # Stop and remove old container
            docker stop sentra-app || true
            docker rm sentra-app || true
            
            # Rebuild image
            docker build -t sentra-app-image .
            
            # Run new container with persistent volume for SQLite
            docker run -d \
              --name sentra-app \
              -p 80:3000 \
              --restart unless-stopped \
              -v sentra_db_data:/app/prisma \
              sentra-app-image
              
            # Run Prisma DB Push to ensure schema is up to date in the volume
            docker exec sentra-app npx prisma db push
```

### Explanation of Persistent Storage
Notice the `-v sentra_db_data:/app/prisma` flag. This creates a persistent Docker volume on the host machine. Because SQLite stores its data inside the `/app/prisma` directory (specifically `dev.db`), mapping this folder ensures that even if the container is destroyed, updated, or the server restarts, **your database and leads will never be lost.**

---

## Phase 5: Accessing Your App

Once you push to `master`, go to the **Actions** tab in your GitHub repository to watch the deployment run.

Once completed, simply navigate to your GCP VM's External IP Address in your browser:
`http://YOUR_EXTERNAL_IP`

*(Note: The deployment maps internal port 3000 to external port 80, so you don't need to append :3000 to the URL).*
