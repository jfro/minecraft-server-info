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
WebApp.prototype.createWebApp = function() {
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
	this.app.set('view engine', 'jade');
	
	var self = this;
	
	// home page
	this.app.get('/', function(req, res) {
		res.render('index.jade', {
			locals: {
				title: self.config.title
			}
		});
	});
	
	// user online list
	this.app.get('/users/online', function(req, res) {
		var ajax = req.isXMLHttpRequest;
		var User = self.status.db.model('User');
		var template = (ajax ? 'userlist.jade' : 'users');
		User.find({}).sort('last_connect_date', -1).exec(function (err, users) {
			res.render(template, {
				users: (ajax ? users.slice(0, 10) : users),
				layout: !ajax,
				title: self.config.title
			});
		});
	});
	
	// commands help page
	this.app.get('/commands', function(req, res) {
		res.render('commands.jade', {
			title: self.config.title
		});
	});
	
	// news page
	this.app.get('/news', function(req, res) {
		var   rss = require('easyrss')
		, inspect = require('util').inspect;
		var ajax = req.isXMLHttpRequest;
		rss.parseURL(self.config.news.rss, function(posts) {
			res.render('news.jade', {
				news: (ajax ? posts.slice(0, self.config.news.frontPageMaxItems) : posts),
				layout: !ajax,
				title: self.config.title,
				rssURL: self.config.news.rss
			});
		});

	});
	
	if(this.config.postReceiveScript)
		this.enablePostReceive(this.config.postReceiveScript);
	
	// this.app.listen(this.config.port);
	// console.log('Web server listening on port '+this.config.port);
	return this.app;
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
