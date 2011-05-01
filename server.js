
require.paths.unshift('./lib');

var sys		= require('sys'),
	fs		= require('fs'),
	spawn	= require('child_process').spawn,
	exec	= require('child_process').exec,
	config	= require('./config'),
	path    = require('path'),
	ServerMonitor = require('server-monitor'),
	LogMonitor = require('log-monitor'),
	webapp	= null;

// database support
var mongoose = require('mongoose');

// Load user model into mongoose
var User = require('User').User;
mongoose.model('User', User);

// holds user state
var status = {
	db: null,
	ircOnline: false,
	ircClient: null,
	userQueue: [],
	timeout: null,
	
	// connects to MongoDB
	connectDb: function (host, dbname) {
		this.db = mongoose;
		this.db.connect('mongodb://'+host+'/'+dbname, function(err) {
			if(err) {
				console.log('Failed to connect to mongodb: ' + err.message);
				process.emit('SIGINT');
			}
		});
	},
	
	setupTimeout: function() {
		this.timeout = setTimeout(this.queueProcess, 500);
		this.timeout.context = this;
	},
	
	queueProcess: function() {
		var self = this.context; // since this is now the timeout object
		if(self.userQueue.length > 0)
		{
			//console.log('Processing next queue entry... out of ' + this.userQueue.length);
			var userInfo = self.userQueue.shift();
			var User = self.db.model('User');
			self.userForUsername(userInfo['username'], function(user) {
				var dirty = false;
				if(!user)
				{
					user = new User();
					user.username = userInfo['username'];
					user.paid = false;
					user.first_seen_date = userInfo['date'];
					user.time_played = 0;
					dirty = true;
				}
				user.online = userInfo['online'];
				if(userInfo['online'] && userInfo['date'] > user.last_connect_date) {
					user.last_connect_date = userInfo['date'];
					dirty = true;
				}
				else if(!userInfo['online'] && userInfo['date'] > user.last_disconnect_date) {
					user.last_disconnect_date = userInfo['date'];
					// update time_played
					if(user.last_connect_date && user.last_disconnect_date) {
						var diff = (user.last_disconnect_date.getTime() - user.last_connect_date.getTime())/1000;
						user.time_played += diff;
					}
					dirty = true;
				}
				if(dirty) {
					user.save();
				}
				//console.log('User updated, firing queue');
				self.setupTimeout();
			});
		}
		else
		{
			//console.log('Queue empty, sleeping');
			self.timeout = null;
		}
	},
	
	userForUsername: function (username, callback) {
		var User = this.db.model('User');
		var self = this;
		User.findOne({'username': username}, function (err, user) {
			callback(user);
		});
	},
	
	userSignedOn: function (username, date) {
		var actionDate = new Date(date);
		console.log('Sign on: ' + actionDate + ' offset: ' + actionDate.getTimezoneOffset());
		this.userQueue.push({'username': username, 'online': true, 'date': actionDate});
		if(!this.timeout)
		{
			this.setupTimeout();
		}
	},
	
	userSignedOff: function (username, date) {
		var actionDate = new Date(date);
		console.log('Sign off: ' + actionDate + ' offset: ' + actionDate.getTimezoneOffset());
		this.userQueue.push({'username': username, 'online': false, 'date': actionDate});
		if(!this.timeout)
		{
			this.setupTimeout();
		}
	}
};

status.connectDb(config.database.host, config.database.dbname);

// setup log monitor
var logMonitor = new LogMonitor(path.join(config.serverPath, 'server.log'));
logMonitor.on('signon', function (username, date) {
	status.userSignedOn(username, date);
	
	if(status.ircOnline)
		status.ircClient.say(config.irc.channels, username + ' logged on');
});
logMonitor.on('signoff', function (username, date) {
	status.userSignedOff(username, date);
	
	if(status.ircOnline)
		status.ircClient.say(config.irc.channels, username + ' logged off');
});
// setup chat handler if forwarding is enabled
if(config.irc.forward_chat) {
	logMonitor.on('chat', function(date, username, message) {
		console.log(username + ' chatted: ' + message);
		if(status.ircOnline)
			status.ircClient.say(config.irc.channels, '<'+username+'> ' + message);
	});
}
logMonitor.startMonitoring();

// var tail = spawn('tail', ['-f', path.join(config.serverPath, 'server.log')]);
// // var used for \n scanner
// tail.current_line = "";

// web app
if(config.web.enabled)
{
	var WebApp = require('./web-app');
	webapp = new WebApp(status, config.web);
	webapp.start(status, config.web.port);
	
	// post-receive hook notification
	webapp.on('jsreloaded', function() {
		console.log('js done reloading, notifying!');
		if(status.ircClient)
		{
			status.ircClient.say(config.irc.channels, '* JS modules have been reloaded');
		}
	});
}

// server process monitor
var mcmonitor = null;
if(config.serverMonitor.enabled)
{
	mcmonitor = new ServerMonitor(config.serverMonitor.interval * 1000);
	mcmonitor.checkProcess(); // initial check to not notify yet
	mcmonitor.startMonitoring();
}

// IRC bot
if(config.irc.enabled)
{
	var irc = require('irc');
	status.ircClient = new irc.Client(config.irc.server, config.irc.nick, {
	    channels: config.irc.channels,
	});
	status.ircClient.addListener('join', function (channel, nick) {
		//console.log(nick + ' joined '+channel);
		if(nick == config.irc.nick)
		{
			console.log('joined ' + channel);
			status.ircOnline = true;
		}
	});
	status.ircClient.addListener('message', function(nick, to, text) {
		if(text == '!users')
		{
			var User = status.db.model('User');
			User.find({'online': true}, function(err, users) {
				var onlineUsernames = [];
				for(var index in users)
				{
					var user = users[index];
					onlineUsernames.push(user.username);
				}
				status.ircClient.say(to, 'online users: ' + onlineUsernames.join(', '));
			});
			
		}
		else if(text == '^5')
		{
			status.ircClient.say(to, nick + ': ^5');
		}
		else {
			// screen -S $SCREEN_NAME -p 0 -X stuff "`printf "say Backing up the map in 10s\r"`"; sleep 10
			// §
			if(config.irc.forward_chat && config.irc.screen_name) {
				var child = exec('screen -S '+config.irc.screen_name+' -p 0 -X stuff "`printf "say [IRC] '+nick+': '+text+'\r"`"',
					function (error, stdout, stderr) {
						if (error !== null) {
							console.log('chat forward error executing screen: ' + error);
						}
					});
			}
		}
	});
}

// server process monitor
if(config.serverMonitor.enabled)
{
	mcmonitor.on('online', function(){
		if(status.ircOnline)
			status.ircClient.say(config.irc.channels, '* Minecraft server now ONLINE');
	});
	mcmonitor.on('offline', function(){
		if(status.ircOnline)
			status.ircClient.say(config.irc.channels, '* Minecraft server now OFFLINE');
	});
}

process.on('SIGINT', function () {
	console.log('Got SIGINT. Shutting down.');
	if(status.ircClient)
	{
		status.ircClient.say(config.irc.channels, 'Bye guys :(');
		if(status.ircClient.disconnect)
			status.ircClient.disconnect();
	}
	mcmonitor.stopMonitoring();
	logMonitor.stopMonitoring();
	webapp.stop();
	process.exit();
});
