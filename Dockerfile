FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg chromium \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV CHROMIUM_PATH=/usr/bin/chromium \
    PORT=4000
RUN NODE_OPTIONS=--max-old-space-size=3072 npm run build
EXPOSE 4000
CMD ["npm", "start"]
