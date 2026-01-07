#!/bin/bash

rsync -az --delete \
  -e "ssh -i ~/dev/unic2.pem" \
  --exclude .git \
  --exclude .venv \
  --exclude __pycache__ \
  ./ \
  ubuntu@52.77.194.170:/home/ubuntu/unic2_asset_app/