// TODO: split components into separate files

var sys		= require('sys'),
	fs		= require('fs'),
	spawn	= require('child_process').spawn,
	config	= require('./config'),
	path    = require('path'),
	monitor = require('./monitor');

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

var tail = spawn('tail', ['-f', path.join(config.serverPath, 'server.log')]);
// var used for \n scanner
tail.current_line = "";

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
var mcmonitor = new monitor(10 * 1000);

// IRC bot
if(config.irc.enabled)
{
	var irc = require('irc');
	var ircClient = new irc.Client(config.irc.server, config.irc.nick, {
	    channels: config.irc.channels,
	});
	ircClient.addListener('join', function (channel, nick) {
		console.log(nick + ' joined '+channel);
		if(nick == config.irc.nick)
		{
			console.log('bringing irc online');
			status.ircOnline = true;
			mcmonitor.startChecking();
		}
	});
	ircClient.addListener('message', function(nick, to, text) {
		if(text == '!users')
		{
			var onlineUsers = [];
			for(var username in status.users) {
				var user = status.users[username];
				if(user.online)
					onlineUsers.push(username);
			}
			ircClient.say(to, 'online users: ' + onlineUsers.join(', '));
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

// tail callbacks, newline for each new line up til \n, matches for login/logouts
tail.on('newline', function(line) {
	//console.log(line);
	var matches = null;
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\s\[(.*)\]\slogged in/))
	{
		var date = matches[1],
			username = matches[2];
		
		// update our state to show user is online and not offline
		status.userSignedOff(username, date);
		
		if(status.ircOnline)
			ircClient.say('#grminecraft', username + ' logged on');
		//status.updateData();
	}
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\slost connection/))
	{
		var date = matches[1],
			username = matches[2];
			
		// update user status as offline
		status.userSignedOn(username, date);
		
		if(status.ircOnline)
			ircClient.say('#grminecraft', username + ' logged out');
		//status.updateData();
	}
});

tail.stdout.on('data', function (data) {
	//sys.print('stdout: ' + data);
	data = data.toString();
	for(var i = 0; i < data.length; i++)
	{
		//console.log("Checking '"+data[i]+"'");
		if(data[i] == "\n")
		{
			//console.log("Got newline");
			tail.emit('newline', tail.current_line);
			tail.current_line = "";
		}
		else
		{
			tail.current_line += data[i];
		}
	}
	//myString.match(/^\d+$/)
	//tail.emit('newline', "test");
});

tail.stderr.on('data', function (data) {
	sys.print('stderr: ' + data);
});

tail.on('exit', function (code) {
	console.log('child process exited with code ' + code + '');
	//app.close();
});

process.on('SIGINT', function () {
	console.log('Got SIGINT. Shutting down.');
	if(ircClient)
	{
		ircClient.say(config.irc.channels, 'Bye guys :(');
		if(ircClient.disconnect)
			ircClient.disconnect();
	}
	mcmonitor.stopChecking();
	tail.kill();
	app.close();
	process.exit();
});