var sys = require('sys');
var http = require('http');
var url = require('url');
var cp = require('child_process');
var fs = require('fs');

var conf_file = process.argv[2];
if (!conf_file){
	console.log("Must specify a config file: node smush.js config.js");
	return;
}
try {
	var config = require('./'+conf_file).config;
}catch(e){
	console.log(e.message);
	return;
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// this class just tails a log group
//

function logTailer(id, logs){

	var self = this;

	this.id = id;


	//
	// launch the log tailer
	//

	var args = ['-F', '-n0', '-q'];
	for (var i=0; i<logs.length; i++) args.push(logs[i]);

	this.proc = cp.spawn('tail', args);

	this.proc.stderr.on('data', function(data){
		console.log('ERROR '+data);
	});
	this.proc.stdout.on('data', function(data){

		self.buffer += data.toString('utf8');
		self.emit('data', data);
	});
	this.proc.on('exit', function(code){
		console.log('tailing process exited');
	});
}

sys.inherits(logTailer, process.EventEmitter);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

//
// creates multiple log tailers and feeds them to a server
//

function logClient(){

	var self = this;

	// some log tailers
	this.tailers = {};
	for (var i in config.read_logs){
	      	this.tailers[i] = new logTailer(i, config.read_logs[i]);
		this.tailers[i].on('data', function(buffer){
			self.feed_chunk(i, buffer);
		});
	};

	this.feed_chunk = function(name, buffer){

		sys.print('.');

		var svr = http.createClient(config.server_port, config.server_host);
		svr.on('error', function(e){
			console.log('error sending to client : '+e.message);
		});


		var request = svr.request('POST', '/'+name, {
			'host': config.server_host,
			'content-length' : buffer.length,
		});
		request.write(buffer);
		request.end();
		request.on('response', function(rsp){
			//console.log('got http rsp');
		});
	};

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

//
// handles writing a single log file
//

function logWriter(path){

	var self = this;

	this.path = path;
	this.abs = config.logs_dir + '/' + path;
	this.open = false;
	this.opening = false;
	this.fd = null;
	this.writebuffer = null;

	this.write = function(buffer){
		if (!buffer) return;
		if (self.open){
			self.write_buffer(buffer);
		}else{
			if (self.buffer){
				self.buffer += buffer;
			}else{
				self.buffer = buffer;
			}
			self.open_file();
		}
	};

	this.open_file = function(){
		if (self.opening) return;

		console.log(self.path+": opening log");

		self.opening = true;
		fs.open(self.abs, 'a', 0666, function(err, fd){
			self.opening = false;
			if (err){
				self.error("failed to open log : "+err);
			}else{
				self.open = true;
				self.fd = fd;
				self.opened();
			}
		});
	};

	this.opened = function(){
		if (self.buffer){
			self.write_buffer(self.buffer);
			self.buffer = null;
		}
	};

	this.write_buffer = function(buffer){

		var len = buffer.length;
		fs.write(self.fd, buffer, 0, len, null, function(err, written){
			if (err){
				self.error("failed to write log : "+err);
			}else{
				if (written < len){
					self.error("only wrote "+written+" of "+len+" bytes");
				}
			}

			if (self.closeTimer) clearTimeout(self.closeTimer);
			self.closeTimer = setTimeout(function(){ self.close(); }, config.close_files_after);
		});
	};

	this.close = function(){
		if (self.closeTimer) clearTimeout(self.closeTimer);
		self.closeTimer = null;

		console.log(self.path+": closing unused log");
		fs.close(self.fd);
		self.open = false;
	}

	this.error = function(msg){
		console.log(self.path+': '+msg);
		self.open = false;
		self.opening = false;
	};
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

//
// recieves log chunks as POSTs and writes them using logWriter()s
//

function logServer(){

	var self = this;

	this.writers = {};
	this.get_writer = function(path){

		if (!self.writers[path]){
			self.writers[path] = new logWriter(path);
		}

		return self.writers[path];
	}

	http.createServer(function (req, res){

		//
		// check it's a post
		//

		if (req.method != 'POST'){
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end("You need to POST log lines, silly");
			return;
		}


		//
		// get the log name
		//

		var _url = url.parse(req.url, true);
		var path = _url.pathname.substr(1);
		path = path.replace(/[^a-zA-Z0-9_.\-]/g, '');

		if (!path){
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end("No path found");
			return;
		}


		//
		// read in the post body
		//

		var buffer = null;

		req.on('data', function(chunk){
			if (buffer){
				buffer += chunk;
			}else{
				buffer = chunk;
			}
		});

		req.on('end', function(){

			if (buffer){

				var w = self.get_writer(path);
				w.write(buffer);

				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end("ok");

			}else{
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end("empty");
			}
		});

	}).listen(config.listen_port, config.listen_host);

	console.log("listening on "+config.listen_port);
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////


//
// the client tails logs and sends them to the server
//

if (config.server_host){
	console.log("Starting smush client...");
	var client = new logClient();
}


//
// the server recieves log lines as saves them to files
//

if (config.listen_port){
	console.log("Starting smush server...");
	var server = new logServer();
}
