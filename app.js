var sys		= require('sys'),
	fs		= require('fs'),
	express = require('express'),
	spawn	= require('child_process').spawn,
	tail	= spawn('tail', ['-f', 'server.log']);

// var used for \n scanner
tail.current_line = "";

// holds user state
var status = {
	// stores: {username: {date: 'last login or logout date', online: true}}
	users: {},
	usersFile: 'users.json',
	
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
status.loadData();

// web app
var app = express.createServer();
	app.get('/', function(req, res) {
		res.render('index.jade', {
			locals: {
				users: status.users,
				title: 'Jfro\'s Minecraft Server'
			}
		});
		//res.send(JSON.stringify(status.users));
	});
	app.listen(3000);

// tail callbacks
tail.on('newline', function(line) {
	console.log(line);
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
				date: date,
				online: true
			};
		}
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
