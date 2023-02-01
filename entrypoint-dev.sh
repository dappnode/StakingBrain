#!/bin/bash

cd /app && yarn && yarn build
cd /app/packages/ui/ && yarn start:dev &
cd /app/packages/brain && yarn start:dev &

wait