# RAGESTATE Firebase MCP Server

This directory contains a lightweight Express server that acts as a Model Context Protocol (MCP) provider for Firebase. It exposes a structured, secure, and observable set of tools for AI agents to interact with the RAGESTATE Firebase project.

## Why?

- **Security**: Prevents AI tools from needing direct, high-privilege access to the Firebase Admin SDK or production credentials. The server runs with a least-privilege service account.
- **Stability**: Provides a versioned, stable API contract (`/tools/:toolName`). If the underlying Firebase logic changes, the tool's interface can remain the same.
- **Observability**: All tool invocations can be logged, timed, and audited.
- **Guardrails**: Implements input validation (with `zod`), `dryRun` flags for mutations, and path allow-listing to prevent accidental or malicious operations.

## Setup

1.  **Install Dependencies**:

    ```bash
    npm --prefix tools/mcp-firebase install
    ```

2.  **Create Service Account**:
    - Go to the GCP Console for your `ragestate-app` project.
    - Navigate to `IAM & Admin` > `Service Accounts`.
    - Create a new service account (e.g., `ragestate-mcp-server`).
    - Grant it the following minimal roles for read-only access:
      - `Firebase Viewer`
      - `Cloud Datastore User` (provides Firestore read access)
    - Create a JSON key for this service account and download it.
    - Place the key in a new `secrets/` directory at the repository root: `secrets/firebase-mcp-sa.json`.
    - **Important**: Ensure `secrets/` is added to your `.gitignore` file.

3.  **Configure Environment**:
    - Create a `.env` file in the `tools/mcp-firebase` directory.
    - Add the following variables:

    ```env
    # Path to your service account key
    GOOGLE_APPLICATION_CREDENTIALS=../secrets/firebase-mcp-sa.json

    # Your Firebase Project ID
    GCP_PROJECT=ragestate-app

    # Optional: A secret key to protect the MCP server endpoints
    MCP_API_KEY=your-super-secret-key
    ```

## Running the Server

- **Development (with auto-reload)**:

  ```bash
  npm --prefix tools/mcp-firebase run dev
  ```

  The server will start on `http://localhost:8765`.

- **Production**:

  ```bash
  npm --prefix tools/mcp-firebase start
  ```

- **With Firestore Emulator**:
  1.  Start the emulator: `firebase emulators:start --only firestore`
  2.  Set the environment variable before starting the server:
      `bash
export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
npm --prefix tools/mcp-firebase run dev
`
      When the emulator is detected, the server will not use the service account credentials.

## Available Tools

The server exposes tools via POST requests to `/tools/:toolName`.

### `getFirestoreDoc`

Retrieves a single document from Firestore.

- **Endpoint**: `POST /tools/getFirestoreDoc`
- **Body**:
  ```json
  {
    "path": "users/some-user-id"
  }
  ```
- **Success Response**:
  ```json
  {
    "result": {
      "exists": true,
      "data": { "field": "value" }
    }
  }
  ```

### `listCollections`

Lists the root collections or sub-collections of a document.

- **Endpoint**: `POST /tools/listCollections`
- **Body (for root collections)**:
  ```json
  {}
  ```
- **Body (for sub-collections)**:
  ```json
  {
    "path": "users/some-user-id"
  }
  ```
- **Success Response**:
  ```json
  {
    "result": ["notifications", "devices", "settings"]
  }
  ```

## Adding New Tools

1.  **Define a Zod Schema**: Create a schema in `server.js` for input validation.
2.  **Write the Handler Function**: Create an `async` function that takes the parsed parameters and interacts with the Firebase Admin SDK.
3.  **Register the Tool**: Add the schema, handler, and a description to the `TOOLS` object in `server.js`.
