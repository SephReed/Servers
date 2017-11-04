const Scoperizer = require('../../Scoperizer.js');




exports.root = {
	name: "file",
	// allowedSubScopes: ["include", "block", "fnDef", "classDef", "string", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
	allowedSubScopes: ["include", "command", "fnDef", "classDef", "comment", "multiLineComment"]
}


//Common groups.
var COMMENTS = ["comment", "multiLineComment"];
var COMMON_END_CASE_BREAKERS = ["string", "comment", "multiLineComment"]

//Common Regexs
var LINE_ENDS = /\n|$|\/\//;







exports.list = [
	exports.root,
	{
		name: "multiLineComment",
		start:  "/\\*",
		startInclusive: true,
		end: "\\*/|$",
		endInclusive : true,
	},
	{
		name: "comment",
		start:  "//",
		startInclusive: true,
		end: /\n|$/,
		endInclusive : true,
		allowedSubScopes: ["TODO"]
	},
		{
			name: "TODO",
			start:  "//TODO:",
			startInclusive: true,
			end: /\n|$/,
			endInclusive : false,
		},

	{
		name: "string",
		start:  /("|'|`)(?:\\\1|.)*?\1/,
	},
	{
		name: "include",
		start:  "#include",
		startInclusive: true,
		end: LINE_ENDS,
		endInclusive: false,
		allowedSubScopes: ["keyComp", "string"],
	},




	{
		name: "fnDef",
		start: /\b.+\{/,
		// start: "\\w.*\\(",
		startInclusive: true,
		end: /\}/,
		endInclusive: true,
		allowedSubScopes: ["fnDefHeader", "block", COMMENTS]
	},
		{
			name: "fnDefHeader",
			start: /\b./,
			startInclusive: true,
			end: "{",
			endInclusive: false,
			allowedSubScopes: ["typeDef", "fnDefTemplate", COMMENTS]
		},

			{
				name: "fnDefTemplate",
				start: /\b\S+\(/,
				startInclusive: true,
				end: /\)/,
				endInclusive: true,
				allowedSubScopes: ["fnDefTemplateName", "fnDefTemplateArgs", COMMENTS]
			},

				{
					name: "fnDefTemplateArgs",
					start: /\(/,
					startInclusive: true,
					end: /\)/,
					endInclusive: true,
					allowedSubScopes: ["fnDefArgDef", COMMENTS]
				},

					{
						name: "fnDefArgDef",
						start: /\(|,/,
						startInclusive: false,
						end: /\)|,/,
						endInclusive: false,
						allowedSubScopes: ["typeDef", COMMENTS]
					},

				{
					name: "fnDefTemplateName",
					start: /\b[^\s:]/,
					startInclusive: true,
					end: /\(/,
					endInclusive: false,
					allowedSubScopes: ["fnName", COMMENTS]
				},


			{
				name: "typeDef",
				start: /\b\S/,
				startInclusive: true,
				end: /[\s,]/,
				endInclusive: false,
				allowedSubScopes: ["keyVar"]
			},

			


	{
		name: "block",
		start:  `\\{`,
		startInclusive: true,
		end: `\\}`,
		endInclusive : true,
		allowedSubScopes: ["conditional", "command", COMMENTS]
	},
		{
			name: "fnCall",
			start: /\b\S+\(/,
			startInclusive: true,
			end: /\)/,
			endInclusive: true,
			allowedSubScopes: ["fnName", "args", COMMENTS]
		},

			{
				name: "fnName",
				start: /\b\w/,
				startInclusive: true,
				end: /\(/,
				endInclusive: false,
				allowedSubScopes: COMMENTS
			},

		{
			name: "command",
			start:  /\b\S/,
			startInclusive: true,
			end: ";",
			endInclusive: true,
			allowedSubScopes: ["fnCall", "assignment"],
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
	

	

	

	


			

	// 		{
	// 			name: "conditional",
	// 			start: "if",  //\W[A-Za-z_]\w*\s*\(
	// 			startInclusive: true,
	// 			end: "\\}",
	// 			endInclusive: true,
	// 			allowedSubScopes: ["block", "args", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
	// 		},


	

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
		start: "\\d+\\.?\\d*",
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


















