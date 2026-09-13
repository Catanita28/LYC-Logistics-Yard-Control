FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY server.js migrate.js migrate.sql ./
COPY public ./public
USER node
EXPOSE 10000
CMD ["sh","-c","node migrate.js && node server.js"]
