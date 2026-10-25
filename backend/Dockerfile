# Use Node.js official image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy only the files the application needs
COPY app.js server.js init-db.sh ./
COPY config ./config
COPY controllers ./controllers
COPY migrations ./migrations
COPY models ./models
COPY routes ./routes
COPY utils ./utils

# Expose app port
EXPOSE 3001

# Run migrations and start the app
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npm start"]
