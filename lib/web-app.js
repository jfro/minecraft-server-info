var express = require('express'),
	events	= require('events'),
	sys		= require('sys');

function WebApp(status, config)
{
	this.config = config;
	this.status = status;
	this.app = null;
	this.postReceiveRunning = false;
	events.EventEmitter.call(this);
}

sys.inherits(WebApp, events.EventEmitter);

// starts listening
WebApp.prototype.start = function() {
	this.app = express.createServer();
	var app = this.app;
	
	// app.configure(function(){
	// 	app.use(express.methodOverride());
	// 	app.use(express.bodyParser());
	// 	app.use(this.app.router);
	// });

	app.configure('development', function(){
		app.use(express.static(__dirname + '/../public'));
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	app.configure('production', function(){
		var oneYear = 31557600000;
		app.use(express.static(__dirname + '/../public', { maxAge: oneYear }));
		app.use(express.errorHandler());
	});
	
	this.app.set('views', __dirname + '/../views');
	var self = this;
	this.app.get('/', function(req, res) {
		var User = self.status.db.model('User');
		User.find({}).sort('last_connect_date', -1).exec(function (err, users) {
			res.render('index.jade', {
				locals: {
					users: users,
					title: self.config.title
				}
			});
		});
	});
	
	if(this.config.postReceiveScript)
		this.enablePostReceive(this.config.postReceiveScript);
	
	this.app.listen(this.config.port);
	console.log('Web server listening on port '+this.config.port);
}

WebApp.prototype.stop = function () {
	this.app.close();
}

// enables /post-receive url to run specified shell script
WebApp.prototype.enablePostReceive = function(scriptPath) {
	var self = this;
	this.app.post('/post-receive', function(req, res) {
		console.log('received post-receive request');
		res.send('');
		if(!self.postReceiveRunning)
		{
			self.postReceiveRunning = true;
			var output = '';

			var sys   = require('sys'),
				spawn = require('child_process').spawn,
				update    = spawn('sh', [scriptPath]);

			update.stdout.on('data', function (data) {
				output += data;
				//sys.print('stdout: ' + data);
			});

			update.stderr.on('data', function (data) {
				output += data;
				//sys.print('stderr: ' + data);
			});

			update.on('exit', function (code) {
				if(code != 0)
				{
					console.log('Post receive script returned: ' + code);
					console.log('Script output: ' + output);
				}
				else
				{
					console.log('post receive script finished');
				}
				self.postReceiveRunning = false;
				self.emit('jsreloaded');
			});
		}
		else
		{
			console.log('script already running, ignoring request');
		}
	});
}


module.exports = WebApp;
