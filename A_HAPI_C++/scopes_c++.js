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
	allowedSubScopes: ["include", "classDef", "keyComp", "keyClass", "keyVar", "comment"]
}


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
			end: ".(?=\n)",
			endInclusive : true,

		},

	{
		name: "include",
		start:  "#include",
		startInclusive: true,
		end: "\n",
		endInclusive: false,
		allowedSubScopes: ["keyComp"]
	},
	{
		name: "classDef",
		start: "class",
		startInclusive: true,
		end: "\n|;",
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
				end: "((public|private|protected)\\s*:)|([\n.](?=\}))",
				endInclusive: false,
				allowedSubScopes: ["classFnDef", "keyComp", "keyClass", "keyVar", "comment"]
			},
				{
					name: "classFnDef",
					start: "[~\\w\\d](?=([\\w\\d]*\\())",
					startInclusive: true,
					end: ";",
					endInclusive: false,
					allowedSubScopes: ["classFnParams", "keyComp", "keyClass", "keyVar", "comment"]
				},
					{
						name: "classFnParams",
						start: "\\(",
						startInclusive: true,
						end: "\\)",
						endInclusive: true,
						allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment"]
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
	}
]

HAPI.scopes.byID = {};
HAPI.scopes.list.forEach(function(scope, index) {
	scope.priority = HAPI.scopes.list.length - index;
	HAPI.scopes.byID[scope.name] = scope;
})




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














