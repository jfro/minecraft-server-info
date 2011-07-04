
require.paths.unshift(__dirname + '/node_modules');
var cluster = require('cluster');
var config	= require('./config');

var cluster = cluster('./app')
  .use(cluster.logger('logs'))
  .use(cluster.stats())
  .use(cluster.pidfiles('pids'))
  .use(cluster.cli())
  .use(cluster.repl(8888));

if(config.web.enabled) {
	console.log('Listening on ' + config.web.port);
	cluster.listen(config.web.port);
}
