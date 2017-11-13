exports.augment = function(Scoperizer) {
	Scoperizer.ScopeChunk.prototype.toHtml = function() {
		return exports.htmlifySpacing(this.permeate( {
			postSubsFn: function(scopeChunk, childResults, state) {
				if(scopeChunk.scope == Scoperizer.LOOSE_TEXT_SCOPE)
					return exports.exitHtml(scopeChunk.getRawCode());

				if(scopeChunk.scope.name == "comment")
					console.log("comment found");

				var THIS = this;
				var outStrings = [];
				var name = scopeChunk.scope.name;
				outStrings.push("<"+name+">");
				if(childResults.length == 0) {
					var text;
					if(scopeChunk.isNonCode != true)
						text = scopeChunk.getRawCode();
					else {
						text = scopeChunk.getRawText();
						console.log(text);
					}

					outStrings.push(exports.exitHtml(text));
				}
				else 
					childResults.forEach((result) => {outStrings.push(result)});

				outStrings.push("</"+name+">");

				scopeChunk.dispatchScopeEvent("htmlOut", outStrings)

				return outStrings.join('');
			}
		}))
	};
}




exports.exitHtml = function(exitMe) {
	exitMe = exitMe.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');
	return exitMe;
}




exports.htmlifySpacing = function(showMe) {
	return showMe.replace(/&rmnxt;[\n.]?/g, '')
	.replace(/  +/g, function(spaces){
		if(spaces.length == 2)
			return "&nbsp; ";
		spaces = spaces.substr(0, spaces.length-2);
		return " "+spaces.replace(/ /g, "&nbsp;")+" ";
	})
	.replace(/\t/g, '&emsp;')
	.replace(/\n/g, '<br>\n');
}






