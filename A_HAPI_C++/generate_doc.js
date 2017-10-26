// var getDoc = fs.promise.readFile()
// .then((data) => {
// 	return data + "";
// });

HAPI.class.File.prototype.getDoc = function () {
	var THIS = this;
	return docMaker.getDoc.then(()=>{
		var fillArgs = {
			className: THIS.name,
			functions: []
		}

		for(fnName in THIS.classFns) {
			fillArgs.functions.push({
				fnName: fnName,
				fnComments: "no comment"
			})
		}
		
		return docMaker.fill(fillArgs);
	});
	// return getDoc.then(function(doc){
	// 	return doc + THIS.path;
	// });
}







Template = function(filePath) {
	console.log("template!", filePath);
	var THIS = this;
	THIS.rawText;
	THIS.variables = {};

	THIS.getDoc = fs.promise.readFile(filePath)
	.then((data) => {
		THIS.rawText = data + "";
		THIS.scopify();
		console.log(THIS.variables);
	});
};

Template.prototype.scopify = function() {
	
	var THIS = this;
	// console.log(THIS.rawText);
	var regex = new RegExp(/{{\s*(\[\]|end)?\s*\w+\s*}}/g);
	var match;
	while(match = regex.exec(THIS.rawText)){
		var matchText = match[0];
		console.log("match", matchText);

		var key = matchText.match(/\w+(?=\s*})/i)[0];
		var addMe = THIS.variables[key];

		if(addMe == undefined) {
			THIS.variables[key] = addMe = {};
			addMe.matches = [];
		}

		if(addMe.matches.indexOf(matchText) == -1)
			addMe.matches.push(matchText);

		if(match.indexOf("[]") != -1) {
			addMe.isArray = true;
			addMe.chunkStart = match.index + matchText.length;
		}

		else if(matchText.match(/{{\s*end/i)){
			addMe.chunkEnd = match.index-1;
			addMe.subTemplate = THIS.rawText.substring(addMe.chunkStart, addMe.chunkEnd+1);
			THIS.rawText.replace(addMe.subTemplate, "");
		}
	};
	// console.log(match);
};


Template.prototype.fill = function(args, text) {
	var THIS = this;

	var out = text || THIS.rawText;
	console.log(out);
	for(key in THIS.variables) {
		var variable = THIS.variables[key];
		var value = args[key] || "";
		console.log("HEHR", typeof value )
		if(typeof value == "string" && variable.isArray != true) {
			console.log("LAL")
			variable.matches.forEach((matchText) => {
				out = out.replace(matchText, value);
			})
		}

		else if(typeof value == "object" && variable.isArray) {
			out = out.replace(variable.matches[0], "");
			variable.isComplete = true;

			var fillText = "";
			value.forEach((argSet)=>{
				fillText += THIS.fill(argSet, variable.subTemplate);
			});
			out = out.replace(variable.matches[1], fillText);
		}
	}
	return out;
	
}


var docMaker = new Template("doc_template.html");


