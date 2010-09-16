
exports.config = {

	//
	// host & port for the log server to listen on.
	// leaving the host blank will work for most setups.
	//

	listen_host: null,
	listen_port: 8765,


	//
	// the dirtectory into which logs will be written.
	// names are determined by the clients.
	//

	logs_dir : './logs',


	//
	// how long (in ms) to keep a file open while not writing to
	// it. unless you have a good reason to change it, 60s is fine.
	//

	close_files_after : 60 * 1000,
};
