ARG DOCKER_IMAGE=node:20.17.0-alpine3.20

# Build
FROM ${DOCKER_IMAGE} AS build-stage

WORKDIR /app
COPY package.json yarn.lock tsconfig.json .yarnrc.yml ./
COPY packages packages

# Required to build with vite
RUN apk update && apk add --no-cache python3 py3-pip build-base
# Enable corepack to use modern package manager
RUN corepack enable

# Build but keep only production dependencies
RUN yarn install --immutable && \
  yarn build && \
  yarn clean:libraries && \
  yarn workspaces focus --all --production

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
