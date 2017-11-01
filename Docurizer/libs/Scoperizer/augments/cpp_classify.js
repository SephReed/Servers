var classes = {};
classes.byName = {};
classes.all = [];

exports.getClassList = function() { return classes.all; }

exports.augment = function(cppParser) {
	cppParser.getScope("file").on("complete", function(scopeChunk){
		var file = scopeChunk.file;

		var name = file.name;

		var classObj = classes.byName[name];
		if(classObj == undefined) {
			classObj = classes.byName[name] = {name: name};
			classes.all.push(classObj);
		}

		

	})	
}


