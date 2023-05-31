/*

#!/bin/node


 (function () {

 	const http = require("http");
 	const fs = require("fs");

 	const host = "localhost";
	const port = 8000;


	const requestListener = function(req, res) {

		const headers = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "OPTIONS, POST, GET",
			"Access-Control-Max-Age": 2592000, // 30 days
		};

		if (req.method === "OPTIONS") {
			console.log("diocane..?")
			res.writeHead(204, headers);
			res.end();
			return;
		}

		fs.readFile(__dirname + req.url, (err, data) => {
		    if (err) {
				res.writeHead(404, { 'Content-Type': 'text/html' });
				res.end('404: File not found');
		    } else {
		    	if (["GET", "POST"].indexOf(req.method) > -1) {
		    		console.log("diocane, headers:", headers)
					res.writeHead(200, headers);
					res.end(data);
					return;
				}


				//res.writeHead(200, headers);
				//res.end(data);
		    }
		});
	}

	const server = http.createServer(requestListener);

	server.listen(port, host, () => {
		console.log(`Server is running on http://${host}:${port}`);
	});


 }())

*/