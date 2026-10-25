FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy only the files the application needs
COPY index.html eslint.config.js postcss.config.js tailwind.config.js vite.config.js ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]
