var spawn 	= require('child_process').spawn,
	events	= require('events'),
	sys		= require('sys');

/**
 * Monitors minecraft_server's server.log file and emits connect & disconnect events with user info
 */
function LogMonitor(log_path)
{
	this.process = null;
	this.log_path = log_path;
	this.current_line = '';
	this.current_addresses = new Object();
	this.current_usernames = new Object();
	events.EventEmitter.call(this);
}

sys.inherits(LogMonitor, events.EventEmitter);

LogMonitor.prototype.startMonitoring = function ()
{
	if(!this.process)
	{
		this.process = spawn('tail', ['-f', this.log_path]);
		this.setupCallbacks();
	}
}

LogMonitor.prototype.stopMonitoring = function ()
{
	this.process.kill();
	this.process = null;
}

// private tail handling methods
LogMonitor.prototype.setupCallbacks = function ()
{
	var self = this;
	self.process.stdout.on('data', function(data) {
		//sys.print('stdout: ' + data);
		data = data.toString();
		for(var i = 0; i < data.length; i++)
		{
			//console.log("Checking '"+data[i]+"'");
			if(data[i] == "\n")
			{
				//console.log("Got newline");
				//tail.emit('newline', self.current_line);
				self.processNewline(self.current_line);
				self.current_line = "";
			}
			else
			{
				self.current_line += data[i];
			}
		}
	});
	self.process.stderr.on('data', function(data) {
		sys.print('stderr: ' + data);
	});
	self.process.on('exit', function (code) {
		console.log('tail process exited with code: ' + code + '');
		//app.close();
	});
}

LogMonitor.prototype.processNewline = function (line)
{
	//console.log(line);
	var matches = null;
	// match logon
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\s\[\/(.*)\]\slogged in/))
	{
		var date = matches[1],
			username = matches[2],
			ip = matches[3];
		this.current_addresses[ip] = {username: username, date: date};
		this.current_usernames[username] = {ip: ip, date: date};
		this.emit('signon', username, date, ip);
	}
	// match username disconnect
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\slost connection/))
	{
		var date = matches[1],
			username = matches[2];
		this.emit('signoff', username, date);
		var userInfo = this.current_usernames[username];
		delete this.current_usernames[username];
		if(userInfo)
			delete this.current_addresses[userInfo.ip];
	}
	// match IP disconnect: 2011-07-05 00:22:44 [INFO] /127.0.0.1:63587 lost connection
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s\/(.*?)\slost connection/)) {
		// console.log('Matched: ' + sys.inspect(matches));
		var date = matches[1],
			ip = matches[2];
		var userInfo = this.current_addresses[ip];
		if(userInfo) {
			this.emit('signoff', userInfo.username, date);
			delete this.current_addresses[ip];
			delete this.current_usernames[username];
		}
	}
	// match kicks/bans: 2011-07-16 14:59:40 [WARNING] jfro was kicked for floating too long!
	// 2011-07-16 15:34:52 [INFO] KICKED: *Console* (127.0.0.1) kicked player 'jfro': Banned!
	// should try to combine these better
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[WARNING\]\s(.*?)\swas kicked/)) {
		var date = matches[1],
			username = matches[2];
		this.emit('signoff', username, date);
		var userInfo = this.current_usernames[username];
		if(userInfo) {
			delete this.current_usernames[username];
			delete this.current_addresses[userInfo.ip];
		}
	}
	else if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(.*?)\skicked player '(.*?)'/)) {
		var date = matches[1],
			username = matches[3];
		this.emit('signoff', username, date);
		var userInfo = this.current_usernames[username];
		if(userInfo) {
			delete this.current_usernames[username];
			delete this.current_addresses[userInfo.ip];
		}
	}
	
	// chat match
	// 2011-04-07 21:21:08 [INFO] <¤4jfro¤f> test
	if(matches = line.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s<(.*?)>\s(.*)$/))
	{
		var date = matches[1],
			username = matches[2],
			message = matches[3];
		// filter out color codes from username
		username = username.replace(/\u00A7[\w\d]/g, '');
		this.emit('chat', date, username, message);
	}
}

module.exports = LogMonitor;
