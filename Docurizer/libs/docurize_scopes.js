var blockify = function(chunk, htmlSpans) {
	htmlSpans.push("&rmnxt;");
}


exports.augment = function(scopeRuleSet) {

	//includes become links
	scopeRuleSet.getScope("include").on("htmlOut", function(scopeChunk, outStrings){
		var path = scopeChunk.includePath;
		if(path !== undefined) {
			outStrings.unshift("<a href='"+path+".html'>");
			outStrings.push("</a>");
		}
	});

	//the following become blocks, remove any new lines after
	scopeRuleSet.getScope("fnDef").on("htmlOut", blockify);
	scopeRuleSet.getScope("classDef").on("htmlOut", blockify);
	// scopeRuleSet.getScope("block").on("htmlOut", blockify);




	//when a function definition header is found, search for all the comments preceding the
	//defintion, to be used for the docs
	scopeRuleSet.getScope("fnDefHeader").on("complete", function(fnHeaderChunk) {
		var fnNameChunk = fnHeaderChunk.getFirstSub(">fnCall>fnName");

		if(fnNameChunk == undefined) {
			console.error("\nERROR: No name found in fnHeader", fnHeaderChunk.getRawText());
			console.error(fnHeaderChunk.file.nameAndExtension);
			return;
		}
		var fnName = fnNameChunk.getRawText();

		if(fnHeaderChunk.file.classFns == undefined) {
			fnHeaderChunk.file.classFns = {};
			fnHeaderChunk.file.classFns.all = [];
			fnHeaderChunk.file.classFns.byName = {};	
		}

		var classFn = fnHeaderChunk.classFn = fnHeaderChunk.file.classFns.byName[fnName] = {};
		fnHeaderChunk.file.classFns.all.push(classFn);

		classFn.fnName = fnName;
		classFn.className = fnHeaderChunk.file.name;
		// classFn.fnHeader = fnHeaderChunk.getRawText();
		classFn.fnHeader = fnHeaderChunk.toHtml();

		// console.log("START")
		var preCommentChunks = [];
		for(var ptr = fnHeaderChunk.parentChunk ? fnHeaderChunk.parentChunk.prevChunk : undefined; ptr != undefined; ptr = ptr.prevChunk) {
			// console.log(ptr.scope.name);
			if(ptr.scope.name == "comment" || ptr.scope.name == "multiLineComment")
				preCommentChunks.push(ptr);
			else if(ptr.scope.name != "LooseText")
				break;
		}

		classFn.fnComments = preCommentChunks.reverse()
		.map((chunk) =>{
			var text = chunk.getRawText().replace(/^\/\//i, '');
			if(text.charAt(text.length-1) == '.')
				text += "<br>";
			else if(text.charAt(text.length-1) != ' ')
				text += " ";

			return text;
		}).join('') || "no description";
	});




	//make function definion headers link outwards cpp -> hpp -> doc
	scopeRuleSet.getScope("fnDefHeader").on("htmlOut", function(fnHeaderChunk, htmlBits) {
		if(fnHeaderChunk.classFn == undefined)
			return;

		var fnName = fnHeaderChunk.classFn.fnName;
		var className = fnHeaderChunk.file.name;
		htmlBits.unshift(`<a id="#`+fnName+`" href="`+className+`.hpp.html#`+fnName+`">`);
		htmlBits.push(`</a>`);
	});

}














// 

