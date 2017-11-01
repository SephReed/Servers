const fs = require("fs");
const pathTool = require('path');

exports.augment = function(parser) {
	parser.getScope("include").on("complete", function(scopeChunk) {
		var chunk = scopeChunk.getFirstSub(">string");
		if(chunk) {
			var include = chunk.file.rawText.substring(chunk.startIndex+1, chunk.endIndex);
			chunk.file.addInclude(include);
			scopeChunk.includePath = include;
		}
	});


	// parser.getScope("file").on("complete", function(scopeChunk) {
	// 	var file = scopeChunk.file;
		
	// });
}