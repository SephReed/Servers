exports.augment = function(scopeRuleSet) {
	// scopeRuleSet.getScope("include").on("htmlOut", function(scopeChunk, outStrings){
	// 	var path = scopeChunk.includePath;
	// 	if(path !== undefined) {
	// 		htmlOut.unshift("<a href='"+path+".html'>");
	// 		htmlOut.push("</a>");
	// 	}
	// });
}








// exports.byID["include"].onHtmlOut = function (scopeChunk, htmlOut) {
// 	var path = scopeChunk.includePath;
// 	if(path !== undefined) {
// 		htmlOut.unshift("<a href='"+path+".html'>");
// 		htmlOut.push("</a>");
// 	}
// }

// exports.byID["fnDefHeader"].onComplete = function(fnHeaderChunk) {
// 	var fnNameChunk = fnHeaderChunk.getFirstSub(">fnCall>fnName");

// 	if(fnNameChunk == undefined) {
// 		console.error("\nERROR: No name found in fnHeader", fnHeaderChunk.getRawText());
// 		console.error(fnHeaderChunk.file.nameAndExtension);
// 		return;
// 	}
// 	var fnName = fnNameChunk.getRawText();

// 	if(fnHeaderChunk.file.classFns == undefined) {
// 		fnHeaderChunk.file.classFns = {};
// 		fnHeaderChunk.file.classFns.all = [];
// 		fnHeaderChunk.file.classFns.byName = {};	
// 	}

// 	var classFn = fnHeaderChunk.classFn = fnHeaderChunk.file.classFns.byName[fnName] = {};
// 	fnHeaderChunk.file.classFns.all.push(classFn);

// 	classFn.fnName = fnName;
// 	classFn.className = fnHeaderChunk.file.name;
// 	// classFn.fnHeader = fnHeaderChunk.getRawText();
// 	classFn.fnHeader = fnHeaderChunk.toHtml();

// 	// console.log("START")
// 	var preCommentChunks = [];
// 	for(var ptr = fnHeaderChunk.parentChunk ? fnHeaderChunk.parentChunk.prevChunk : undefined; ptr != undefined; ptr = ptr.prevChunk) {
// 		// console.log(ptr.scope.name);
// 		if(ptr.scope.name == "comment")
// 			preCommentChunks.push(ptr);
// 		else break;
// 	}

// 	classFn.fnComments = preCommentChunks.reverse()
// 	.map((chunk) =>{
// 		var text = chunk.getRawText().replace(/^\/\//i, '');
// 		if(text.charAt(text.length-1) == '.')
// 			text += "<br>";
// 		else if(text.charAt(text.length-1) != ' ')
// 			text += " ";

// 		return text;
// 	}).join('') || "no description";
// }



// exports.byID["fnDefHeader"].onHtmlOut = function(fnHeaderChunk, htmlBits) {
// 	if(fnHeaderChunk.classFn == undefined)
// 		return;

// 	var fnName = fnHeaderChunk.classFn.fnName;
// 	var className = fnHeaderChunk.file.name;
// 	htmlBits.unshift(`<a id="#`+fnName+`" href="`+className+`.hpp.html#`+fnName+`">`);
// 	htmlBits.push(`</a>`);
// }

// exports.byID["fnDef"].onHtmlOut = exports.byID["classDef"].onHtmlOut = exports.blockify;

