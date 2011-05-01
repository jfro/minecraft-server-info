Description
============
So far simple node/express app that will monitor the server.log file to be able to track who's online.  It'll be able to display some info on a web page and announce information on IRC.  Newly added IRC bridge via server console & log file.


Edit config.js as necessary and run via: 

  node server.js

It'll be listening on port 3001 by default.

Features
============
 * Doesn't require server mods
 * User status web page
 * IRC bot
	* Announces sign ons & offs
	* List online users via !users
	* Announce server offline/online
	* Forward game and IRC chat (requires server running via screen)
 * Tracks how long users play (if wanting to show it)

Requirements
============
 * [Minecraft Server](http://minecraft.net)
 * [Node.js 0.4.0+](http://nodejs.org)
 * [MongoDB](http://mongodb.org)
 * [Mongoose 1.2.0+](http://mongoosejs.com)
 * [Express.js 2.2.2+](http://expressjs.com)
 * [node-irc 0.1.2+](https://github.com/martynsmith/node-irc)
 * [Jade 0.10.4+](http://github.com/visionmedia/jade)
