logSmush
========

Aggregate logs over HTTP, using node.


Configuration
-------------

Install <a href="http://nodejs.org/">node</a>.

On the machine(s) producing logs, run:

	node smush.js config.client.example.js

And on the machine aggregating logs, run:

	node smush.js config.server.example.js

Modify the configs for your unique setup.


How it works
------------

The client tails multiple logs and performs HTTP POSTs to the server.
Each post uses the log group name (e.g. <code>messages</code> in the example config)
as the URL (e.g. <code>http://localhost:8765/messages</code>) and includes the latest 
block or log data as the POST body. The server then appends this to a local file.


Notes
-----

* If the client can't reach the server, it will throw an exception and halt. It should
  instead buffer log content and try and reconnect.
* Message group names may only contain alphanumerics, dots, dashses and underscores.
  This is by design.
