var express = require('express');

module.exports = {
	app: null,
	postReceiveRunning: false,
	
	start: function(status, port)
	{
		this.app = express.createServer();
		this.app.set('views', __dirname + '/views');
		
		this.app.get('/', function(req, res) {
			var User = status.db.model('User');
			User.find({}).sort([['last_connect_date', 'descending']]).all(function (users) {
				res.render('index.jade', {
					locals: {
						users: users,
						title: 'Jfro\'s Minecraft Server'
					}
				});
			});
		});
		
		this.app.listen(port);
		console.log('Web server listening on port '+port);
	},
	
	enablePostReceive: function(scriptPath) {
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
				});
			}
			else
			{
				console.log('script already running, ignoring request');
			}
		});
	}
}
