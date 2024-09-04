#!/bin/bash

# Build must be located in entrypoint due to docker volume mount

corepack enable && yarn set version berry

cd /app && yarn && yarn build && yarn start:dev &

wait