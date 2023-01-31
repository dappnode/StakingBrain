#!/bin/bash

cd /app && yarn && yarn build:webpack
cd /app/packages/ui/ && yarn start:webpack:dev &
cd /app/packages/brain && yarn start:webpack:dev &

wait