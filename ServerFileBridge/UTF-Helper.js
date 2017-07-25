

var UTF = {};


UTF.U16to8 = function(convertMe) {
	var out = "";
	for(var i = 0; i < convertMe.length; i++) {
		var charCode = convertMe.charCodeAt(i);
		out += String.fromCharCode(~~(charCode/256));
		out += String.fromCharCode(charCode%256);
	}
	return out;
}





UTF.U8to16 = function(convertMe) {
	var out = ""
	for(var i = 0; i < convertMe.length; i += 2) {
		var charCode = convertMe.charCodeAt(i)*256;
		charCode += convertMe.charCodeAt(i+1);
		out += String.fromCharCode(charCode)
	}
	return out;
}