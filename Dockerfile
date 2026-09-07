FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci
COPY . .
ARG VITE_SVM_API_URL=/api
ARG VITE_PROTOCOL_EXPLORER_URL
ENV VITE_SVM_API_URL=$VITE_SVM_API_URL VITE_PROTOCOL_EXPLORER_URL=$VITE_PROTOCOL_EXPLORER_URL
RUN test -n "$VITE_PROTOCOL_EXPLORER_URL" && npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
ENV INDEXER_ORIGIN=http://indexer:8080
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
