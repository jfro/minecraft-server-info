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
				self.process_newline(self.current_line);
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

LogMonitor.prototype.process_newline = function (line)
{
	//console.log(line);
	var matches = null;
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\s\[(.*)\]\slogged in/))
	{
		var date = matches[1],
			username = matches[2];
		this.emit('signon', username, date);
	}
	if(matches = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s\[INFO\]\s(\w+)\slost connection/))
	{
		var date = matches[1],
			username = matches[2];
		this.emit('signoff', username, date);
	}
}

module.exports = LogMonitor;
