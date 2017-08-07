const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const FFT_JS = require('fft.js');
const WavEncoder = require("wav-encoder");
const WebSocket = require('ws');
var piblaster = require('pi-blaster.js');
const port = process.argv[2] || 80;


//all [17,18,16,19,13,20,12,21,6,22,5,23,4,24,25,26,27]
//banned [6,]
//non banned [17,18,16,19,13,20,12,21,22,5,23,4,24,25,26,27]

const GPIOS = [17,18,16,19,13,20,12,21,22,5,23,4,24,25,26,27].splice(0,12);
console.log(GPIOS);

for(var i in GPIOS) {
	piblaster.setPwm(GPIOS[i], 1);
}





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
	initSettings();
}










SETTINGS = {};
SETTINGS.set = function(name, key, value) {
	var current = SETTINGS[name];

	var fn = current.fns[key];
	if(fn) fn(value);
	else current[key] = value;
}


SETTINGS.main = {};
SETTINGS.main.fns = {}
SETTINGS.main.fns.on = function(isOn) {
	console.log("ON OFF", isOn);

	if(isOn == false) {
		SETTINGS.main.fns.pattern("off");
		SETTINGS.main.on = isOn;
	}

	else {
		SETTINGS.main.on = isOn;
		SETTINGS.main.fns.pattern(SETTINGS.main.pattern || "solid");
	}
}

SETTINGS.main.fns.brightness = function(bright) {
	SETTINGS.main.brightness = bright;
	LIGHTS.update();
}


SETTINGS.audio = {};
SETTINGS.main.fns.audioFadeIn = function(time) {
	SETTINGS.audio.upSmooth = LIGHTS.upSmooth = 1/(time*24);
	console.log(LIGHTS.upSmooth);
}
SETTINGS.main.fns.audioFadeOut = function(time) {
	SETTINGS.audio.downSmooth = LIGHTS.downSmooth = 1/(time*24);
	console.log(LIGHTS.downSmooth);
}
SETTINGS.main.fns.audioBase = function(base) {
	SETTINGS.audio.base = base;
}


SETTINGS.main.fns.pattern = function(patName) {

	LIGHTS.upSmooth = 0.2;
	LIGHTS.downSmooth = 0.03;

	if(PATTERNS.currentTimeout) {
		clearTimeout(PATTERNS.currentTimeout);
		PATTERNS.currentTimeout = undefined;
	}


	var pattern = PATTERNS[patName];
	if(pattern) {
		console.log(patName);
		var settings = SETTINGS[patName]
		if(settings) {
			if(settings.downSmooth)
				LIGHTS.downSmooth = settings.downSmooth;

			if(settings.upSmooth)
				LIGHTS.upSmooth = settings.upSmooth;
		}

		pattern.draw();
	}

	if(patName != "off")
		SETTINGS.main.pattern = patName;	
}







SETTINGS.cycle = {};
SETTINGS.cycle.fns = {};
SETTINGS.cycle.fns.speed = function(speed) {
	SETTINGS.cycle.speed = ~~(speed/12*1000);
	console.log(SETTINGS.cycle.speed);
}
SETTINGS.cycle.fns.fade = function(fade) {
	// SETTINGS.cycle.fade = ~~(fade*1000);
	SETTINGS.cycle.downSmooth = LIGHTS.downSmooth = 1/(fade*24);
	console.log(LIGHTS.downSmooth );
}







SETTINGS.chaos = {};
SETTINGS.chaos.fns = {};
SETTINGS.chaos.fns.speed = function(speed) {
	SETTINGS.chaos.speed = ~~(speed*1000);
	console.log(SETTINGS.chaos.speed);
}
SETTINGS.chaos.fns.fadeOut = function(fade) {
	SETTINGS.chaos.downSmooth = LIGHTS.downSmooth = 1/(fade*24);
}
SETTINGS.chaos.fns.fadeIn = function(fade) {
	SETTINGS.chaos.upSmooth = LIGHTS.upSmooth = 1/(fade*24);
}









PATTERNS = {};
PATTERNS.solid = {};
PATTERNS.solid.draw = function() {
	console.log("on");
	LIGHTS.setAllValues("on");
}


PATTERNS.off = {};
PATTERNS.off.draw = function() {
	LIGHTS.setAllValues("off");
}





PATTERNS.cycle = {};
PATTERNS.cycle.lastStep = 0;
PATTERNS.cycle.draw = function() {
	var step = PATTERNS.cycle.lastStep;
	LIGHTS.setValue(step, 0);

	step++;
	step %= 12;
	LIGHTS.setValue(step, 1);
	PATTERNS.cycle.lastStep = step;

	PATTERNS.currentTimeout = setTimeout(PATTERNS.cycle.draw, SETTINGS.cycle.speed || 750);
}



PATTERNS.chaos = {};
PATTERNS.chaos.lastStep = 0;
PATTERNS.chaos.draw = function() {
	var step = PATTERNS.chaos.lastStep;
	LIGHTS.setValue(step, SETTINGS.chaos.base || 0);

	step = ~~(Math.random()*12);
	LIGHTS.setValue(step, 1);
	PATTERNS.chaos.lastStep = step;

	PATTERNS.currentTimeout = setTimeout(PATTERNS.chaos.draw, SETTINGS.chaos.speed || 750);
}













LIGHTS = {};

LIGHTS.length = 12;

LIGHTS.upSmooth = 0.2;
LIGHTS.downSmooth = 0.03;

LIGHTS.dMs = 42;
LIGHTS.updateHold = false;

LIGHTS.values = {};
LIGHTS.values.current = [];
LIGHTS.values.target = [];

for(var i = 0; i < LIGHTS.length; i++) {
	LIGHTS.values.current[i] = LIGHTS.values.target[i] = 0;
}


LIGHTS.setValue = function(lightNum, value) {
	if(SETTINGS.main.on == false) return;

	LIGHTS.values.target[lightNum] = value;
	LIGHTS.update();
}

LIGHTS.setAllValues = function(states) {
	if(SETTINGS.main.on == false) return;

	for(var i = 0; i < LIGHTS.values.target.length; i++) {
		if(states == "off") 
			LIGHTS.values.target[i] = 0;

		else if(states == "on") 
			LIGHTS.values.target[i] = 1;
		
		else
			LIGHTS.values.target[i] = states[i];
	}
	// console.log("setting", LIGHTS.values.target);
	LIGHTS.update();
}

// LIGHTS.off = function() {

// }

// LIGHTS.on = function() {
	
// }


LIGHTS.update = function() {
	if(LIGHTS.currentInterval) return;

	else 
		LIGHTS.currentInterval = setInterval(LIGHTS.updateCycle, LIGHTS.dMs);
}

LIGHTS.updateCycle = function() {
	var didChange = false;

	for(var i = 0; i < LIGHTS.values.target.length; i++) {
		var target = LIGHTS.values.target[i];
		var current = LIGHTS.values.current[i];

		// console.log(LIGHTS.upSmooth, LIGHTS.downSmooth);

		if(current > target){
			didChange = true;
			LIGHTS.values.current[i] = Math.max(target, current-LIGHTS.downSmooth);
		}

		else if(current < target){
			didChange = true;
			LIGHTS.values.current[i] = Math.min(target, current+LIGHTS.upSmooth);
		}

	}

	LIGHTS.syncListeners();
	LIGHTS.syncGPIO();

	if(didChange == false) {
		clearInterval(LIGHTS.currentInterval);
		LIGHTS.currentInterval = undefined;
	}
}


LIGHTS.syncListeners = function() {
	var sendMe = new Uint8Array(12);
	for(var i = 0; i < LIGHTS.values.current.length; i++){
		var value = LIGHTS.values.current[i];
		value *= SETTINGS.main.brightness;
		sendMe[i] = Math.min(Math.max(value*255.0, 0), 255);
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


LIGHTS.syncGPIO = function() {
	var vals = LIGHTS.values.current;
	for(var i in vals) {
		var val = Math.min(Math.max(vals[i], 0), 1);
		piblaster.setPwm(GPIOS[i], val);	
	}
}


/*****************************
*			POST
*****************************/

function handlePost(request, response, body) {
	var args = JSON.parse(body);

	console.log(args);
	        	
	if(args.cmd == "changeSettings") {
		loadSettings(args.name, function(modMe) {
			var changes = args.changes;

			for(var key in changes) {
				var value = changes[key];
				if(value != modMe[key]) {
					SETTINGS.set(args.name, key, value)

					modMe[key] = value;
				}
			}
			
			saveSettings(args.name, modMe);
		})

		defaultResponse(response, "OK");
	}
	else if(args.cmd == "trackList") {	
		var out = []

		fs.readdirSync("wavs").forEach(file => {
			if(file.endsWith('.wav')) {
			 	out.push(file);
			}
		})
        
        defaultResponse(response, JSON.stringify(out));
	}
}




/*****************************
*			FFT 
*****************************/
const AVG_PAST_VS_NEW_WEIGHT = 4;
var noteMaxAvg = 1;
var noteMinAvg = 1;
function analyzeAudio(signal) {

	// if(SETTINGS.main.pattern != "audio") return;
	
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

	// console.log(normalize);

	// var current = {};
	var noteMags = new Float32Array(12);
	

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
				}

				break;
			}
		}
	}

	var noteMax, noteMin;
	noteMax = noteMin = noteMags[0];

	for(var i = 1; i < noteMags.length; i++) {
		noteMin = Math.min(noteMin, noteMags[i]);
		noteMax = Math.max(noteMax, noteMags[i]);
	}

	// console.log(noteMags);
	// console.log(noteMax);
	//avg note max, weighted 3/4 towards old, and 1/4 towrads new
	noteMaxAvg *= (AVG_PAST_VS_NEW_WEIGHT-1)/AVG_PAST_VS_NEW_WEIGHT;
	noteMaxAvg += noteMax/AVG_PAST_VS_NEW_WEIGHT;

	noteMinAvg *= (AVG_PAST_VS_NEW_WEIGHT-1)/AVG_PAST_VS_NEW_WEIGHT;
	noteMinAvg += noteMin/AVG_PAST_VS_NEW_WEIGHT;




	// console.log(noteMinAvg, noteMaxAvg);

	for(var i = 0; i < noteMags.length; i++){
		var val = noteMags[i] - noteMinAvg;
		var range = noteMaxAvg - noteMinAvg;
		noteMags[i] = (val * val) / (range * range);

		noteMags[i] = Math.max(SETTINGS.audio.base || 0, noteMags[i]);
	}


	LIGHTS.setAllValues(noteMags);
	

	// for(var i in visualListeners) {
	// 	var listener = visualListeners[i];

		
	// 	try { listener.send(sendMe); }

	// 	catch(e) {
	// 		listener.terminate();
	// 		visualListeners.splice(i, 1);
	// 		i--;
	// 	}

		
	// }

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
	try {
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
	catch(err) {
		console.log(err);
	}
}



	
/*****************************
*			Tones
*****************************/
function initTones() {
	var A1 = 55.0;
	//&& tone < BUFFER_SIZE/2  somehow not helpful
	for(var tone = A1; tone < SAMPLE_RATE/2; tone *= halfStep)
		TONES.push(tone);

	// console.log(TONES);
}



/*****************************
*		Audio Streaming 
*****************************/
function initAudioInSocket() {
	var buffers = [];
	var totalBufferSize = 0;

	const audioIn =  new WebSocket.Server({ port: 4321 });
	audioIn.on('connection', function connection(ws) {
		console.log("AUDIO IN")
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


	    		// console.log("analyze");
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
function initSettings(name) {
	console.log("NAME IS", name);

	if(name != undefined) {
		
		loadSettings(name, function(settings) {
			for(var key in settings) {
				SETTINGS.set(name, key, settings[key]);
			}
		});
	}
	
	else {
		initSettings("main");
		initSettings("cycle");
		initSettings("chaos");
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




function loadSettings(name, thenFn) {
	fs.readFile("settings/"+name+".json", function(err, data){
		if(err) console.error(err);

		else {
			var settings = JSON.parse(data);
			thenFn(settings);
		}
	});
}

function saveSettings(name, newVal) {
	fs.writeFileSync("settings/"+name+".json", JSON.stringify(newVal));
}








// function setPattern(name) {
// 	var newPattern = PATTERNS[name];

// 	if(newPattern) {
// 		loadSettings("main", function(settings) {
// 			if(settings.pattern != name) {
// 				settings.pattern = name;
// 				saveSettings(settings);

// 				newPattern();
// 			}
// 		});
// 	}
// }























init();





