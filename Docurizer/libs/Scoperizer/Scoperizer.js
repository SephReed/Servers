const fs = require('fs');
const Permeate = require("./Permeate.js");















exports.txtListToRegExpString = function(filePath) {
	console.log();

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











/*********************************************
*
*				Scope Chunk
*
********************************************/

exports.Scope = function(scopeDef) {
	var THIS = this;
	THIS.eventListeners = {};
	
	for(attName in scopeDef)
		THIS[attName] = scopeDef[attName];

	if(THIS.end == undefined)
		THIS.startInclusive = true;

	if(THIS.allowedSubScopes !== undefined) {
		for(var i = 0; i < THIS.allowedSubScopes.length; i++){
			var subScopeNameOrList = THIS.allowedSubScopes[i];
			if(typeof subScopeNameOrList == "object") {
				THIS.allowedSubScopes.splice(i, 1);
				i--;

				subScopeNameOrList.forEach((subScopeName) => {
					THIS.allowedSubScopes.push(subScopeName);
				})
			}
		};
	}
}



exports.LOOSE_TEXT_SCOPE = new exports.Scope({
	name:"LooseText",
	subScopes: [],
	potentialSubScopes: [],
});


exports.Scope.prototype.on = function(eventName, fn) {
	var THIS = this;
	if(THIS.eventListeners[eventName] == undefined)
		THIS.eventListeners[eventName] = [];

	THIS.eventListeners[eventName].push(fn);
}

exports.Scope.prototype.removeEventListener = function(eventName, fn) {
	var THIS = this;
	if(THIS.eventListeners[eventName] == undefined)
		return;

	var target = THIS.eventListeners[eventName].indexOf(fn);
	if(target != -1)
		return THIS.eventListeners[eventName].splice(target, 1);
}









/******************************************
*
*		Rule Set (for each language)
*
*****************************************/
exports.RuleSet = function(scopeDefs) {
	var THIS = this;
	THIS.name = scopeDefs.name;
	THIS.anywhereScopes = scopeDefs.anywhereScopes;
	THIS.scopes = {};
	THIS.scopes.all = [];
	THIS.scopes.byID = {};

	scopeDefs.list.forEach(function(scopeDef, index) {

		scopeDef.priority = scopeDefs.list.length - index;
		scopeDef.startID = 2*index;
		scopeDef.endID = scopeDef.startID + 1;
		scopeDef.capturingGroupCount = 0;

		if(scopeDef.start) {
			var regexText = scopeDef.start.source ? scopeDef.start.source : scopeDef.start;
			var subGroupCount = 0;
			for(var i = 0; i < regexText.length; i++) {
				var char = regexText.charAt(i);
				if(char == "\\") 
					i++;

				else if(char == "(" && regexText.charAt(i+1) != "?")
					subGroupCount++;
			}

			scopeDef.capturingGroupCount = subGroupCount;
			if(subGroupCount > 0 
			&& (scopeDef.capturedScopesNames === undefined || scopeDef.capturedScopesNames.length != subGroupCount))
				console.error("Scope Definition has capturing groups, but no scope defined for each", scopeDef, " if you want not capturing groups, look those up.");
		}

		

		var scope = new exports.Scope(scopeDef);

		if(scopeDef == scopeDefs.root)
			THIS.rootScope = scope

		THIS.scopes.all.push(scope);
		THIS.scopes.byID[scope.name] = scope;
	})

	THIS.scopes.all.forEach((scope) => {
		if(scope.allowedSubScopes) {
			scope.subScopes = scope.allowedSubScopes
			.map((subScopeName) => {
				var addMe = THIS.scopes.byID[subScopeName];
				if(addMe == undefined)
					console.error("bad name for sub scope:", subScopeName);
				return addMe;
			}).filter((subScope) => {
				return subScope != undefined;
			}).sort((a, b)=> {
				return a.priority > b.priority ? -1 : 1;
			})
		}
	})

	// THIS.computeSubScopes();
	THIS.computeCaptureScopes();
}

exports.RuleSet.prototype.getScope = function(scopeName) {
	return this.scopes.byID[scopeName];
}

exports.RuleSet.prototype.computeCaptureScopes = function() {
	var THIS = this;
	THIS.scopes.all.forEach((scope) => {
		if(scope.capturedScopesNames) {
			scope.capturedScopes = [];
			scope.capturedScopesNames.forEach((captureName) => {
				var target = THIS.scopes.byID[captureName];
				scope.capturedScopes.push(target);

				if(target === undefined)
					console.error("ERROR: bad name for captured scope", captureName, "in", scope.name)
			})
		}


		
		
		if(scope.end || (scope.subScopes && scope.subScopes.length)) {
			var subsRegexString = "";
			var groupNumOffset = 1;

			scope.nextMatchGroupNums = {};
			if(scope.end && scope.end != -1) {
				subsRegexString += `(`+(scope.end.source ? scope.end.source : scope.end) +`)`;
				scope.nextMatchGroupNums[groupNumOffset] = -1;
				groupNumOffset++;
			}

			if(scope.subScopes) {
				scope.subScopes.forEach((sub)=> {
					if(subsRegexString.length)
						subsRegexString += '|'

					var source = (sub.start.source ? sub.start.source : sub.start);
					source = source.replace(/\\(\d+)/g, (replaceMe, groupNum) => {
						groupNum = parseInt(groupNum) + groupNumOffset;
						console.log("REPLACE", replaceMe);
						return "\\"+groupNum;
					})

					subsRegexString += `(`+ source + `)`;
					scope.nextMatchGroupNums[groupNumOffset] = sub;
					groupNumOffset += sub.capturingGroupCount + 1;
				});
			}

			if(scope.end == -1) {
				if(subsRegexString.length)
					subsRegexString += '|';
				subsRegexString += `([\\S\\s])`;
				scope.nextMatchGroupNums[groupNumOffset] = -1;
			}

			if(subsRegexString.length)
				scope.nextMatchRegex = new RegExp(subsRegexString, 'g');
		}

		// console.log(scope);
		
	})
}




exports.RuleSet.prototype.removeBreakingScopes = function(file) {
	var THIS = this;
	file.rawCode = file.rawText;
	if(THIS.anywhereScopes) {
		THIS.anywhereScopes.forEach((scope) => {
			file.rawCode = file.rawCode.replace(new RegExp(scope.start, 'g'), (text, index) => {
				return '';
			});
		});
	}
}




//TODO: create special case for when non-inclusive starts end on or after charStart
//TODO: progress regexs which don't fall into a scope to after the scope
//TODO: get rid of match IDs, just pass on recent regex matches
//continue to record matches by start position
//find a way to make regexs not search passed a known start position
//TODO: create an attribute for scopes which can interfere with the current ones end

//use depthMode for cases where read through / skip is effecient
exports.RuleSet.prototype.scopify = function(file) {
	var THIS = this;

	if(file.rawCode === undefined)
		THIS.removeBreakingScopes(file);

	var out = new exports.ScopeChunk(file, {
		startIndex: 0,
		endIndex: file.rawCode.length-1,
		scope: THIS.rootScope,
	});
	out.scopify();
	return out;
}





























/*********************************************
*
*				Scope Chunk
*
********************************************/



exports.ScopeChunk = function(file, scopeInfo) {
	var THIS = this;

	THIS.scopeInfo = scopeInfo;

	THIS.subChunks = [];
	THIS.glazedChunks = [];
	THIS.subChunksByName = {};
	THIS.lastSubChunk;
	THIS.parentChunk;
	THIS.prevChunk;
	THIS.nextChunk;

	//special case for making test scopes without any real data
	THIS.file = file;
	if(file == "TEST_MODE")
		return;

	THIS.scope = scopeInfo.scope;


	if(scopeInfo.startMatch !== undefined) {	
		THIS.startMatch = scopeInfo.startMatch;
		THIS.startIndex = THIS.startMatch.index;

		if(THIS.scope.startInclusive != true)
			THIS.startIndex += THIS.startMatch.text.length;
	}
	else if(scopeInfo.startIndex !== undefined)
		THIS.startIndex = scopeInfo.startIndex;
	else {
		console.log(scopeInfo);
		console.error("ScopeChunk created with no matchID or startIndex in scopeInfo")
	}
		

	if(scopeInfo.endIndex !== undefined) 
		THIS.endIndex = scopeInfo.endIndex;

	else if(THIS.startMatch && THIS.scope.end == undefined) {
		THIS.endIndex = THIS.startMatch.index + THIS.startMatch.text.length - 1;
	}
}


exports.ScopeChunk.prototype.getCharLimit = function() {
	if(this.endIndex !== undefined)
		return this.endIndex;

	if(this.parentChunk !== undefined) 
		return this.parentChunk.getCharLimit();
}










/******************************************
*
*		ScopeChunk - scopify!!!!
*
*****************************************/


exports.ScopeChunk.prototype.scopify = function(fastMode, depth) {
	var THIS = this;



	let scope = THIS.scope,
		rawCode = THIS.file.rawCode,
		indexOffset = THIS.startIndex,
		subScopes = THIS.subScopes,
		nextMatchRegex = THIS.scope.nextMatchRegex;

	console.log(scope.name, THIS.endIndex, THIS.startMatch, scope.end);


	var searchableCode = THIS.file.rawCode.substring(indexOffset, THIS.getCharLimit()+1);
	var charStart = 0;


	var addLooseText = function(endIndex){
		if(charStart <= endIndex) {
			THIS.spawnSubChunk({
				scope: exports.LOOSE_TEXT_SCOPE,
				startIndex: indexOffset+charStart,
				endIndex: indexOffset+endIndex
			});
			charStart = endIndex+1;
		}
	}


	var matchCaptures = THIS.scopeInfo.matchCaptures;
	if(scope.capturedScopes != undefined && matchCaptures == undefined && scope.start) {
		if(THIS.startRegex == undefined)
			THIS.startRegex = new RegExp(scope.start, 'g');

		THIS.startRegex.lastIndex = 0;
		var regexMatch = THIS.startRegex.exec(searchableCode);

		if(regexMatch) {
			matchCaptures = [];
			for(var m = 1; m < regexMatch.length; m++) 
				matchCaptures.push(regexMatch[m]);
		}
	}


	if(matchCaptures && scope.capturedScopes != undefined) {

		console.log(matchCaptures);
			//
		for(var m = 0; m < matchCaptures.length; m++) {
			var capture = matchCaptures[m];

			console.log(matchCaptures, scope.name);
			var captureScope = scope.capturedScopes[m];

			if(captureScope != undefined) {
				// console.log(searchableCode.slice(charStart), capture);

				var nextIndex = searchableCode.slice(charStart).indexOf(capture)
				if(nextIndex == -1)
					console.error("Could not find")
				nextIndex += charStart;

				var nextScopeInfo = {
					scope: captureScope,
					startMatch: {
						text: capture,
						index: indexOffset + nextIndex 
					}
				}
					
				addLooseText(nextIndex-1);

				console.log(nextScopeInfo);
				var outcome = THIS.spawnSubChunk(nextScopeInfo);
				outcome.scopify();
				charStart = (outcome.endIndex - indexOffset) +1;	
			}			
		}
	}

	console.log(scope.name, scope.subScopes);


	//while there are subscopes left to branch into..
	var subScopesLeft = (nextMatchRegex != undefined);
	while(subScopesLeft) {

		// console.log(THIS.scope.name, scope.subScopes.length)
			//
		nextMatchRegex.lastIndex = charStart;
		var regexMatch = nextMatchRegex.exec(searchableCode);

		if(regexMatch == undefined) {
			console.error("ERROR: neither end nor subscopes could be found", searchableCode.substr(charStart, 16));

			subScopesLeft = false;
		}

		else {
			var matchNum = undefined;
			for(var m = 1; matchNum === undefined && m < regexMatch.length; m++) {
				console.log(m, regexMatch[m])
				matchNum = regexMatch[m] !== undefined ? m : undefined;
			}
			let matchScope = scope.nextMatchGroupNums[matchNum];
			console.log("match", matchNum, regexMatch, nextMatchRegex.source);


			
			if(matchScope == -1) { // && scope.end) {
				console.log("IS END")
				subScopesLeft = false;
				THIS.endIndex = indexOffset + regexMatch.index;
			}
			else {
				let matchCaptures;
				for(let sm = 0; sm < matchScope.capturingGroupCount; sm++) {
					matchCaptures = matchCaptures || [];
					matchCaptures.push(regexMatch[matchNum+sm+1]);
				}
				
				var nextScopeInfo = {
					scope: matchScope,
					startMatch: {
						text: regexMatch[0],
						index: regexMatch.index + indexOffset
					}
				}

				if(matchCaptures)
					nextScopeInfo.matchCaptures = matchCaptures;

				var startIndex = regexMatch.index;
				if(matchScope.startInclusive != true)
					startIndex += regexMatch[0].length;

					
				addLooseText(startIndex-1);

				console.log(nextScopeInfo.scope.name)

				var outcome = THIS.spawnSubChunk(nextScopeInfo);
				outcome.scopify();
				charStart = (outcome.endIndex - indexOffset) +1;
				console.log(outcome.endIndex, indexOffset, charStart);
			}
		}
	}
	
		
	
	if(charStart > 0)
		addLooseText(THIS.endIndex - indexOffset);
	
	if(THIS.glazedChunks.length == 0)
		THIS.complete();

}









exports.ScopeChunk.prototype.spawnSubChunk = function(scopeInfo) {
	var THIS = this;
	var addMe = new exports.ScopeChunk(THIS.file, scopeInfo);
	THIS.appendSubChunk(addMe);
	return addMe;
}



exports.ScopeChunk.prototype.appendSubChunk = function(addMe) {
	var THIS = this;

	// addMe.removeSelfFromParent();
	addMe.parentChunk = THIS;

	THIS.subChunks.push(addMe);
	var scopeName = THIS.file != "TEST_MODE" ? addMe.scope.name : "testScope";
	if(THIS.subChunksByName[scopeName] == undefined)
		THIS.subChunksByName[scopeName] = [];

	THIS.subChunksByName[scopeName].push(addMe);

	if(THIS.lastSubChunk != undefined){
		THIS.lastSubChunk.nextChunk = addMe;
		addMe.prevChunk = THIS.lastSubChunk;
	}
	THIS.lastSubChunk = addMe;
}



/********************************
*    GETTERS / SETTERS
*********************************/


// exports.ScopeChunk.prototype.setCurrentEndMatch = function(endMatch) {
// 	var THIS = this;
// 	THIS.endMatch = endMatch;
// 	THIS.endIndex = endMatch.index - 1;

// 	if(THIS.scope.endInclusive)
// 		THIS.endIndex += endMatch.text.length;
// }



exports.ScopeChunk.prototype.getRawTextReal = function() {
	var THIS = this;
	if(THIS.rawText == undefined)
		THIS.rawText = THIS.file.rawText.substring(THIS.startIndex, THIS.endIndex+1);

	return THIS.rawText;
}




exports.ScopeChunk.prototype.getRawText = function() {
	var THIS = this;
	if(THIS.rawCode == undefined)
		THIS.rawCode = THIS.file.rawCode.substring(THIS.startIndex, THIS.endIndex+1);

	return THIS.rawCode;
}





/********************************
*    EVENT STUFF
*********************************/

exports.ScopeChunk.prototype.dispatchScopeEvent = function(eventName, args) {
	var THIS = this;
	if(THIS.scope.eventListeners == undefined)
		return;

	var listeners = THIS.scope.eventListeners[eventName];

	if(listeners) {
		listeners.forEach((listenFn) => {
			listenFn(THIS, args);
		})
	}	
}


exports.ScopeChunk.prototype.complete = function() {
	var THIS = this;
	if(THIS.isComplete != true) {
		THIS.isComplete = true;	
		THIS.dispatchScopeEvent("complete");
	}
}









/********************************
*    NAVIGATION STUFF
*********************************/

exports.ScopeChunk.prototype.getFirstSub = function(searchString, startAfter) {
	return this.getSubs(searchString, startAfter, 1)[0];
}

//TODO: make recursive
exports.ScopeChunk.prototype.getSubs = function(searchString, startAfter, matchLimit) {
	var THIS = this;
	var allMatches = [];
	var matchLimitHit = allMatches.length >= matchLimit;
	
	var matchArgs = searchString.match(/\w+|>/g);
	
	var currentScopeChunks = [THIS];
	for(var i = 0; i < matchArgs.length && matchLimitHit == false; i++) {
		var target = matchArgs[i], 
			isShallow = false;
		if(target == ">") {
			i++;
			target = matchArgs[i];
			isShallow = true;
		}

		var isTargetDepth = i >= matchArgs.length -1;
		var nextScopeChunks = [];

		// console.log(target, shallow);
		for(var c = 0; c < currentScopeChunks.length && matchLimitHit == false; c++) {
			var limit = isTargetDepth ? matchLimit - allMatches.length : undefined;

			var args = {
				startAfter: null,
				shallowSearch: isShallow,
				limit: limit
			}

			var matches = currentScopeChunks[c].getSubsOfName(target, args);
			// console.log(matches);

			if(isTargetDepth) {
				allMatches = allMatches.concat(matches);
				matchLimitHit = allMatches.length >= matchLimit;
			}
			else nextScopeChunks = nextScopeChunks.concat(matches);
		}
		currentScopeChunks = nextScopeChunks;
	}

	// console.log(allMatches);
	return allMatches;
}

exports.ScopeChunk.prototype.contains = function(subChunk) {
	var THIS = this;
	for(var ptr = subChunk ? subChunk.parentChunk : undefined; ptr != undefined; ptr = ptr.parentChunk) {
		if(ptr == THIS)
			return true;
	}
	return false;
}

exports.ScopeChunk.prototype.getFirstChildSubOfName = function(subScopeName, startAfter) {
	return this.getFirstSubOfName(subScopeName, startAfter, true, 1);
}

exports.ScopeChunk.prototype.getFirstSubOfName = function(subScopeName, startAfter, shallowSearch) {
	return this.getSubsOfName(subScopeName, {startAfter: startAfter, shallowSearch: shallowSearch, limit: 1})[0];
}

exports.ScopeChunk.prototype.getSubsOfName = function(subScopeName, args) {
	var THIS = this;
	args.matches = [];

	if(args.startAfter && args.startAfter.parentChunk != THIS) {
		console.error("can not startAfter chunk that is not subChunk");
		return undefined;
	}
	
	//an efficiency used when not doing deep searches, always use ">" when possible
	if(args.shallowSearch && (args.startAfter == undefined || args.startAfter.chunk.name == subScopeName)) 
		THIS.fastShallowSubNameSearch(subScopeName, args);	
	else 
		THIS.hardSubNameSearch(subScopeName, args);
	

	return args.matches;
}



exports.ScopeChunk.prototype.fastShallowSubNameSearch = function(subScopeName, args) {
	var THIS = this;
	var subsOfName = THIS.subChunksByName[subScopeName];
	if(subsOfName && subsOfName.length) {
		if(args.startAfter) {
			var startIndex = subsOfName.indexOf(args.startAfter);
			if(startIndex != -1) {
				for(var i = startIndex + 1; i > -1 && i < subsOfName.length; i++) {
					args.matches.push(subsOfName[i]);
					if(args.matchLimit !== undefined && args.matches.length >= args.matchLimit-1)
						break;
				}
			}
		}
		else {
			subsOfName.forEach((sub) => {
				args.matches.push(sub);
			})
		} 
	}
	else if(subScopeName == "*") {
		THIS.subChunks.forEach((sub) => {
			args.matches.push(sub);
		})
	} 
}



exports.ScopeChunk.prototype.hardSubNameSearch = function(subScopeName, args) {
	var THIS = this;
	var matches = args.matches;
	var startAt = args.startAfter ? args.startAfter.nextChunk : THIS.subChunks[0];

	args.startAfter = undefined;

	for(let ptr = startAt; ptr !== undefined;){
		if(args.matchLimit !== undefined && args.matches.length >= args.matchLimit-1)
			break;

		if(ptr.scope.name == subScopeName || subScopeName == "*")
			matches.push(ptr);

		if(args.shallowSearch !== true)
			ptr.hardSubNameSearch(subScopeName, args);

		ptr = ptr.nextChunk;
	}
}





/********************************
*    PERMEATE
*********************************/



//@args.initFn - A function to happen on each finding of a node
//@args.postSubsFn - A function to happen after being called for all the children
//@args.breadthFirst - boolean
exports.ScopeChunk.prototype.permeate = function(args) {
	var THIS = this;
	args.childListName = "subChunks";
	args.postChildrenFn = args.postSubsFn;
	return Permeate.from(THIS, args);
}

















/********************************
*    RegExpHelper
*********************************/

exports.RegExpHelper = function(regExpStringOrObj) {
	var regexString;
	if(typeof regExpStringOrObj == "object")
		regexString = regExpStringOrObj.source;

	else regexString = regExpStringOrObj;

	regexString = `(`+regexString+`)|\\n|.`;
}


















