const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const FFT_JS = require('fft.js');
const WavEncoder = require("wav-encoder");
const WebSocket = require('ws');
const port = process.argv[2] || 80;



const BUFFER_SIZE = 512;
const SAMPLE_RATE = 44100/8;
const fft = new FFT_JS(BUFFER_SIZE);

const halfStep = Math.pow(2, (1.0/12.0));
const quarterStep = Math.sqrt(halfStep);
const TONE_MAP = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
var TONES = [];

const extMap = {
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



function init() {
	initServer();
	initTones();
	initAudioInSocket();
	initVisualOutSocket();
	loadSettings();
}

















function handlePost(request, response, body) {
	var args = JSON.parse(body);

	console.log(args);
	        	
	if(args.cmd == "changeSettings") {
		getSettings(args.name, function(settings) {
			var changes = args.changes;

			for(var key in changes) 
				settings[key] = changes[key];
			
			setSettings(args.name, settings);
		})


	}
	else if(args.cmd == "trackList") {
		var data = ["Dad_Sonata_no_1.wav", "Thumbz-Diplomacy.wav"];
		var ext = extMap[".wav"];
		defaultResponse(response, JSON.stringify(data), ext);
	}
}



const AVG_PAST_VS_NEW_WEIGHT = 10;
var noteMaxAvg = 1;
function analyzeAudio(signal) {
	
	var output = fft.createComplexArray();
	fft.realTransform(output, signal);

	var impulses = [];

	var normalize = 0;

	for(var i = 1; (i*2)+1 < output.length; i++) {
		var real = output[i*2];
		var imag = output[(i*2)+1];

		var magnitude = Math.sqrt((real*real) + (imag*imag));

		normalize = Math.max(normalize, magnitude);
		//1.0  ::  ~300
		//0.5  ::  ~150
		//0.25 ::  ~100
		//rec  ::  max 150, avg 1

		// console.log(magnitude);
		if(magnitude > 0) {
			var addMe = {};
			addMe.mag = magnitude;
			addMe.freq = (i * SAMPLE_RATE/2)/(BUFFER_SIZE/2);
			impulses.push(addMe);
		}
	}

	console.log(normalize);

	// var current = {};
	var noteMags = new Float32Array(12);
	var noteMax = 0;

	// console.log(impulses);
	var t = 0;
	for(var i = 0; t < TONES.length && i < impulses.length; i++) {
		var impulse = impulses[i];
		while(t < TONES.length) {
			var interval = TONES[t]/impulse.freq;

			if(interval < (1/quarterStep)) 
				t++;
			
			else {
				if(interval < quarterStep) {
					noteMags[t%12] += (impulse.mag/normalize);
					noteMax = Math.max(noteMax, noteMags[t%12]);
				}

				break;
			}
		}
	}

	// console.log(noteMags);
	// console.log(noteMax);
	//avg note max, weighted 3/4 towards old, and 1/4 towrads new
	noteMaxAvg *= (AVG_PAST_VS_NEW_WEIGHT-1)/AVG_PAST_VS_NEW_WEIGHT;
	noteMaxAvg += noteMax/AVG_PAST_VS_NEW_WEIGHT;

	console.log(noteMaxAvg);

	var sendMe = new Uint8Array(12);
	for(var i = 0; i < noteMags.length; i++){
		var ratio = noteMags[i]/noteMaxAvg;
		sendMe[i] = Math.min(Math.max(ratio*255.0, 0), 255);
	}
	

	for(var i in visualListeners) {
		var listener = visualListeners[i];

		
		try { listener.send(sendMe); }

		catch(e) {
			listener.terminate();
			visualListeners.splice(i, 1);
			i--;
		}

		
	}

}

















/***************************************
*
*				INITS
*
****************************************/



/*****************************
*			SERVER
*****************************/
function initServer() {
	http.createServer(function (request, response) {
		console.log(`${request.method} ${request.url}`);
		

		const parsedUrl = url.parse(request.url);
		// extract URL path
		let pathname = "."+parsedUrl.pathname;

		var ext = path.parse(pathname).ext;
		// maps file extention to MIME typere
		
		

	    if (request.method == 'POST') {

	        var bodyBuffers = [];
	        var totalBufferSize = 0;

	        request.on('data', function (data) {

	            bodyBuffers.push(data);
	            totalBufferSize += data.length;

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

	        	handlePost(request, response, body);
	        });
	    }
	    else if (request.method == 'GET'){
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
				    	defaultResponse(response, data, extMap[ext]);
				    }
			    });
			});
	    }
	    else {
	    	console.log("File not found ",request.url)
	    	defaultResponse(response, "Hello World");
	    }

	}).listen(port);
}



	
/*****************************
*			Tones
*****************************/
function initTones() {
	var A1 = 55.0;
	//&& tone < BUFFER_SIZE/2  somehow not helpful
	for(var tone = A1; tone < SAMPLE_RATE/2; tone *= halfStep)
		TONES.push(tone);

	console.log(TONES);
}



/*****************************
*			FFT 
*****************************/
function initAudioInSocket() {
	var buffers = [];
	var totalBufferSize = 0;

	const audioIn =  new WebSocket.Server({ port: 4321 });
	audioIn.on('connection', function connection(ws) {
	  	ws.on('message', function incoming(message) {
	  		
	  		var addMe = new Float32Array(message.length);
	  		

	  		for(var i = 0; i < message.length; i++) {
	  			addMe[i] = ((message[i]*3/255.0)-1.5)/1.5;
	  		}

	  		buffers.push(addMe);
	  		totalBufferSize += addMe.length;


	  		if(totalBufferSize >= BUFFER_SIZE) {
	  			var signal = new Float32Array(BUFFER_SIZE);

	  			var offset = 0;

	  			var leftOverBuffers = []
	  			var leftOverSize = 0;

	  			var lastValHack = 0;

	    		
		    	for(var i = 0; i < buffers.length; i++) {
		    		if(offset < signal.length) {
		    			var buffer = buffers[i];
		    			if(offset + buffer.length < signal.length) {
		    				signal.set(buffer, offset);
		    				offset += buffer.length;
		    			}
		    			else {
		    				var b = 0;
							for(; offset + b < signal.length && b < buffer.length; b++){
								var byte = buffer[b];
								if(Math.abs(byte) > 2)
									byte = lastValHack;
									
								lastValHack = signal[offset + b] = byte;
								// byte = Math.max(Math.min(byte, 1), -1);
			    				
							}

			    			offset += b;

			    			if(offset >= signal.length && b < buffer.length) {
			    				var addMe = new Float32Array(buffers[i].length - b);
			    				for(var s = 0; s < addMe.length; s++) 
			    					addMe[s] = buffer[b+s];

			    				leftOverBuffers.push(addMe);
			    				leftOverSize += addMe.length;
			    				break;
			    			}
		    			}
						
					}
					else {
						leftOverBuffers.push(buffer);
						leftOverSize += buffer.length;
					}
				}

				
	    		

	    		buffers = leftOverBuffers;
	    		totalBufferSize = leftOverSize;


	    		analyzeAudio(signal);


	  		}
		  	

	  	});

	  	ws.send('something');
	});
}









/*****************************
*			Visualizer
*****************************/
var visualListeners = [];
function initVisualOutSocket() {
	var visualsOut = new WebSocket.Server({ port: 4444 });
	visualsOut.on('connection', function connection(ws) {
		visualListeners.push(ws);
	});	
}





/*****************************
*		Load Settings
*****************************/
function loadSettings() {
	getSettings("main", function(settings) {
		setPattern(settings.pattern);
	});
}









SETTINGS = {};
SETTINGS.fns = {};
SETTINGS.fns.on = function(isOn) {
	if(isOn == false)
		setLights("off");

	SETTINGS.on = isOn;
}



LIGHTS = {};
LIGHTS.upSmooth = 0.2;
LIGHTS.downSmooth = 0.01;
LIGHTS.values = [];

function setLights(states) {
	for(var i = 0; i < LIGHTS.values; i++) {
		if(states == "off") 
			LIGHTS.values[i] = 0;
		
		else {
			var newVal = states[i];
			var oldVal = LIGHTS.values[i];
			if(oldVal > newVal)
				LIGHTS.values[i] = Math.max(newVal, oldVal-LIGHTS.downSmooth)

			else if(LIGHTS.values[i] < val)
				LIGHTS.values[i] = Math.max(newVal, oldVal-LIGHTS.downSmooth)			 
		}
	}
	
}






function defaultHeader(response, contentType) {
	contentType = contentType || 'text/plain';
	response.writeHead(200, {
		'Content-Type': contentType,
		"Access-Control-Allow-Origin" : "*",
		'Access-Control-Allow-Methods' : 'GET,PUT,POST,DELETE,OPTIONS',
		'Access-Control-Allow-Headers' : 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
	});
}



function defaultResponse(response, data, contentType) {
	defaultHeader(response, contentType);
	response.end(data);
}




function getSettings(name, thenFn) {
	fs.readFile("settings/"+name+".json", function(err, data){
		var settings = JSON.parse(data);
		thenFn(settings);
	});
}

function setSettings(name, newVal) {
	fs.writeFileSync("settings/"+name+".json", JSON.stringify(newVal));
}








function setPattern(name) {
	var newPattern = PATTERNS[name];

	if(newPattern) {
		getSettings("main", function(settings) {
			if(settings.pattern != name) {
				settings.pattern = name;
				setSettings(settings);

				newPattern();
			}
		});
	}
}




PATTERNS = {};
PATTERNS.solid = function() {

}


















init();





