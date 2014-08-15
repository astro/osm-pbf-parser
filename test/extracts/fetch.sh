#!/bin/bash

dirname=$(dirname `readlink -f $0`)
cd "$dirname"
file=auckland.osm.pbf

if [ -e $file ]; then
    hash=`shasum "$file" | awk '{ print $1 }'`
    if test "$hash" == 930baeaf6c5b95208728fcbd08cae80a2891a06e; then
        exit 0 # already exists with correct hash
    fi
fi

curl -o auckland.osm.pbf https://s3.amazonaws.com/metro-extracts.mapzen.com/auckland.osm.pbf \
|| curl -o auckland.osm.pbf http://scratch.substack.net/auckland.osm.pbf \
|| (echo 'failed to fetch auckland osm extract' >&2; exit 1)
