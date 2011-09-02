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
	this.app.use(express.bodyParser());
	
	var self = this;
	
	// home page
	this.app.get('/', function(req, res) {
		res.render('index.jade', {
			locals: {
				config: self.config
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
				config: self.config
			});
		});
	});
	
	// commands help page
	this.app.get('/commands', function(req, res) {
		res.render('commands.jade', {
			config: self.config
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
				config: self.config,
				rssURL: self.config.news.rss
			});
		});
	});
	
	// map page
	this.app.get('/world/:world/map', function(req, res) {
		res.render('map', {
			config: self.config,
			world: req.params.world
		});
	});
	
	// this.app.listen(this.config.port);
	// console.log('Web server listening on port '+this.config.port);
	return this.app;
}

WebApp.prototype.stop = function () {
	this.app.close();
}

module.exports = WebApp;
