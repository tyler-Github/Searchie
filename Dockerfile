# Stage 1: Build the backend
FROM node:18 AS backend-builder

# Set working directory for the backend
WORKDIR /app/backend

# Copy backend package.json and package-lock.json
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend source code
COPY backend/ .

# Stage 2: Build the frontend
FROM node:18 AS frontend-builder

# Set working directory for the frontend
WORKDIR /app/frontend

# Copy frontend package.json and package-lock.json
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Build frontend
RUN npm run build

# Stage 3: Create final image
FROM node:18

# Set working directory
WORKDIR /app

# Copy backend build artifacts
COPY --from=backend-builder /app/backend /app/backend

# Copy frontend build artifacts
COPY --from=frontend-builder /app/frontend /app/frontend

# Install production dependencies for backend
WORKDIR /app/backend
RUN npm install --only=production
RUN npx puppeteer browsers install

WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Install nginx
WORKDIR /app
RUN apt-get update && apt-get install -y nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Copy the entrypoint script
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint script as the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]