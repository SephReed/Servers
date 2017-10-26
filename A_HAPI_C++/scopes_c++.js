HAPI.txtListToRegExpString = function(filePath) {
	return (fs.readFileSync(filePath)+"")
	.split("\n")
	.map(function(item){
		return item.trim();
	})
	.sort(function(a,b){
		return b.length - a.length;
	})
	.reduce(function(sum, val){
		return sum +"|"+val;
	});
}


HAPI.scopes = {};
HAPI.scopes.root = {
	name: "file",
	allowedSubScopes: ["include", "fnDef", "classDef", "string", "keyComp", "keyClass", "keyVar", "comment"]
}

// HAPI.scopes.roots = {}
// HAPI.scopes.roots["cpp"] = {
// 	name: "cppFile",
// 	allowedSubScopes: ["include", "fnDef", "string", "keyComp", "keyClass", "keyVar", "comment"]
// }
// HAPI.scopes.roots["h"] = HAPI.scopes.roots["hpp"] = {
// 	name: "cppFile",
// 	allowedSubScopes: ["include", "fnDef", "string", "keyComp", "keyClass", "keyVar", "comment"]
// }


HAPI.scopes.list = [
	{
		name: "comment",
		start:  "//",
		startInclusive: true,
		end: "\n",
		endInclusive : false,
		allowedSubScopes: ["TODO"]
	},
		{
			name: "TODO",
			start:  "//TODO:",
			startInclusive: true,
			end: "\n",
			endInclusive : false,
		},

	{
		name: "string",
		start:  `\"`,
		startInclusive: true,
		end: `([^\\\\]\")|$`,
		endInclusive : true,
	},
	{
		name: "include",
		start:  "#include",
		startInclusive: true,
		end: "\n",
		endInclusive: false,
		allowedSubScopes: ["keyComp", "string"]
	},
	{
		name: "classDef",
		start: "class",
		startInclusive: true,
		end: "}|;",
		endInclusive: true,
		allowedSubScopes: ["classNameDef", "inheritance", "classDefBlock", "comment"]
	},
		{
			name: "classNameDef",
			start:  "class",
			startInclusive: true,
			end: "\n|{|:",
			endInclusive: false,
			allowedSubScopes: ["keyClass"]
		},
		{
			name: "inheritance",
			// start: ":\\s*(public|private|protected)",
			// startInclusive: true,
			start: ":\\s*(?=(public|private|protected))",
			startInclusive: false,
			end: "\n|{",
			endInclusive: false,
			allowedSubScopes: ["keyClass"]
		},
		{
			name: "classDefBlock",
			start: "{",
			startInclusive: true,
			end: "}",
			endInclusive: true,
			allowedSubScopes: ["classFnPrivacyBlock", "keyComp", "keyClass", "keyVar", "comment"]
		},
			{
				name: "classFnPrivacyBlock",
				start: "(public|private|protected)\\s*:",
				startInclusive: true,
				end: "((public|private|protected)\\s*:)|}",
				endInclusive: false,
				allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment"]
			},
				// {
				// 	name: "classFnDeclaration",
				// 	start: "[~\\w\\d](?=([\\w\\d]*\\())",
				// 	startInclusive: true,
				// 	end: ";",
				// 	endInclusive: false,
				// 	allowedSubScopes: ["classFnParams", "keyComp", "keyClass", "keyVar", "comment"]
				// },
				// 	{
				// 		name: "classFnParams",
				// 		start: "\\(",
				// 		startInclusive: true,
				// 		end: "\\)",
				// 		endInclusive: true,
				// 		allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "num"]
				// 	},

	{
		name: "fnDef",
		start: "\\w.*\\(",
		startInclusive: true,
		end: "}",
		endInclusive: true,
		allowedSubScopes: ["fnHeaderDef", "fnDefBlock", "keyComp", "keyClass", "keyVar", "comment"]
	},

		{
			name: "fnHeaderDef",
			start: "\\w",
			startInclusive: true,
			end: "\\{",
			endInclusive: false,
			allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment"]
		},
			
		{
			name: "fnDefBlock",
			start: "{",
			startInclusive: true,
			end: "}",
			endInclusive: true,
			allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment", "string"]
		},

			{
				name: "fnCall",
				start: "[^\\w~](?=[A-Za-z_~]\\w*\\s*\\()",  //\W[A-Za-z_]\w*\s*\(
				startInclusive: false,
				end: "\\)",
				endInclusive: true,
				allowedSubScopes: ["fnName", "args", "keyComp", "keyClass", "keyVar", "comment", "string"]
			},

				{
					name: "fnName",
					start: "[A-Za-z_~]",  //\W[A-Za-z_]\w*\s*\(
					startInclusive: true,
					end: "\\(",
					endInclusive: false,
					// allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment"]
				},

				{
					name: "args",
					start: "\\(",
					startInclusive: true,
					end: "\\)",
					endInclusive: true,
					allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "num"]
				},



	{
		name: "keyComp",
		start: HAPI.txtListToRegExpString("compiler_keywords.txt")
	},
	{
		name: "keyClass",
		start: HAPI.txtListToRegExpString("class_keywords.txt")
	},
	{
		name: "keyVar",
		start: HAPI.txtListToRegExpString("var_keywords.txt")
	},
	// {
	// 	name: "num",
	// 	start: "\\W(?=\\d)",
	// 	startInclusive: false,
	// 	end: "\\d(?=\\W)",
	// 	endInclusive: true,
	// },

]

HAPI.scopes.byID = {};
HAPI.scopes.list.forEach(function(scope, index) {
	scope.priority = HAPI.scopes.list.length - index;
	HAPI.scopes.byID[scope.name] = scope;

	if(scope.end == undefined)
		scope.startInclusive = true;
})


HAPI.scopes.byID["include"].onComplete = function(scopeChunk) {
	console.log("doing On complete");

	var includeTarget = scopeChunk.getFirstOfName("string");
	if(includeTarget) {
		var chunk = includeTarget.chunk;
		var include = chunk.file.rawText.substring(chunk.startIndex+1, chunk.endIndex);
		console.log("adding file", include);
		chunk.file.addInclude(include);
		scopeChunk.includePath = include;
	}
}

HAPI.scopes.byID["include"].onHtmlOut = function (scopeChunk, htmlOut) {
	var path = scopeChunk.includePath;
	if(path !== undefined) {
		htmlOut.unshift("<a href='"+path+".html'>");
		htmlOut.push("</a>");
	}
}

HAPI.scopes.byID["fnName"].onComplete = function(scopeChunk) {
	var fnName = scopeChunk.file.rawText.substring(scopeChunk.startIndex, scopeChunk.endIndex+1);
	scopeChunk.file.classFns = scopeChunk.file.classFns || {};

	scopeChunk.file.classFns[fnName] = {};
}




HAPI.scopes.getPotentials = function(scope) {
	var out = [];
	if(scope.allowedSubScopes) {
		scope.subScopes = scope.allowedSubScopes
		.filter((subScopeName) => {
			return subScopeName != scope.name;
		}).map((subScopeName) => {
			var addMe = HAPI.scopes.byID[subScopeName];
			if(addMe == undefined)
				console.error("bad name for sub scope:", subScopeName);
			return addMe;
		}).filter((subScope) => {
			return subScope != undefined;
		})

		scope.subScopes.forEach((item) => {out.push(item.name)});

		scope.subScopes.map(function(subScope){
			// console.log(subScope);
			return HAPI.scopes.getPotentials(subScope);
		}).forEach(function(subScopePotentials){
			// console.log(subScopePotentials);
			subScopePotentials
			.filter(function(potential){
				return out.indexOf(potential) == -1;
			}).forEach((subScopeName) => {
				out.push(subScopeName);
			});
		});
	}
	scope.potentialSubScopes = out;
	return out;
}

HAPI.scopes.getPotentials(HAPI.scopes.root);



// console.log(HAPI.scopes.root, HAPI.scopes.list);














