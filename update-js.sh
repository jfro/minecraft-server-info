#!/bin/sh

# name of server screen to tell it to reloadjs
SCREENNAME=minecraft_server
# path to server's js folder
SERVERJSPATH=/home/jerome/minecraft/server/js

cd $SERVERJSPATH

# update code
git pull

# bail if git doesn't work
if [ $? != 0 ]; then
	echo "Pull failed"
	exit 1
fi

screen -S mcserver -p 0 -X stuff "`printf "say Reloading JS modules in 3s...\r"`"; sleep 3
screen -S mcserver -p 0 -X stuff "`printf "reloadjs\r"`"

echo "JSApi modules reloaded"
