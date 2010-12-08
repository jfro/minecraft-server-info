// Minecraft Server Info Configuration
module.exports = {
	
	// path to minecraft_server.jar's folder
	serverPath: '/home/jerome/minecraft/server/',
	
	// whether to monitor the server process, looks for 'java' and 'minecraft' in process name & args
	serverMonitor: {
		enabled: true,
		interval: 30 // seconds
	},
	
	// MongoDB server where the user status will be saved
	database: {
		host: 'localhost',
		dbname: 'minecraft'
	},
	// dataFile: './users.json',
	
	// irc info, will announce people connecting/disconnecting and server online/offline if enabled above
	irc: {
		enabled: true,
		nick: 'jfrobot',
		server: 'irc.freenode.net',
		channels: ['#grminecraft']
	},
	
	// web server to provide simple information
	web: {
		enabled: true,
		port: 3001,
		title: 'Jfro\'s Minecraft Server',
		postReceiveScript: __dirname + '/update-js.sh'
	}
};
