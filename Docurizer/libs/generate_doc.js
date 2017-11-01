const fs = require('./betterFs.js').fs;





exports.Template = Template = function(filePath) {
	console.log("template!", filePath);
	var THIS = this;
	THIS.rawText;
	THIS.variables = {};

	THIS.getDoc = fs.promise.readFile(filePath)
	.then((data) => {
		THIS.rawText = data + "";
		THIS.scopify();
		// console.log(THIS.variables);
	});
};

Template.prototype.scopify = function() {
	
	var THIS = this;
	// console.log(THIS.rawText);
	var regex = new RegExp(/{{\s*(\[\]|end)?\s*\w+\s*}}/g);
	var match;
	while(match = regex.exec(THIS.rawText)){
		var matchText = match[0];
		// console.log("match", matchText);

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
			THIS.rawText = THIS.rawText.replace(addMe.subTemplate, "");
		}
	};
	// console.log(match);
};


Template.prototype.fill = function(args, text) {
	var THIS = this;

	var out = text || THIS.rawText;
	
	for(key in THIS.variables) {
		var variable = THIS.variables[key];
		var value = args[key] || "";
		if(typeof value == "string" && variable.isArray != true) {
			variable.matches.forEach((matchText) => {
				var tmp;
				while((tmp = out.replace(matchText, value)) != out)
					out = tmp;
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


// var docMaker = new Template(__dirname+"/doc_template.html");


