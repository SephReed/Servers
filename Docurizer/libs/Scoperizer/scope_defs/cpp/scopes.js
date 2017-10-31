const Scoperizer = require('../../Scoperizer.js');




exports.root = {
	name: "file",
	allowedSubScopes: ["include", "block", "fnDef", "classDef", "string", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
}



exports.list = [
	exports.root,
	{
		name: "multiLineComment",
		start:  "/\\*",
		startInclusive: true,
		end: "\\*/",
		endInclusive : true,
	},
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
		start: / *class/,
		// start: "class",
		startInclusive: true,
		end: /}|;/,
		endInclusive: true,
		allowedSubScopes: ["classNameDef", "inheritance", "classDefBlock", "comment", "multiLineComment"]
	},
		{
			name: "classNameDef",
			start:  "class",
			startInclusive: true,
			end: /\n|{|:/,
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
			allowedSubScopes: ["classFnPrivacyBlock", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
		},
			{
				name: "classFnPrivacyBlock",
				start: "(public|private|protected)\\s*:",
				startInclusive: true,
				end: "((public|private|protected)\\s*:)|}",
				endInclusive: false,
				allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
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
		name: "block",
		start:  `\\{`,
		startInclusive: true,
		end: `\\}`,
		endInclusive : true,
		allowedSubScopes: ["fnCall", "block", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "string"]
	},

	{
		name: "fnDef",
		start: " *\\w.*\\(",
		// start: "\\w.*\\(",
		startInclusive: true,
		end: ";|\\}",
		endInclusive: true,
		allowedSubScopes: ["fnDefHeader", "block", "fnDefBlock", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
	},

		{
			name: "fnDefHeader",
			start: "\\w",
			startInclusive: true,
			end: ";|\\{",
			endInclusive: false,
			allowedSubScopes: ["fnCall", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment"]
		},
			
		// {
		// 	name: "fnDefBlock",
		// 	start: "{",
		// 	startInclusive: true,
		// 	end: "}",
		// 	endInclusive: true,
		// 	allowedSubScopes: ["fnCall", "block", "keyComp", "keyClass", "keyVar", "comment", "string"]
		// },

			{
				name: "conditional",
				start: "if",  //\W[A-Za-z_]\w*\s*\(
				startInclusive: true,
				end: "\\}",
				endInclusive: true,
				allowedSubScopes: ["conditional", "fnName", "args", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "string"]
			},


			{
				name: "fnCall",
				// start: "[^\\w~](?=[A-Za-z_~]\\w*\\s*\\()",  //\W[A-Za-z_]\w*\s*\(
				// startInclusive: false,
				// start: "[A-Za-z_~]\\w*\\s*(>>)?\\(",  //\W[A-Za-z_]\w*\s*\(
				start: /[A-Za-z_~]\w*\s*(<<)?\(/,
				startInclusive: true,
				end: "\\)",
				endInclusive: true,
				allowedSubScopes: ["fnName", "args", "keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "string"]
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
					allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "arg"]
				},

					{
						name: "arg",
						start: "\\(|,|;",
						startInclusive: false,
						end: "\\)|,|;",
						endInclusive: false,
						allowedSubScopes: ["keyComp", "keyClass", "keyVar", "comment", "multiLineComment", "num", "string"]
					},

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


















