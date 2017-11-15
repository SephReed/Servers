const Scoperizer = require('../../Scoperizer.js');


exports.name = "c++";

exports.root = {
	name: "file",
	allowedSubScopes: ["ifndef", "include", "command", "fnDef", "define", "classDef"]
}


//Common groups.
var COMMAND_SPACE = ["conditionTree", "forLoop", "whileLoop", "command"]



exports.anywhereScopes = [
	"multiLineComment",
	"comment",
	"string"
]




exports.list = [
	exports.root,
	{
		name: "multiLineComment",
		start:  /\/\*[\s\S]*?\*\//,
		// allowedSubScopes: ["TODO"],
	},
	{
		name: "comment",
		start: /\/\/.*/,
		// allowedSubScopes: ["TODO"],
	},

		{
			name: "TODO",
			start: "TODO"
		},

	{
		name: "ifndef",
		start: /(#ifndef)\s+(\w+)/,
		startInclusive: true,
		end: "#endif",
		endInclusive: true,
		capturedScopesNames: ["keyComp", "compVarName"],
		allowedSubScopes: exports.root.allowedSubScopes,
	},

		{ name: "compVarName", },

	{
		name: "define",
		start: /(#define)\s+(\w+)/,
		startInclusive: true,
		capturedScopesNames: ["keyComp", "compVarName"],
	},

	
	{
		name: "include",
		start:  "(#include)",
		startInclusive: true,
		end: /\n/,
		endInclusive: false,
		allowedSubScopes: ["string"],
		capturedScopesNames: ["keyComp"]
	},
	{
		name: "fnDef",
		start: /(?:(\w\S*)\s+)?(\w\S*?\(.*?\))\s*{/,
		// start: "\\w.*\\(",
		startInclusive: true,
		end: /\}(?:\s*?;)?/,
		endInclusive: true,
		capturedScopesNames: ["typeDef", "fnCallDef"],
		allowedSubScopes: COMMAND_SPACE
	},

		{ name: "typeDef", },

		{ 
			name: "fnCallDef", 
			start: /([~\w]\S*?)(\(.*?\))/,
			capturedScopesNames: ["fnName", "argDefs"]
		},

			{ 
				name: "fnName",
				start: /(?:(\w+):+)?(~?\w+)/,
				capturedScopesNames: ["fnNamePath", "fnNameBase"]
			},
				{ name: "fnNamePath", },
				{ name: "fnNameBase", },

			{
				name: "argDefs",
				allowedSubScopes: ["argDefSpans"],
				// split: ",",
				// slitLeft: "argDef",
				// slitRight: "argDef",
				// noSplit: "argDef",
			},

				{
					name: "argDefSpans",
					start: /([^\(,\)]+)/,
					capturedScopesNames: ["argDef"],
				},

					{
						name: "argDef",
						// start: /(\b\w[^,\s]*)\s+(\b\w[^,\s\)]*)/,
						start: /(\S[\s\S]*)\s+(\S+)\s*$/,
						capturedScopesNames: ["typeDef", "varName"],	
					},

						{ name: "varName",},


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
				start: /((?:else\s+)?if)\s*(\([\s\S]*?\))\s*{/,
				startInclusive: true,
				end: "\}",
				endInclusive: true,
				capturedScopesNames: ["conditionType", "booleanable"],
				allowedSubScopes: COMMAND_SPACE
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
				allowedSubScopes: COMMAND_SPACE
			},


		{
			name: "forLoop",
			start: /(for)\s*(\([\s\S]*?\))\s*{/,
			startInclusive: true,
			end: /\}/,
			endInclusive: true,
			capturedScopesNames: ["keyComp", "loopSettings"],
			allowedSubScopes: COMMAND_SPACE
		},
			{ name: "loopSettings",},

		{
			name: "whileLoop",
			start: /(while)\s*(\([\s\S]*?\))\s*{/,
			startInclusive: true,
			end: /\}/,
			endInclusive: true,
			capturedScopesNames: ["keyComp", "booleanable"],
			allowedSubScopes: COMMAND_SPACE
		},

			
		{
			name: "command",
			start: /(\S.*?);/,
			capturedScopesNames: ["statement"]
		},

			{
				name: "statement",
				// start:  /^[\s\S]*$/,
				allowedSubScopes: ["fnCall", "equal", "bitLeft", "ptr", "string", "num", "delete", "return"],
			},

				{ name: "operator",},

				{
					name: "fnCall",
					start: /(\w+)(\(.*\))/,
					capturedScopesNames: ["fnName", "args"]
				},

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

				{
					name: "delete",
					start:  /(delete)\s+(\w+)/,
					capturedScopesNames: ["keyComp", "varName"]
				},
				{
					name: "return",
					start:  /(return)\s+([\s\S]*)$/,
					capturedScopesNames: ["keyComp", "statement"]
				},
					

	{
		name: "classDef",
		start: /\b(class)\s+(\w+)\s*(?::(.*?))?\s*{/,
		startInclusive: true,
		end: /\}(?:\s*?;)?/,
		endInclusive: true,
		capturedScopesNames: ["typeDef", "className", "classInheritance"],
		allowedSubScopes: ["privacyDef"]
	},

		{ name: "classKeyword", },
		{ name: "className", },

		{
			name: "classInheritance",
			start: /(public|private|protected)\s+(\w+)/,
			capturedScopesNames: ["classKeyword", "className"]
		},

			{
				name: "privacyDef",
				start: /(public|private|protected)\s*:/,
				startInclusive: true,
				end: /public|private|protected|}/,
				endInclusive: false,
				capturedScopesNames: ["classKeyword"],
				allowedSubScopes: ["classPropertyDef"]
			},

				{
					name: "classPropertyDef",
					start: /([\w~].*?);/,
					capturedScopesNames: ["classProperty"]
				},

				{
					name: "classProperty",
					start: /(?:(virtual)\s+)?(?:([^\s\(]+)\s+)?(?:(\S+\(.*\))|([^\s\(]+))/,
					capturedScopesNames: ["classKeyword", "typeDef", "fnCallDef", "varName"],
				},

	

	{ name: "keyComp", },
	{ name: "keyClass", },
	{ name: "keyVar", },
	{
		name: "num",
		start: /\d+\.?\d*/,
	},
	{
		name: "string",
		start:  /("|'|`)(?:\\\1|.)*?\1/,
		capturedScopesNames: -1
	},

]






















