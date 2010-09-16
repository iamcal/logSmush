
exports.config = {

	//
	// host & port of the server to connect to.
	//

	server_host: 'localhost',
	server_port: 8765,


	//
	// for each different log (or set of logs) you want to tail,
	// add an item here. if the name is 'messages', then the URL
	// will be http://{host}:{port}/messages. specify multiple
	// files to tail them together
	//

	read_logs : {
		'messages'	: ['/var/log/messages'],
		'access'	: ['/var/log/httpd/access_log'],
		'combined'	: ['/var/log/httpd/access_log', '/var/log/httpd/error_log'],
	},


	//
	// how many lines should we buffer in memory to allow a slow
	// or disconnected server to catch up. this is per log group.
	//
	// NOTE: this is not implemented!
	//

	max_lines : 100,
};
