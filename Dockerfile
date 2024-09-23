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

# Install nginx
WORKDIR /app
RUN apt-get update && apt-get install -y nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

# Start both backend and frontend
CMD ["sh", "-c", "npm start --prefix /app/backend & npm run dev --prefix /app/frontend"]
