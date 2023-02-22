ARG NODE_VERSION=18.13.0

###############
# BUILD stage #
###############
FROM node:${NODE_VERSION}-alpine as build-stage

# Fixes error on `react-scripts-build`
# error:0308010C:digital envelope routines::unsupported https://stackoverflow.com/questions/69692842/error-message-error0308010cdigital-envelope-routinesunsupported
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN apk add --no-cache --virtual .build-deps \
  build-base \
  python3 \
  git \
  && apk add --no-cache \
  bash \
  curl \
  && rm -rf /var/cache/apk/*

# Install dependencies
WORKDIR /app
COPY package.json yarn.lock lerna.json tsconfig.json ./
COPY packages/ui/package.json \ 
  packages/ui/
COPY packages/brain/package.json \ 
  packages/brain/
COPY packages/common/package.json \ 
  packages/common/
RUN yarn --frozen-lockfile --non-interactive --ignore-optional

# Build common
WORKDIR /app/packages/common/
COPY packages/common/ .
RUN yarn build
# Results in dist/*

# Build admin-ui
WORKDIR /app/packages/ui/
COPY packages/ui/ .
RUN yarn build
# Results in build/*

# Build brain
WORKDIR /app/packages/brain/
COPY packages/brain/ .
RUN yarn build
# Results in dist/*

###############
# FINAL stage #
###############

FROM node:${NODE_VERSION}-alpine 
WORKDIR /app

COPY ./packages/brain/tls ./tls

# Copy root app
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/package.json ./package.json
# Copy common
COPY --from=build-stage /app/packages/common/dist ./packages/common/dist
COPY --from=build-stage /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=build-stage /app/packages/common/package.json ./packages/common/package.json
# Copy ui
COPY --from=build-stage /app/packages/ui/build ./packages/ui/build
# Copy brain
COPY --from=build-stage /app/packages/brain/dist /app/packages/brain/dist
COPY --from=build-stage /app/packages/brain/node_modules /app/packages/brain/node_modules
COPY --from=build-stage /app/packages/brain/package.json /app/packages/brain/package.json

CMD [ "node", "packages/brain/dist/index" ]