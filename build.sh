#!/bin/sh

set -e

# Update everything (just in case)
npm rebuild
npm install --no-optional

# Prepare the dev-ui temp workspace, then build only the runtime assets.
grunt clean yarn build \
  --production \
  --force \
  --noLint \
  --noTest \
  --noStyleguide \
  --noDocs
