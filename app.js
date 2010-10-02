var sys		= require('sys'),
	fs		= require('fs'),
	spawn	= require('child_process').spawn,
	config	= require('./config.js').Config;

// holds user state
var status = {
	// stores: {username: {date: 'last login or logout date', online: true}}
	users: {},
	usersFile: 'users.json',
	ircOnline: false,
	
	// updates users.json
	updateData: function () {
		//console.log('Updating... online: ' + sys.inspect(this.online));
		//console.log(JSON.stringify(this.users));
		
		fs.writeFile(this.usersFile, JSON.stringify(this.users)+"\n", function (err) {
			if (err) throw err;
			//console.log('User status file updated');
		});
	},
	
	// loads users.json
	loadData: function () {
		var self = this;
		fs.stat(self.usersFile, function (err, stats) {
			if(!err && stats.isFile())
			{
				console.log(self.usersFile + ' exists, loading');
				fs.readFile(self.usersFile, function (err, data) {
					if (err) throw err;
					this.users = JSON.parse(data);
					//console.log('User data loaded');
				});
			}
		});
	}
};

// read in current
status.usersFile = config.dataFile;
status.loadData();

var tail = spawn('tail', ['-f', config.serverPath + 'server.log']);
// var used for \n scanner
tail.current_line = "";

// web app
if(config.web.enabled)
{
	var express = require('express');
	var app = express.createServer();
		app.get('/', function(req, res) {
			res.render('index.jade', {
				locals: {
					users: status.users,
					title: 'Jfro\'s Minecraft Server'
				}
			});
		});
		app.listen(config.web.port);
		console.log('Web server listening on port '+config.web.port)
}

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
			ircClient.say(to, 'online users: ' + sys.inspect(onlineUsers));
		}
	});
}

// tail callbacks, newline for each new line up til \n, matches for login/logouts
tail.on('newline', function(line) {
	//console.log(line);
	var matches = null;
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\s\[(.*)\]\slogged in/))
	{
		var date = matches[1],
			username = matches[2];
		
		// update our state to show user is online and not offline
		var user = status.users[username];
		if(user)
		{
			user.date = date;
			user.online = true;
		}
		else
		{
			status.users[username] = {
				username: username,
				date: date,
				online: true
			};
		}
		if(status.ircOnline)
			ircClient.say('#grminecraft', username + ' logged on');
		status.updateData();
	}
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\slost connection/))
	{
		var date = matches[1],
			username = matches[2];
			
		// update user status as offline
		var user = status.users[username];
		if(user)
		{
			user.date = date;
			user.online = false;
		}
		if(status.ircOnline)
			ircClient.say('#grminecraft', username + ' logged out');
		status.updateData();
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
	console.log('child process exited with code ' + code + ', shutting down');
	app.close();
});
