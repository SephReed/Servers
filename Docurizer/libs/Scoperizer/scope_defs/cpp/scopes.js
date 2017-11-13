const Scoperizer = require('../../Scoperizer.js');


exports.name = "c++";

exports.root = {
	name: "file",
	// allowedSubScopes: ["include", "block", "fnDef", "classDef", "string", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
	allowedSubScopes: ["include", "command", "fnDef", "classDef"]
}


//Common groups.
var COMMENTS = ["comment", "multiLineComment"];
var COMMON_END_CASE_BREAKERS = ["string", "comment", "multiLineComment"]
// var FN_CALL = /(\w\S*)(\(.*\))/

//Common Regexs
var LINE_ENDS = /\n|$|\/\//;



exports.anywhereScopes = [
	"multiLineComment",
	"comment"
]




exports.list = [
	exports.root,
	{
		name: "multiLineComment",
		start:  /\/\*[\s\S]*\*\//,
	},
	{
		name: "comment",
		start: /\/\/.*/,
	},
	// {
	// 	name: "comment",
	// 	start:  "//",
	// 	startInclusive: true,
	// 	end: /\n|$/,
	// 	endInclusive : true,
	// 	allowedSubScopes: ["TODO"]
	// },
	// 	{
	// 		name: "TODO",
	// 		start:  "//TODO:",
	// 		startInclusive: true,
	// 		end: /\n|$/,
	// 		endInclusive : false,
	// 	},

	
	{
		name: "include",
		start:  "#include",
		startInclusive: true,
		end: /\n/,
		endInclusive: false,
		allowedSubScopes: ["keyComp", "string"],
	},
	{
		name: "fnDef",
		start: /(?:(\w\S*)\s+)?(\w\S*)(\(.*\))\s*{/,
		// start: "\\w.*\\(",
		startInclusive: true,
		end: /\}/,
		endInclusive: true,
		capturedScopesNames: ["typeDef", "fnName", "ArgDefs"],
		allowedSubScopes: ["conditionTree", "command"]
	},

		{
			name: "typeDef",
		},


		{
			name: "ArgDefs",
			allowedSubScopes: ["ArgDef"]
		},

			{
				name: "ArgDef",
				start: /(\b\w[^,\s]*)\s+(\b\w[^,\s\)]*)/,
				capturedScopesNames: ["typeDef", "fnName"],
			},


		{
			name: "conditionTree",
			start: "if",
			startInclusive: true,
			// end: "\\}",
			end: /\s+(?!(?:else|if|\s))/,
			endInclusive: false,
			allowedSubScopes: ["condition", "default"]
		},

			{
				name: "condition",
				start: /((?:else\s+)?if)(\([\s\S]*?\))\s*{/,
				startInclusive: true,
				end: "\}",
				endInclusive: true,
				capturedScopesNames: ["conditionType", "booleanable"],
				allowedSubScopes: ["conditionTree", "command"]
			},

				{ name: "conditionType",},
				{ name: "booleanable",},

			{
				name: "default",
				start: /(else)\s*{/,
				startInclusive: true,
				end: "\}",
				endInclusive: true,
				capturedScopesNames: ["conditionType"],
				allowedSubScopes: ["conditionTree", "command"]
			},

			
		{
			name: "command",
			start: /\b(.*?);/,
			capturedScopesNames: ["statement"]
		},

			{
				name: "statement",
				// start:  /^[\s\S]*$/,
				allowedSubScopes: ["fnCall", "equal", "bitLeft", "ptr", "string", "num"],
			},

				{ name: "operator",},

				{
					name: "fnCall",
					start: /(\w+)(\(.*\))/,
					capturedScopesNames: ["fnName", "args"]
				},

					{ name: "fnName",},

					{
						name: "args",
						allowedSubScopes: ["arg"]
					},

					{
						name: "arg",
						start: /\b(\w[^,\s\)]*)/,
						capturedScopesNames: ["statement"]
						// allowedSubScopes: ["num"]
					},

				{
					name: "equal",
					start:  /^([\s\S]*?)(=)([\s\S]*)$/,
					capturedScopesNames: ["reciever", "operator", "statement"]
				},	

					{
						name: "reciever",
						start:  /(?:(\w\S*)\s+)?(\w\S*)/,
						capturedScopesNames: ["typeDef", "varName"]
					},	

						{ name: "varName",},

				{
					name: "bitLeft",
					start:  /^([\s\S]*?)(<<)([\s\S]*)$/,
					capturedScopesNames: ["statement", "operator", "statement"]
				},	

				{
					name: "ptr",
					start:  /^([\s\S]*?)(->)([\s\S]*)$/,
					capturedScopesNames: ["statement", "operator", "statement"]
				},
					

	



	
	// {
	// 	name: "classDef",
	// 	start: / *class/,
	// 	// start: "class",
	// 	startInclusive: true,
	// 	end: "}",
	// 	endInclusive: true,
	// 	endCaseBreakers: [COMMON_END_CASE_BREAKERS, "block"]
	// 	allowedSubScopes: ["classNameDef", "inheritance", "classDefBlock", "comment", "multiLineComment"]
	// },
	// 	{
	// 		name: "classNameDef",
	// 		start:  "class",
	// 		startInclusive: true,
	// 		end: "{",
	// 		endInclusive: false,
	// 		allowedSubScopes: ["keyClass", "inheritance"]
	// 	},
	// 	{
	// 		name: "inheritance",
	// 		// start: ":\\s*(public|private|protected)",
	// 		// startInclusive: true,
	// 		start: ":\\s*(?=(public|private|protected))",
	// 		startInclusive: false,
	// 		end: "{",
	// 		endInclusive: false,
	// 		allowedSubScopes: ["keyClass"]
	// 	},
	// 	{
	// 		name: "classDefBlock",
	// 		start: "{",
	// 		startInclusive: true,
	// 		end: "}",
	// 		endInclusive: true,
	// 		allowedSubScopes: ["classFnPrivacyBlock", "comment", "multiLineComment"]
	// 	},
	// 		{
	// 			name: "classFnPrivacyBlock",
	// 			start: "(public|private|protected)\\s*:",
	// 			startInclusive: true,
	// 			end: "((public|private|protected)\\s*:)|}",
	// 			endInclusive: false,
	// 			allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
	// 		},
	// 			// {
	// 			// 	name: "classFnDeclaration",
	// 			// 	start: "[~\\w\\d](?=([\\w\\d]*\\())",
	// 			// 	startInclusive: true,
	// 			// 	end: ";",
	// 			// 	endInclusive: false,
	// 			// 	allowedSubScopes: ["classFnParams", "keyComp", "keyClass", "keyVar", "comment"]
	// 			// },
	// 			// 	{
	// 			// 		name: "classFnParams",
	// 			// 		start: "\\(",
	// 			// 		startInclusive: true,
	// 			// 		end: "\\)",
	// 			// 		endInclusive: true,
	// 			// 		allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "num"]
	// 			// 	},
	

	

	

	


			

			


	

	// 			{
	// 				name: "fnName",
	// 				start: /[A-Za-z_~\[\]]/,  //\W[A-Za-z_]\w*\s*\(
	// 				startInclusive: true,
	// 				end: "\\(",
	// 				endInclusive: false,
	// 				// allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment"]
	// 			},

	// 			{
	// 				name: "args",
	// 				start: "\\(",
	// 				startInclusive: true,
	// 				end: "\\)",
	// 				endInclusive: true,
	// 				allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "arg"]
	// 			},

	// 				{
	// 					name: "arg",
	// 					start: "\\(|,|;",
	// 					startInclusive: false,
	// 					end: "\\)|,|;",
	// 					endInclusive: false,
	// 					allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "num", "string"]
	// 				},

	{
		name: "keyComp",
		start: Scoperizer.txtListToRegExpString(__dirname+"/compiler_keywords.txt")
	},
	{
		name: "keyClass",
		start: Scoperizer.txtListToRegExpString(__dirname+"/class_keywords.txt")
	},
	{
		name: "keyVar",
		start: Scoperizer.txtListToRegExpString(__dirname+"/var_keywords.txt")
	},
	{
		name: "num",
		start: /\d+\.?\d*/,
	},
	{
		name: "string",
		start:  /("|'|`)(?:\\\1|.)*?\1/,
		// start:  /".*"/,
	},

]












// exports.list = [
// 	exports.root,
// 	{
// 		name: "multiLineComment",
// 		start:  "/\\*",
// 		startInclusive: true,
// 		end: "\\*/|$",
// 		endInclusive : true,
// 	},
// 	{
// 		name: "comment",
// 		start:  "//",
// 		startInclusive: true,
// 		end: /\n|$/,
// 		endInclusive : true,
// 		allowedSubScopes: ["TODO"]
// 	},
// 		{
// 			name: "TODO",
// 			start:  "//TODO:",
// 			startInclusive: true,
// 			end: /\n|$/,
// 			endInclusive : false,
// 		},

// 	{
// 		name: "string",
// 		start:  /("|'|`)(?:\\\1|.)*?\1/,
// 	},
// 	{
// 		name: "include",
// 		start:  "#include",
// 		startInclusive: true,
// 		end: /\n|$/,
// 		endInclusive: false,
// 		allowedSubScopes: ["keyComp", "string"]
// 	},
// 	{
// 		name: "classDef",
// 		start: / *class/,
// 		// start: "class",
// 		startInclusive: true,
// 		end: /}|;/,
// 		endInclusive: true,
// 		allowedSubScopes: ["classNameDef", "inheritance", "classDefBlock", "comment", "multiLineComment"]
// 	},
// 		{
// 			name: "classNameDef",
// 			start:  "class",
// 			startInclusive: true,
// 			end: /\n|{|:|$/,
// 			endInclusive: false,
// 			allowedSubScopes: ["keyClass"]
// 		},
// 		{
// 			name: "inheritance",
// 			// start: ":\\s*(public|private|protected)",
// 			// startInclusive: true,
// 			start: ":\\s*(?=(public|private|protected))",
// 			startInclusive: false,
// 			end: "\n|{",
// 			endInclusive: false,
// 			allowedSubScopes: ["keyClass"]
// 		},
// 		{
// 			name: "classDefBlock",
// 			start: "{",
// 			startInclusive: true,
// 			end: "}",
// 			endInclusive: true,
// 			allowedSubScopes: ["classFnPrivacyBlock", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
// 		},
// 			{
// 				name: "classFnPrivacyBlock",
// 				start: "(public|private|protected)\\s*:",
// 				startInclusive: true,
// 				end: "((public|private|protected)\\s*:)|}",
// 				endInclusive: false,
// 				allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
// 			},
// 				// {
// 				// 	name: "classFnDeclaration",
// 				// 	start: "[~\\w\\d](?=([\\w\\d]*\\())",
// 				// 	startInclusive: true,
// 				// 	end: ";",
// 				// 	endInclusive: false,
// 				// 	allowedSubScopes: ["classFnParams", "keyComp", "keyClass", "keyVar", "comment"]
// 				// },
// 				// 	{
// 				// 		name: "classFnParams",
// 				// 		start: "\\(",
// 				// 		startInclusive: true,
// 				// 		end: "\\)",
// 				// 		endInclusive: true,
// 				// 		allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "num"]
// 				// 	},
// 	{
// 		name: "block",
// 		start:  `\\{`,
// 		startInclusive: true,
// 		end: `\\}`,
// 		endInclusive : true,
// 		allowedSubScopes: ["conditional", "fnCall", "block", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "string"]
// 	},

// 	{
// 		name: "fnDef",
// 		start: / *\w[^;\{]*\s*\{/,
// 		// start: "\\w.*\\(",
// 		startInclusive: true,
// 		end: /\}/,
// 		endInclusive: true,
// 		allowedSubScopes: ["fnDefHeader", "block", "fnDefBlock", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
// 	},

// 		{
// 			name: "fnDefHeader",
// 			start: "\\w",
// 			startInclusive: true,
// 			end: ";|\\{",
// 			endInclusive: false,
// 			allowedSubScopes: ["returnType", "fnCall", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
// 		},

// 			{
// 				name: "returnType",
// 				start: /\w+(?= +.+\()/,
// 				startInclusive: true,
// 				end: / /,
// 				endInclusive: false,
// 				allowedSubScopes: ["keyVar"]
// 			},


			

// 			{
// 				name: "conditional",
// 				start: "if",  //\W[A-Za-z_]\w*\s*\(
// 				startInclusive: true,
// 				end: "\\}",
// 				endInclusive: true,
// 				allowedSubScopes: ["block", "args", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
// 			},


// 			{
// 				name: "fnCall",
// 				// start: "[^\\w~](?=[A-Za-z_~]\\w*\\s*\\()",  //\W[A-Za-z_]\w*\s*\(
// 				// startInclusive: false,
// 				// start: "[A-Za-z_~]\\w*\\s*(>>)?\\(",  //\W[A-Za-z_]\w*\s*\(
// 				start: /[A-Za-z_~\[\]]\w*\s*(<<)?\(/,
// 				startInclusive: true,
// 				end: "\\)",
// 				endInclusive: true,
// 				allowedSubScopes: ["fnName", "args", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "string"]
// 			},

// 				{
// 					name: "fnName",
// 					start: /[A-Za-z_~\[\]]/,  //\W[A-Za-z_]\w*\s*\(
// 					startInclusive: true,
// 					end: "\\(",
// 					endInclusive: false,
// 					// allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment"]
// 				},

// 				{
// 					name: "args",
// 					start: "\\(",
// 					startInclusive: true,
// 					end: "\\)",
// 					endInclusive: true,
// 					allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "arg"]
// 				},

// 					{
// 						name: "arg",
// 						start: "\\(|,|;",
// 						startInclusive: false,
// 						end: "\\)|,|;",
// 						endInclusive: false,
// 						allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "num", "string"]
// 					},

// 	{
// 		name: "keyComp",
// 		start: Scoperizer.txtListToRegExpString(__dirname+"/compiler_keywords.txt")
// 	},
// 	{
// 		name: "keyClass",
// 		start: Scoperizer.txtListToRegExpString(__dirname+"/class_keywords.txt")
// 	},
// 	{
// 		name: "keyVar",
// 		start: Scoperizer.txtListToRegExpString(__dirname+"/var_keywords.txt")
// 	},
// 	{
// 		name: "num",
// 		start: "\\d+\\.?\\d*",
// 	},

// ]


















