## Running the Project with Docker

This project is containerized using Docker and Docker Compose for easy setup and deployment. Below are the specific instructions and requirements for running this project:

### Project-Specific Docker Requirements
- **Node.js Version:** Uses `node:22.13.1-slim` (set via `ARG NODE_VERSION=22.13.1` in the Dockerfile).
- **Build Process:** TypeScript sources are built in a multi-stage Docker build. Only the compiled output (`/dist`), production dependencies, and static assets (`/public`) are included in the final image.
- **User Security:** Runs as a non-root user (`appuser`) for improved security.

### Environment Variables
- The application expects environment variables defined in a `.env` file at the project root. Uncomment the `env_file: ./.env` line in `docker-compose.yml` to enable automatic loading of these variables into the container.

### Build and Run Instructions
1. **(Optional) Configure Environment Variables:**
   - Ensure your `.env` file is present at the project root and contains all required variables for your environment.
2. **Build and Start the Application:**
   - Run the following command from the project root:
     ```sh
     docker compose up --build
     ```
   - This will build the Docker image and start the service defined as `ts-app`.

### Special Configuration
- **Static Assets:** The `public/uploads` directory (including images and compressed images) is copied into the container and available at runtime.
- **TypeScript Build:** The build process uses `npm run build` to compile TypeScript sources before running the app.
- **Memory Limits:** The container sets `NODE_OPTIONS=--max-old-space-size=4096` to increase available memory for Node.js.

### Exposed Ports
- **ts-app Service:**
  - Exposes port `5000` (mapped to host port `5000` by default).

### Custom Docker Network
- The service runs on a custom bridge network named `appnet` for isolated communication. If you add more services (e.g., a database), connect them to this network.

---
**Note:**
- If you add additional services (like a database), update `docker-compose.yml` accordingly and use the `depends_on` field for service dependencies.
- For development, you may want to mount source files or use a different entrypoint. The current setup is optimized for production builds.
