
console.log("lalal");

var linkedItem = (window.location+'').match(/#\w+/i);

document.addEventListener("DOMContentLoaded", function(){

	parent.updateUrl();

	parent.updateFileIFrameSize(document.body.scrollHeight);	
	if(linkedItem) {
		var domNode = document.getElementById(linkedItem[0]);
		if(domNode)
			domNode.classList.add("linked_page_item")
	}
});




