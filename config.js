// Minecraft Server Info Configuration
module.exports = {
	
	// path to minecraft_server.jar's folder
	serverPath: '../server',
	
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
		nick: 'jfrobot_dev',
		server: 'irc.freenode.net',
		channels: ['#minecraft_test'],
		// forwarding settings
		forward_chat: true,
		screen_name: 'minecraft_server' // screen name to forward irc to minecraft server, false or null to disable
	},
	
	// web server to provide simple information
	web: {
		enabled: true,
		port: 3001,
		title: 'Untitled Minecraft Server',
		// script that runs when a url is hit, /post-receive
		postReceiveScript: false //__dirname + '/update-js.sh'
	}
};
