# Dependencies once, reused by both the dev and build stages.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Target used by docker-compose.override.yml: the Vite dev server with reload.
FROM deps AS dev
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
# Frontend env vars are baked into the bundle, so they are build-time and public.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY . .
# Typecheck runs as part of build: a type error fails the image, not production.
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
