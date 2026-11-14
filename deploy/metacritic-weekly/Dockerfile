# Build context: the repository root (Coolify: base directory "/", Dockerfile location
# "/deploy/metacritic-weekly/Dockerfile").
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENV API_ANYTHING_PLAINTEXT=1
# The container only idles; Coolify's scheduled task runs the job inside it.
CMD ["sleep", "infinity"]
