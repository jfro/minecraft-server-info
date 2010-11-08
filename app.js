// TODO: split components into separate files

var sys		= require('sys'),
	fs		= require('fs'),
	spawn	= require('child_process').spawn,
	config	= require('./config'),
	path    = require('path'),
	ServerMonitor = require('./server-monitor'),
	LogMonitor = require('./log-monitor');

// database support
var mongoose = require('mongoose').Mongoose;
//	db = mongoose.connect('mongodb://localhost/minecraft');
mongoose.model('User', require('./User').UserModel);

// holds user state
var status = {
	// stores: {username: {date: 'last login or logout date', online: true}}
	db: null,
	//users: {},
	// usersFile: 'users.json',
	ircOnline: false,
	userQueue: [],
	timeout: null,
	
	// connects to MongoDB
	connectDb: function (host, dbname) {
		this.db = mongoose.connect('mongodb://'+host+'/'+dbname);
		console.log('Database connected');
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
				if(!user)
				{
					console.log('Creating new user for ' + userInfo['username']);
					user = new User();
					user.username = userInfo['username'];
					user.paid = false;
					user.first_seen_date = userInfo['date'];
					user.time_played = 0;
				}
				user.online = userInfo['online'];
				if(userInfo['online'])
					user.last_connect_date = userInfo['date'];
				else
					user.last_disconnect_date = userInfo['date'];
				user.save();
				console.log('User updated, firing queue');
				self.setupTimeout();
			});
		}
		else
		{
			console.log('Queue empty, sleeping');
			self.timeout = null;
		}
	},
	
	userForUsername: function (username, callback) {
		var User = this.db.model('User');
		var self = this;
		User.find({'username': username}).one(function (user) {
			callback(user);
		});
	},
	
	userSignedOn: function (username, date) {
		this.userQueue.push({'username': username, 'online': true, 'date': new Date(date)});
		if(!this.timeout)
		{
			this.setupTimeout();
		}
	},
	
	userSignedOff: function (username, date) {
		this.userQueue.push({'username': username, 'online': false, 'date': new Date(date)});
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
		ircClient.say(config.irc.channels, username + ' logged on');
});
logMonitor.on('signoff', function (username, date) {
	status.userSignedOff(username, date);
	
	if(status.ircOnline)
		ircClient.say(config.irc.channels, username + ' logged off');
});
logMonitor.startMonitoring();

// var tail = spawn('tail', ['-f', path.join(config.serverPath, 'server.log')]);
// // var used for \n scanner
// tail.current_line = "";

// web app
if(config.web.enabled)
{
	var express = require('express');
	var app = express.createServer();
		app.get('/', function(req, res) {
			var User = status.db.model('User');
			User.find({}).all(function (users) {
				res.render('index.jade', {
					locals: {
						users: users,
						title: 'Jfro\'s Minecraft Server'
					}
				});
			});
		});
		app.listen(config.web.port);
		console.log('Web server listening on port '+config.web.port)
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
	var ircClient = new irc.Client(config.irc.server, config.irc.nick, {
	    channels: config.irc.channels,
	});
	ircClient.addListener('join', function (channel, nick) {
		//console.log(nick + ' joined '+channel);
		if(nick == config.irc.nick)
		{
			console.log('joined ' + channel);
			status.ircOnline = true;
		}
	});
	ircClient.addListener('message', function(nick, to, text) {
		if(text == '!users')
		{
			var User = status.db.model('User');
			User.find({'online': true}).all(function (users) {
				var onlineUsernames = [];
				for(var index in users)
				{
					var user = users[index];
					onlineUsernames.push(user.username);
				}
				ircClient.say(to, 'online users: ' + onlineUsernames.join(', '));
			});
			
		}
		else if(text == '^5')
		{
			ircClient.say(to, nick + ': ^5');
		}
	});
}

// server process monitor
mcmonitor.on('online', function(){
	if(status.ircOnline)
		ircClient.say(config.irc.channels, 'Minecraft server now ONLINE');
});
mcmonitor.on('offline', function(){
	if(status.ircOnline)
		ircClient.say(config.irc.channels, 'Minecraft server now OFFLINE');
});

process.on('SIGINT', function () {
	console.log('Got SIGINT. Shutting down.');
	if(ircClient)
	{
		ircClient.say(config.irc.channels, 'Bye guys :(');
		if(ircClient.disconnect)
			ircClient.disconnect();
	}
	mcmonitor.stopMonitoring();
	logMonitor.stopMonitoring();
	app.close();
	process.exit();
});