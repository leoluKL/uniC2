#!/bin/bash

WATCH_DIR=~/synch/uniC2/unic2_asset_app
SYNC_SCRIPT=~/synch/uniC2/unic2_asset_app/syncec2.sh

fswatch -o "$WATCH_DIR" | while read _; do
  echo "Change detected, syncing..."
  "$SYNC_SCRIPT"
done