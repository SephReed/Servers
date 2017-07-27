const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const port = process.argv[2] || 8528;


eval(fs.readFileSync('lz-string.js')+'');
eval(fs.readFileSync('UTF-Helper.js')+'');



var PKGS = {
	"FLAT.Worlds" : "../../Web/SephReed.github.io/FlatStory/appPkg"
}




http.createServer(function (request, response) {
	

	//REMOVING THIS LINE GIVES HACKERS ROOT ACCESS
	// request.url = removeAnyLeadingSlashes(request.url)

	// parse URL
	const parsedUrl = url.parse(request.url);
	// extract URL path
	let pathname = "."+convertToNormalString(parsedUrl.pathname);
	pathname = pathname.replace(/^(\.)+/, '.');
	// let pathname = `.${parsedUrl.pathname}`;
	// based on the URL path, extract the file extention. e.g. .js, .doc, ...
	var ext = path.parse(pathname).ext;
	// maps file extention to MIME typere
	const map = {
	    '.ico': 'image/x-icon',
	    '.html': 'text/html',
	    '.js': 'text/javascript',
	    '.json': 'application/json',
	    '.css': 'text/css',
	    '.txt': 'text/css',
	    '.png': 'image/png',
	    '.jpg': 'image/jpeg',
	    '.wav': 'audio/wav',
	    '.mp3': 'audio/mpeg',
	    '.svg': 'image/svg+xml',
	    '.pdf': 'application/pdf',
	    '.doc': 'application/msword'
	};

	

	
	var pkgMatch = pathname.match(/\.\/[^\///]+/);
	var pkgName = pkgMatch ? pkgMatch[0].slice(2) : "";
	pkgName = convertToNormalString(pkgName);

	if(PKGS[pkgName] !== undefined) {
		pathname = PKGS[pkgName] + pathname.replace(pkgMatch, '');
	}

	
	

    if (request.method == 'POST') {

        var bodyBuffers = [];
        var totalBufferSize = 0;

        var pkgPath = request.url.match(/[^\\/]+/);
		pkgPath = pkgPath ? pkgPath[0] : "";
		pkgPath = convertToNormalString(pkgPath);

        request.on('data', function (data) {

            bodyBuffers.push(data);
            totalBufferSize += data.length;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (totalBufferSize > 1e7) {
            	console.log("POSTED data too large!")
                request.connection.destroy();
            }
        });

        request.on('end', function () {

        	var body;
        	if(bodyBuffers.length) {
        		body = Buffer.allocUnsafe(totalBufferSize);
        		var offset = 0;
        		for(var i = 0; i < bodyBuffers.length; i++) {
        			bodyBuffers[i].copy(body, offset);
        			offset += bodyBuffers[i].length;
        		}
        	} 
        	handlePOST(request, response, body, pathname);
        });
    }
    else if (request.method == 'GET'){
    	console.log(`${request.method} ${request.url}`);

    	fs.exists(pathname, function (exist) {
		    if(!exist) {
		      // if the file is not found, return 404
		      	response.statusCode = 404;
		        response.end(`File ${pathname} not found!`);
		      	return;
		    }

		    // if is a directory search for index file matching the extention
		    if (fs.statSync(pathname).isDirectory()) {
				pathname += '/index.html';
				ext = ".html";
		    }

		    // read file from file system
		    fs.readFile(pathname, function(err, data){
			    if(err){
			        response.statusCode = 500;
			        response.end(`Error getting the file: ${err}.`);
			    } else {
			    	defaultResponse(response, data);
			        // // if the file is found, set Content-type and send data
			        // response.setHeader('Content-type', map[ext] || 'text/plain' );
			        // response.end(data);
			    }
		    });
		});
    }
    else {
    	defaultResponse(response, "Hello World");
    }

}).listen(port);

console.log('Server started');



function doubleStatement(response, statement) {
	console.log(statement);
	defaultResponse(response, statement);
}

function defaultHeader(response, contentType) {
	contentType = contentType || 'text/plain';
	response.writeHead(200, {
		'Content-Type': contentType,
		"Access-Control-Allow-Origin" : "*",
		'Access-Control-Allow-Methods' : 'GET,PUT,POST,DELETE,OPTIONS',
		'Access-Control-Allow-Headers' : 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
	});


// 	// Website you wish to allow to connect
// response.setHeader('Access-Control-Allow-Origin', '*');

// // Request methods you wish to allow
// response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

// // Request headers you wish to allow
// response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

// // Set to true if you need the website to include cookies in the requests sent
// // to the API (e.g. in case you use sessions)
// response.setHeader('Access-Control-Allow-Credentials', true);
}



function defaultResponse(response, data) {
	defaultHeader(response);
	response.end(data);
}

function defaultJSONResponse(response, data) {
	defaultResponse(response, JSON.stringify(data));
}



function removeAnyLeadingSlashes(string) {
	return string.replace(/^([\\\/\.]|%20)+/, "");
}


function convertToNormalString(string) {
	return string.replace(/%20/g, " ");	
}
norm = convertToNormalString;


function getUrlArgs(url) {
	var argsText = url.match(/\?.*/g);

	argsText = argsText ? argsText[0] : undefined;

	if(argsText == undefined)
		return {};

	else {
		argsText = argsText.slice(1);
		var args = argsText.split('&');

		var out = {};
		for(var i = 0; args && i < args.length; i++) {
			var pieces = args[i].split('=');
			out[norm(pieces[0])] = norm(pieces[1]);
		}

		return out;
	}

}









function handlePOST(request, response, body, pathname) {

	var args = getUrlArgs(request.url);
	var cmd = args.cmd;

	console.log(`${cmd} ${pathname}`);

    if (cmd == "poke") {
        var out = {};
        
		out.exists = fs.existsSync(pathname);
		if(out.exists) 
			out.isDir = fs.lstatSync(pathname).isDirectory();    

        defaultJSONResponse(response, out);
    }

    else if(cmd == "get") {
        defaultHeader(response);

        var filestream = fs.createReadStream(pathname);
		filestream.pipe(response);
    }

    else if(cmd == "ls") { 
        var out = []

        var requestedData = JSON.parse(body);
        var returnHiddenFiles = false;

		fs.readdirSync(pathname).forEach(file => {
		  	
			if(file.startsWith('.') == false || returnHiddenFiles) {
					//
			  	var addMe = {};
			  	addMe.name = file;

			  	var thisItemFilePath = pathname;
			  	if(pathname.length && pathname.endsWith('/') == false)
			  		thisItemFilePath += "/";
			  	thisItemFilePath += file;

			  	var stats = fs.lstatSync(thisItemFilePath);
			  	
			  	addMe.isDir = stats.isDirectory(); 

			  	if(requestedData && "size" in requestedData) 
			  		addMe.size = stats.size;

			  	out.push(addMe);
			}
		})
        
        defaultJSONResponse(response, out);
    }

    else if(cmd == "put") {

    	fs.writeFileSync(pathname, body, {flag: args.writeType || "w"});
    	defaultJSONResponse(response, "success");
    	// var dataType = args.dataType;

   //  	if(dataType == "png"){
   //  		// var decompressed = LZString.decompressFromUTF16(UTF.U8to16(args.data)); 
   // //  		fs.writeFileSync(pathname, decompressed, {
   // //  			encoding: 'base64'
			// // });


   //  		defaultResponse(response, "success");
   //  	}

   //  	else {
   //  		// fs.writeFileSync(pathname, body, {flag: args.writeType || "w"});
   //  		// defaultResponse(response, "success");
   //  	}


    }

    else {
		doubleStatement(response, "cmd '"+cmd+"' not recognized");
    }
	// body...
}











