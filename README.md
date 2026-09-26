# Insurance Document Upload Portal

A lightweight, production-ready Next.js web application built for the **NAGP Cloud Computing Workshop assignment**. 

This application acts as a customer self-service portal where users can upload documents. The backend securely streams and stores files in an Amazon S3 bucket.

---

## 1. Project Overview

This project represents the primary ingest layer of an enterprise insurance claims architecture on AWS:

```
[ Customer Browser ]
        │
        │ HTTP (multipart/form-data)
        ▼
[ AWS Application Load Balancer ]
        │
        │ Health Check (/api/health) & Upload Traffic
        ▼
[ EC2 Instance(s) (Next.js App) ]
        │
        │ AWS SDK v3 PutObjectCommand (IAM EC2 Instance Role)
        ▼
[ Amazon S3 Bucket (uploads/*) ]
```


> S3 `ObjectCreated` events, triggers an AWS Lambda function to extract document metadata and persist claims records into an Amazon RDS database.  Lambda and RDS component have been configured separately in AWS.

---

## 2. Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Cloud SDK:** AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`)
- **Styling:** Vanilla CSS (`app/globals.css`)
- **Storage:** Amazon Simple Storage Service (Amazon S3)

---

## 3. Documentation

| Document | Purpose |
|-----------|----------|
| `README.md` | Project setup and execution guide |
| `docs/Component_Description_Document.docx` | Detailed component architecture, responsibilities, and inter-service communication |
| `docs/Scope_and_Assumptions.docx` | System scope, boundaries, architectural assumptions, and constraints |
| `docs/architecture diagram.drawio.svg` | System architecture diagram |  

---

## 4. Project Structure

```
aws-insurance-portal/
├── app/
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts        # Health check endpoint for ALB target groups
│   │   └── upload/
│   │       └── route.ts        # Multipart form handler & S3 upload logic
│   ├── globals.css             # Clean, responsive CSS styling
│   ├── layout.tsx              # Root HTML and metadata layout
│   └── page.tsx                # Customer upload interface
├── public/                     # Static assets directory
├── .env.example                # Example environment configuration
├── .gitignore                  # Git ignore rules (prevents credential leaks)
├── next.config.ts              # Next.js TypeScript configuration
├── package.json                # Project dependencies and run scripts
├── tsconfig.json               # TypeScript compiler configuration
└── README.md                   # Complete documentation and deployment guide
```

---

## 5. Prerequisites

Before running or deploying the application, ensure you have:

- **Node.js:** v18.18+ or v20.x LTS (compatible with Amazon Linux 2023)
- **npm:** v9.x or later
- **AWS CLI:** (Optional, for local testing and verifying uploads in S3)
- **AWS Account:** With an active Amazon S3 bucket and appropriate IAM role or permissions

---

## 6. Local Installation

1. Clone or download the repository to your local machine:
   ```bash
   git clone https://github.com/panja15/aws-insurance-portal.git
   cd aws-insurance-portal
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

---

## 7. Environment Variables

Create a local environment file by copying `.env.example`:

```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

| Variable Name | Required | Default | Description |
|---|---|---|---|
| `AWS_REGION` | Yes | `ap-south-1` | AWS region where your S3 bucket resides |
| `S3_BUCKET_NAME` | Yes | *None* | Name of your private Amazon S3 bucket |

> **Security Note:** Never commit `.env` or `.env.local` to version control. The application relies on the default AWS SDK credential chain:
> - **Locally:** Automatically reads standard AWS credentials from `~/.aws/credentials` or environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
> - **On AWS EC2:** Automatically retrieves temporary credentials from the attached **EC2 IAM Role** via the Instance Metadata Service (IMDS).

---

## 8. How to Run Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 9. How to Test the Health Endpoint

The health check route is used by the AWS Application Load Balancer (ALB) to monitor instance health.

### Using Browser:
Navigate to:
```
http://localhost:3000/api/health
```

### Using cURL:
```bash
curl -i http://localhost:3000/api/health
```

### Expected Response:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok"
}
```

---

## 10. How to Test File Upload

### Testing via Web Interface:
1. Open `http://localhost:3000` in your browser.
2. Click **Browse...** and select a file (e.g., PDF, PNG, JPG under 10 MB).
3. The selected filename will appear next to the button.
4. Click **Upload**.
5. Observe the loading indicator while the file streams to S3.
6. A success message will appear showing the confirmed `S3 key: uploads/<uuid>-<filename>`

### Testing via cURL:
```bash
curl -X POST \
  -F "file=@test-document.pdf" \
  http://localhost:3000/api/upload
```

### Expected Response:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "File uploaded successfully",
  "fileName": "test-document.pdf",
  "s3Key": "uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890-test-document.pdf"
}
```

---

## 11. S3 Configuration Requirements

1. **Bucket Creation:**
   - Create a bucket in your designated region (e.g., `ap-south-1`).
   - Bucket name example: `insurance-documents-<your-account-id>`

2. **Block Public Access:**
   - **Enable "Block *all* public access"** on the S3 bucket.
   - The bucket must **NOT** be public. All uploads are securely proxied through the Next.js server using IAM credentials.

3. **Encryption:**
   - Enable default encryption using Server-Side Encryption with Amazon S3 managed keys (`SSE-S3`) or AWS KMS.

4. **Bucket Policy / CORS:**
   - Because clients upload through the Next.js API route (`/api/upload`) rather than directly from the browser to S3, no public S3 bucket policies or permissive S3 CORS headers are needed.

---

## 12. IAM Permissions Required by the EC2 Role

When running on EC2, do **not** configure access keys or secret keys on the server. Instead, attach an IAM Role to your EC2 instance.

### Minimum Privilege IAM Policy for S3 Uploads:

Create an IAM policy (e.g., `InsurancePortalS3UploadPolicy`) with the following definition:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3DocumentUploads",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::<your-s3-bucket-name>/uploads/*"
    }
  ]
}
```

### Trust Relationship for EC2:
Ensure the IAM role has a trust relationship allowing EC2 to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach this IAM role to your EC2 instance via **EC2 Console -> Actions -> Security -> Modify IAM role**.

---

## 13. Production Build Instructions

To compile and optimize the application for production deployment:

```bash
npm run build
```

This runs `next build`, validating TypeScript types and creating an optimized build in the `.next` directory.

---

## 14. EC2 Deployment Instructions (Amazon Linux 2023)

### Step 1: Connect to your EC2 Instance
```bash
ssh -i /path/to/key.pem ec2-user@<ec2-public-ip-or-dns>
```

### Step 2: Update System and Install Node.js 20 & Git
```bash
sudo dnf update -y
sudo dnf install -y nodejs20 git
```

Verify installation:
```bash
node -v   # Should show v20.x
npm -v
```

### Step 3: Clone or Copy Application Files
```bash
cd /home/ec2-user
git clone https://github.com/panja15/aws-insurance-portal.git aws-insrance-portal
cd aws-insurance-portal
```

### Step 4: Install Dependencies & Build
```bash
npm install
npm run build
```

### Step 5: Configure Production Environment
Create `.env.production` in the project root:
```bash
cat << 'EOF' > .env.production
AWS_REGION=ap-south-1
S3_BUCKET_NAME=<your-s3-bucket-name>
EOF
```

---

## 15. How to Start the Application on EC2

### Option A: Direct Start (for quick testing)
```bash
npm start
```
Next.js will start on port `3000` and bind to `0.0.0.0`, allowing incoming traffic forwarded by the Application Load Balancer.

### Option B: As a Systemd Service (Recommended for Production)
Create a systemd service file to automatically run and recover the application:

```bash
sudo nano /etc/systemd/system/insurance-portal.service
```

Paste the following configuration:

```ini
[Unit]
Description=Insurance Document Upload Portal Next.js Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/insurance-upload-portal
EnvironmentFile=/home/ec2-user/insurance-upload-portal/.env.production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable insurance-portal
sudo systemctl start insurance-portal
sudo systemctl status insurance-portal
```

---

## 16. How to Verify the Uploaded Object in S3

### Method 1: Using the AWS Management Console
1. Open the [Amazon S3 Console](https://s3.console.aws.amazon.com/).
2. Select your bucket name.
3. Open the `uploads/` folder.
4. Verify that your uploaded document appears with the expected timestamp and metadata.

### Method 2: Using the AWS CLI
Run the following command to list objects under the `uploads/` prefix:

```bash
aws s3 ls s3://<your-s3-bucket-name>/uploads/ --human-readable
```

To inspect metadata and content type of a specific uploaded object:
```bash
aws s3api head-object \
  --bucket <your-s3-bucket-name> \
  --key "uploads/<s3-key-returned-by-app>"
```

---

## Security Highlights

1. **Zero Credential Exposure:** AWS Access Keys are not present in code, git repositories, or frontend bundles. The EC2 instance role securely handles authentication.
2. **Private Bucket:** S3 public access remains completely blocked.
3. **Payload Sanitization & Size Limits:** Uploads are strictly capped at 10 MB and object keys are sanitized and prefixed with UUIDs to avoid object overwriting.
4. **ALB-Ready Health Checks:** `/api/health` returns `200 OK` for traffic routing and automated auto-scaling group health checks.
