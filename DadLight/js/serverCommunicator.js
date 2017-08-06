
var SERVER = {};




SERVER.getSettings = function(name) {
	name = name || "main";
	return Ajax.getJSON("/settings/"+name+".json");
}



SERVER.setSettings = function(nameOrChanges, changesOrNull) {
	var sendMe = {};
	sendMe.cmd = "changeSettings";

	if(typeof nameOrChanges == "string") {
		sendMe.name = nameOrChanges;
		sendMe.changes = changesOrNull
	}
	else {
		sendMe.name = "main";
		sendMe.changes = nameOrChanges;
	}

	return Ajax.post("", JSON.stringify(sendMe));
}


SERVER.getTrackList = function() {
	var sendMe = {};
	sendMe.cmd = "trackList";
	return Ajax.post("", JSON.stringify(sendMe)).then(function(request) {
		return JSON.parse(request.response);
	});
}


SERVER.getTrack = function(trackName) {
	return Ajax.get("/wavs/"+trackName, "arraybuffer");
}



Ajax = {};
Ajax.send = function(getOrPost, url, dataType, data) {
	return new Promise( function(resolve, reject) {
		var request = new XMLHttpRequest();

		if(url.endsWith('.json'))
			request.overrideMimeType("application/json");

		if(getOrPost == "GET" && dataType)
			request.responseType = dataType;

		request.open(getOrPost, url);	

		request.onload = function() {
			if (request.status >= 200 && request.status < 400) 
				resolve(request);			    

			else request.onerror();
		};

		request.onerror = reject;

		try { request.send(data); }
		catch(err) { reject(err); }
	});
}

Ajax.get = function(url, responseType) {
	return Ajax.send("GET", url, responseType);
}

Ajax.getJSON = function(url, responseType) {
	return Ajax.get(url, responseType).then(function(request){
		return JSON.parse(request.response);
	}).catch(function() {
		return {};
	});
}

Ajax.post = function(url, data, contentType) {
	return Ajax.send("POST", url, contentType, data);
}