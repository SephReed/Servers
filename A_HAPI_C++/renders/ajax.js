
var Ajax = {};
Ajax.send = function(getOrPost, url, dataType, data) {
	return new Promise( function(resolve, reject) {
		var request = new XMLHttpRequest();

		if(url.endsWith('.json'))
			request.overrideMimeType("application/json");

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

Ajax.post = function(url, data, contentType) {
	return Ajax.send("POST", url, contentType, data);
}
