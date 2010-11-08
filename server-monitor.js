var exec	= require('child_process').exec,
	events	= require('events'),
	sys		= require('sys');

function ServerMonitor(interval)
{
	this.processCheckCommand = "ps -ewwo pid,args | grep -i java | grep -i minecraft | grep -v grep";
	this.running = false;
	this.checking = false;
	this.timer = null;
	this.repeatInterval = interval;
	
	events.EventEmitter.call(this);
}

sys.inherits(ServerMonitor, events.EventEmitter);

ServerMonitor.prototype.stopMonitoring = function ()
{
	clearInterval(this.timer);
	this.timer = null;
}
ServerMonitor.prototype.startMonitoring = function ()
{
	if(!this.timer) {
		console.log('Server check timer started');
		this.timer = setInterval(this.timerFired, this.repeatInterval);
		this.timer.context = this;
	}
}

ServerMonitor.prototype.timerFired = function ()
{
	var self = this.context;
	self.checkProcess();
}

ServerMonitor.prototype.checkProcess = function ()
{
	var self = this;
	if(self.checking || !self.processCheckCommand)
	{
		console.log('WARNING: already checking process, skipping');
		return;
	}
	var psCheck = exec(self.processCheckCommand, function (error, stdout, stderr) {
		self.checking = true;
		if(error !== null)
		{
			console.log('exec error: ' + sys.inspect(error));
			if(self.running == true)
			{
				self.running = false;
				self.emit('offline');
				console.log('Exec error, we must be offline');
				self.checking = false;
			}
		}
	});
	psCheck.current_line = "";
	psCheck.on('newline', function(line) {
		var matches = null;
		if(matches = line.match(/(\d+)(.*?)/))
		{
			if(self.running == false)
			{
				self.running = true;
				self.emit('online');
				console.log('emitted online event');
			}
		}
		else
		{
			if(self.running == true)
			{
				self.running = false;
				self.emit('offline');
				console.log('emitted offline event');
			}
		}
	});

	psCheck.stdout.on('data', function (data) {
		data = data.toString();
		for(var i = 0; i < data.length; i++)
		{
			if(data[i] == "\n")
			{
				psCheck.emit('newline', psCheck.current_line);
				psCheck.current_line = "";
			}
			else
    		{
				psCheck.current_line += data[i];
			}
		}
	});

	psCheck.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
	});

	psCheck.on('exit', function (code) {
		self.checking = false;
		console.log('Check done');
	});
}

module.exports = ServerMonitor;
