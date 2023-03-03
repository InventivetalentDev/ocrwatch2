#!/bin/sh
CURR=$(json -i -f package.json version)
CURR1=${CURR:1:-1}
echo $CURR1
BUMPED=$(calver inc $CURR1 --format yy.mm.minor --levels calendar.minor)
echo $BUMPED
json -I -f package.json -e "this.version = \"$BUMPED\""
