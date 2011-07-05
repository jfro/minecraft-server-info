
require.paths.unshift(__dirname + '/node_modules');
var cluster = require('cluster');
var config	= require('./config');

var cluster = cluster('./app')
  .use(cluster.logger('logs'))
  .use(cluster.stats())
  .use(cluster.pidfiles('pids'))
  .use(cluster.cli())
  .use(cluster.repl(__dirname + '/repl.sock'));

if(config.workers)
	cluster.set('workers', config.workers)
if(config.user)
	cluster.set('user', config.user);
if(config.group)
	cluster.set('group', config.group);

if(config.web.enabled) {
	console.log('Listening on ' + config.web.port);
	cluster.listen(config.web.port);
}
