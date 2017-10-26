document.addEventListener("DOMContentLoaded", function() {
	//make links update the url args
	var links = document.getElementsByTagName("a");
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		if(link.target == "file_content") {
			link.addEventListener("click", function(event) {
				var file_url = event.target.attributes.href.value;
				window.history.replaceState({}, file_url, "index.html?file="+file_url+"&overview=includes");
			});
		}
	}
});