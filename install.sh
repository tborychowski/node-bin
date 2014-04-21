#!/bin/bash

cd dist
shopt -s nullglob
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
for f in *.js
do
	cp $DIR/$f $HOME/bin/${f%.*}
	echo -e "\e[32m[OK]\e[39m ${f%.*}"

	# cp $f /usr/local/bin/${f%.*}
	# sed -i '1i#!/usr/bin/node' /usr/local/bin/${f%.*}
done
