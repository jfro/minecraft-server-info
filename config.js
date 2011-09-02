// Minecraft Server Info Configuration
module.exports = {
	
	// path to minecraft_server.jar's folder, to find server.log
	serverPath: '/home/minecraft',
	
	// number of workers to spawn, default is number of CPUs
	// TODO: support > 1, if you set this higher it'll connect that many IRC bots
	workers: 1,
	
	// monitors server.log for user joins/disconnects
	// disable if using UserStats bukkit plugin
	userMonitor: {
		enabled: true,
	},
	
	// set who to run as if desired
	// uncomment if you're running this from upstart or similar and need to have it change user/group
	// user: 'www-data',
	// group: 'www-data',
	
	// whether to monitor the server process, looks for 'java' and 'minecraft' in process name & args
	// this alerts IRC currently of the server status
	serverMonitor: {
		enabled: true,
		interval: 30 // seconds
	},
	
	// MongoDB server where the user status will be saved
	database: {
		host: 'localhost',
		dbname: 'minecraft'
	},
	
	// irc info, will announce people connecting/disconnecting and server online/offline if enabled above
	irc: {
		enabled: true,
		nick: 'jfrobot_dev',
		server: 'irc.freenode.net',
		channels: ['#minecraft_test'],
		// forwarding settings
		forward_chat: false,
		screen_name: 'minecraft_server' // screen name to forward irc to minecraft server
	},
	
	// web server to provide simple information
	web: {
		enabled: true,
		port: 3001,
		title: 'Untitled Minecraft Server',
		googleAnalyticsID: '',
		// base map url where a Minecraft-Overviewer is stored (edit views/map.jade to handle others)
		baseMapURL: '', // ie 'http://example.com/map-' will become http://example.com/map-worldname
		news: {
			enabled: false,
			rss: '',
			frontPageMaxItems: 3
		},
	}
};
