function ID(id) {
	return document.getElementById(id);
}


domReady = docReady = function(fn) {
	return document.addEventListener("DOMContentLoaded", fn);
}