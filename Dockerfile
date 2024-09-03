ARG DOCKER_IMAGE=node:20.17.0-alpine.3.20

# Build
FROM ${DOCKER_IMAGE} as build-stage

WORKDIR /app
COPY package.json yarn.lock lerna.json tsconfig.json ./
COPY packages/ui/ packages/ui/
COPY packages/brain/ packages/brain/
COPY packages/common/ packages/common/

# Required to build with vite
RUN apk update && apk add --no-cache python3 py3-pip build-base

# Build but keep only production dependencies
RUN yarn --frozen-lockfile --non-interactive --ignore-optional && \
  yarn build && \
  yarn clean:libraries && \
  yarn --frozen-lockfile --non-interactive --ignore-optional --production

# Production
FROM ${DOCKER_IMAGE}
ENV NODE_ENV=production
WORKDIR /app

COPY ./packages/brain/tls ./tls

# Copy root app
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/package.json ./package.json
# Copy common
COPY --from=build-stage /app/packages/common/dist ./packages/common/dist
COPY --from=build-stage /app/packages/common/package.json ./packages/common/package.json
# Copy ui
COPY --from=build-stage /app/packages/ui/build ./uiBuild
# Copy brain
COPY --from=build-stage /app/packages/brain/dist /app/packages/brain/dist
COPY --from=build-stage /app/packages/brain/package.json /app/packages/brain/package.json

CMD [ "node", "packages/brain/dist/index" ]
