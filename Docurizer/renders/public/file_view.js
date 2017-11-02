
console.log("lalal");

document.addEventListener("DOMContentLoaded", function(){

	parent.updateUrl();

	parent.updateFileIFrameSize(document.body.offsetHeight);

	var linkedItem = (window.location+'').match(/#\w+/i);	
	if(linkedItem) {
		var domNode = document.getElementById(linkedItem[0]);
		if(domNode)
			domNode.classList.add("linked_page_item")
	}
});




