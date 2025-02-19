## GitHub Action - Deploy and Update ENVs on Coolify

#### This GitHub Action automates the deployment of applications and the update of environment variables (ENVs) on Coolify, a self-hosted deployment platform.

📌 Features

- 🚀 Automatically deploys an application to Coolify.
- 🔄 Updates environment variables directly on the Coolify instance.
- 🔑 Secure authentication via Coolify API.
- ⚡️ Easy integration with GitHub Actions workflows.

Required Inputs

- coolifyUrl: The Coolify instance URL.
- coolifyToken: The API token for authentication.
- coolifyAppUuid: The UUID of the application to deploy.

Optional Inputs

- secrets: Additional secrets to include in the environment (not required).
- secretsToExclude: List of secrets to exclude from the environment (not required). Use if secrets is defined.

🛠️ How to Use
Simply add this Action to your GitHub Actions workflow and configure the required variables, such as the Coolify URL, API key, and environment variables.

````
name: Coolify Deploy

on:
  push:
    branches: [stage]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: stage
    steps:
      - name: GitHub Action - Deploy and Update ENVs on Coolify
        uses: devevandro/coolify-app-deploy@v6
        with:
          coolify_url: ${{ secrets.COOLIFY_URL }}
          coolify_token: ${{ secrets.COOLIFY_TOKEN }}
          coolify_app_uuid: ${{ secrets.COOLIFY_APP_UUID }}
          secrets: ${{ toJson(secrets) }} // not required
          secrets_to_exclude: '["COOLIFY_URL" ,"COOLIFY_TOKEN" ,"COOLIFY_APP_UUID", "github_token"]' // not required, use with the secrets
````
