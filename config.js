// Minecraft Server Info Configuration
module.exports = {
	
	// path to minecraft_server.jar's folder
	serverPath: '/Users/jerome/Minecraft/server',
	
	// where the user status will be saved
	database: {
		host: 'localhost',
		dbname: 'minecraft'
	},
	// dataFile: './users.json',
	
	// irc info, will announce people connecting/disconnecting
	irc: {
		enabled: true,
		nick: 'jfrobot_dev',
		server: 'irc.freenode.net',
		channels: ['#grminecraft']
	},
	
	// web server to provide simple information
	web: {
		enabled: true,
		port: 3001
	}
};
