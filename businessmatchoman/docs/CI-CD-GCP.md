CI/CD to Google Cloud Run (GitHub Actions)
=========================================

This repo includes a GitHub Actions workflow to build with Cloud Build and deploy to Cloud Run on pushes to `main`.

Files
- `.github/workflows/deploy.yml` — builds an image with Cloud Build and deploys to Cloud Run in `asia-southeast1`.

Requirements
1) Google Cloud project and services
- Project: `fits-387518`
- Enable APIs:
  - `artifactregistry.googleapis.com`
  - `cloudbuild.googleapis.com`
  - `run.googleapis.com`

2) Artifact Registry (created automatically by the workflow if missing)
- Repository: `app-repo` (Docker), location: `asia-southeast1`

3) Service account for deployments (Workload Identity Federation)
- Create a deployer service account (adjust name/email if you prefer):

```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

SA_EMAIL="github-actions-deployer@fits-387518.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe fits-387518 --format='value(projectNumber)')
```

- Grant roles (minimum needed):

```bash
gcloud projects add-iam-policy-binding fits-387518 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding fits-387518 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding fits-387518 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Allow deployer to act as the runtime service account used by Cloud Run
# If your Cloud Run service uses the default compute SA, grant user on it:
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding ${RUNTIME_SA} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

- Create a Workload Identity pool and provider:

```bash
POOL_ID="github-pool"
PROVIDER_ID="github-provider"

gcloud iam workload-identity-pools create ${POOL_ID} \
  --location="global" \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc ${PROVIDER_ID} \
  --location="global" \
  --workload-identity-pool=${POOL_ID} \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref"

# Allow this repo to impersonate the deployer SA via the pool
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/FITSoman/businessmatchoman"

WIP_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
```

4) GitHub repo secrets
- Add the following repository secrets:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER` = `${WIP_RESOURCE}`
  - `GCP_SERVICE_ACCOUNT_EMAIL` = `${SA_EMAIL}`

Deploy behavior
- On push to `main`, the workflow will:
  1. Authenticate via WIF
  2. Ensure Artifact Registry repo exists
  3. Build the image with Cloud Build and tag `${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:${GITHUB_SHA}`
  4. Deploy to Cloud Run service `${SERVICE}` in `${REGION}`
  5. Reuse existing env/secrets on the service (it does not reset them)

Notes
- Make sure your Cloud Run service `bmo-app` is created once with the correct secrets/env.
- Domain mapping is already configured in `asia-southeast1`.
- You can add a staging workflow targeting `develop` and a `bmo-app-staging` service similarly if desired.

