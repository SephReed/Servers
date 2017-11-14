const fs = require('fs');
const Permeate = require("./Permeate.js");












exports.txtListToRegExpString = function(filePath) {
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

exports.Scope = function(ruleSet, scopeDef) {
	var THIS = this;
	THIS.ruleSet = ruleSet;
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

	THIS.capturingGroupCount = 0;

	if(THIS.start) {
		var regexText = THIS.start.source ? THIS.start.source : THIS.start;
		var subGroupCount = 0;
		for(var i = 0; i < regexText.length; i++) {
			var char = regexText.charAt(i);
			if(char == "\\") 
				i++;

			else if(char == "(" && regexText.charAt(i+1) != "?")
				subGroupCount++;
		}

		THIS.capturingGroupCount = subGroupCount;
		if(subGroupCount > 0 
		&& (THIS.capturedScopesNames === undefined || THIS.capturedScopesNames.length != subGroupCount)
		&& THIS.capturedScopesNames != -1) {
			console.error("Scope Definition has capturing groups, but no scope defined for each", THIS)
			console.error("If you want not capturing groups, use (?:myRegExp).")
			console.error("To stop getting this warning set capturedScopesNames to -1");
		}
	}
}

exports.Scope.prototype.init = function() {
	var THIS = this;
	if(THIS.allowedSubScopes) {
		THIS.subScopes = THIS.allowedSubScopes
		.map((subScopeName) => {
			var addMe = THIS.ruleSet.getScope(subScopeName);
			if(addMe == undefined)
				console.error("bad name for sub scope:", subScopeName);
			return addMe;
		}).filter((subScope) => {
			return subScope != undefined;
		}).sort((a, b)=> {
			return a.priority > b.priority ? -1 : 1;
		})
	}
	if(THIS.capturedScopesNames && THIS.capturedScopesNames != -1) {
		THIS.capturedScopes = [];
		THIS.capturedScopesNames.forEach((captureName) => {
			var target = THIS.ruleSet.getScope(captureName);
			THIS.capturedScopes.push(target);

			if(target === undefined)
				console.error("ERROR: bad name for captured scope", captureName, "in", THIS.name)
		})
	}
	THIS.generateNextMatchRegex();
}

exports.Scope.prototype.generateNextMatchRegex = function() {
	var scope = this;
			
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
}


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


exports.LOOSE_TEXT_SCOPE = new exports.Scope(null, {
	name:"LooseText",
});










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
		
		var scope = new exports.Scope(THIS, scopeDef);

		if(scopeDef == scopeDefs.root)
			THIS.rootScope = scope

		THIS.scopes.all.push(scope);
		THIS.scopes.byID[scope.name] = scope;
	})

	THIS.scopes.all.forEach((scope) => {
		scope.init();
	})
}

exports.RuleSet.prototype.getScope = function(scopeName) {
	return this.scopes.byID[scopeName];
}


exports.RuleSet.prototype.removeBreakingScopes = function(file) {
	var THIS = this;
	file.rawCode = file.rawText;
	file.nonCodeSplices = [];
	if(THIS.anywhereScopes) {
		var scopeTool = new exports.Scope(THIS, {
			name: "breakingScopes",
			allowedSubScopes: THIS.anywhereScopes
		})
		scopeTool.init();

		var totalOffset = 0;

		file.rawCode = file.rawCode.replace(scopeTool.nextMatchRegex, function(){
			var text = arguments[0];
			var index = arguments[arguments.length-2];

			var matchNum = undefined;
			for(var m = 1; matchNum === undefined && m < arguments.length -2; m++) {
				matchNum = arguments[m] !== undefined ? m : undefined;
			}
			var scope = scopeTool.nextMatchGroupNums[matchNum];

			if(scope.name == "string")
				return text;

			file.nonCodeSplices.push({
				scope: scope,
				index: index,
				length: text.length,
				totalOffset: totalOffset
			})
			totalOffset += text.length;

			return '';
		})
	}
}



exports.RuleSet.prototype.reinjectBreakingScopes = function(scopeRoot) {
	var THIS = this;

	scopeRoot.file.nonCodeSplices.forEach((splice) => {
		var codeIndex = splice.index - splice.totalOffset;
		var added = scopeRoot.spawnSubChunk({
			scope: splice.scope,
			startIndex: codeIndex,
			endIndex: codeIndex,

			rawStartIndex: splice.index,
			rawEndIndex: splice.index + splice.length,
			isNonCode: true
		})
		added.scopify();
	})
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
		endIndex: file.rawCode.length,
		scope: THIS.rootScope,
	});
	out.scopify();

	THIS.reinjectBreakingScopes(out);
	return out;
}





























/*********************************************
*
*				Scope Chunk
*
********************************************/


//TODO?: remove startIndex and replace with a check to prevChunk.end or parentChunk.start
exports.ScopeChunk = function(file, scopeInfo) {
	var THIS = this;

	THIS.scopeInfo = scopeInfo;

	//for quick searching
	THIS.subChunks = [];
	THIS.subChunksByName = {};

	THIS.glazedChunks = [];


	THIS.rawStartIndex = scopeInfo.rawStartIndex;
	THIS.rawEndIndex = scopeInfo.rawEndIndex;
	THIS.isNonCode = scopeInfo.isNonCode;
	

	//defined as chunks are added
	THIS.firstSubChunk;
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
		console.error(scopeInfo);
		console.error("ScopeChunk created with no matchID or startIndex in scopeInfo")
	}
		

	if(scopeInfo.endIndex !== undefined) 
		THIS.endIndex = scopeInfo.endIndex;

	else if(THIS.startMatch && THIS.scope.end == undefined) {
		THIS.endIndex = THIS.startMatch.index + THIS.startMatch.text.length;
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

//TODO: find a way to make rawCode and rawText less clunky
exports.ScopeChunk.prototype.scopify = function(fastMode, depth) {
	var THIS = this;

	let scope = THIS.scope,
		rawCode = THIS.file.rawCode,
		indexOffset = THIS.startIndex,
		subScopes = THIS.subScopes,
		nextMatchRegex = THIS.scope.nextMatchRegex;


	var searchableCode = THIS.file.rawCode.substring(indexOffset, THIS.getCharLimit());

	var charStart = 0;


	//special case for when a scope has capturedScopes but no subscopes, and is child
	//to a captured scope.
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
			//
		for(var m = 0; m < matchCaptures.length; m++) {
			var capture = matchCaptures[m];
			var captureScope = scope.capturedScopes[m];

			if(captureScope != undefined && capture !== undefined) {
				var nextIndex = searchableCode.slice(charStart).indexOf(capture)
				if(nextIndex == -1)
					console.error("Could not find", capture, "in", searchableCode)
				nextIndex += charStart;

				var nextScopeInfo = {
					scope: captureScope,
					startMatch: {
						text: capture,
						index: indexOffset + nextIndex 
					}
				}

				var outcome = THIS.spawnSubChunk(nextScopeInfo);
				outcome.scopify();
				charStart = (outcome.endIndex - indexOffset);	
			}			
		}
	}


	//while there are subscopes left to branch into..
	var subScopesLeft = (nextMatchRegex != undefined);
	while(subScopesLeft) {
			//
		nextMatchRegex.lastIndex = charStart;
		var regexMatch = nextMatchRegex.exec(searchableCode);



		if(regexMatch == undefined) {
			// if(scope.name == "comment")
			// 	console.error( scope.name, nextMatchRegex, "ERROR: neither end nor subscopes could be found in", searchableCode);	
			
			subScopesLeft = false;
		}

		else {
			var matchNum = undefined;
			for(var m = 1; matchNum === undefined && m < regexMatch.length; m++) {
				matchNum = regexMatch[m] !== undefined ? m : undefined;
			}
			let matchScope = scope.nextMatchGroupNums[matchNum];

			
			if(matchScope == -1) { // && scope.end) {
				subScopesLeft = false;
				THIS.endIndex = indexOffset + regexMatch.index;
				if(scope.endInclusive)
					THIS.endIndex += regexMatch[0].length;
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

				var outcome = THIS.spawnSubChunk(nextScopeInfo);
				outcome.scopify();
				charStart = (outcome.endIndex - indexOffset);
			}
		}
	}
	
	if(THIS.endIndex == -1) {
		console.error("unset endIndex: defaulting to charLimit")
		THIS.endIndex = THIS.getCharLimit();	
	}
	
	if(charStart > 0)
		THIS.spawnLooseTextChunk(indexOffset+charStart, THIS.endIndex)
	
	if(THIS.glazedChunks.length == 0)
		THIS.complete();
}












exports.ScopeChunk.prototype.spawnLooseTextChunk = function(start, end) {
	if(start <= end) {
		return this.spawnSubChunk({
			scope: exports.LOOSE_TEXT_SCOPE,
			startIndex: start,
			endIndex: end
		});
	}
}




exports.ScopeChunk.prototype.spawnSubChunk = function(scopeInfoOrChunk, isChunk) {
	var THIS = this;
	var addMe = isChunk ? scopeInfoOrChunk : new exports.ScopeChunk(THIS.file, scopeInfoOrChunk);

	//Automatically add any loose text up to this new chunk
	if((THIS.lastSubChunk == undefined && addMe.startIndex > THIS.startIndex) 
	|| (THIS.lastSubChunk && THIS.lastSubChunk.endIndex < addMe.startIndex)) {
		var start = THIS.lastSubChunk != undefined ? THIS.lastSubChunk.endIndex : THIS.startIndex;
		THIS.spawnLooseTextChunk(start, addMe.startIndex);
	} 


	//If chunk is being appended, simply append
	if(THIS.lastSubChunk == undefined || THIS.lastSubChunk.endIndex == addMe.startIndex) {
		THIS.appendSubChunk(addMe);

		//for cases where this chunk is being added to something which once had no loose text
		//and has already completed being scoperized
		if(THIS.isComplete && addMe.endIndex < THIS.endIndex)
			THIS.spawnLooseTextChunk(addMe.endIndex, THIS.endIndex);

		return addMe;
	}

	//If chunk is being injected, more work is needed
	//find the chunk that it starts in
	var targetChunk;
	for(var ptr = THIS.firstSubChunk; ptr != undefined; ptr = ptr.nextChunk) {
		if(ptr.startIndex <= addMe.startIndex) 
			targetChunk = ptr;
		else break;
	}

	if(targetChunk == undefined)
		console.error("targetChunk Somehow undefined", THIS.firstSubChunk.startIndex, addMe.startIndex, THIS.firstSubChunk.scope.name)

	//if the added chunk can fit in the current one, do so
	//if not, error below
	if(targetChunk.endIndex >= addMe.endIndex) {

		//if the current chunk is a loose text one, split it into parts
		//and insert the new chunk in the middle
		if(targetChunk.scope == exports.LOOSE_TEXT_SCOPE) {
			var insertAfter = targetChunk.prevChunk;

			targetChunk.removeSelfFromParent();
			if(targetChunk.startIndex < addMe.startIndex) {
				var pre = new exports.ScopeChunk(THIS.file, {
					scope: exports.LOOSE_TEXT_SCOPE,
					startIndex: targetChunk.startIndex,
					endIndex: addMe.startIndex
				})
				THIS.insertSubChunkAfter(pre, insertAfter);
				insertAfter = pre;
			}

			THIS.insertSubChunkAfter(addMe, insertAfter);
			insertAfter = addMe;


			if(targetChunk.endIndex > addMe.endIndex) {
				var post = new exports.ScopeChunk(THIS.file, {
					scope: exports.LOOSE_TEXT_SCOPE,
					startIndex: addMe.endIndex,
					endIndex: targetChunk.endIndex
				})
				THIS.insertSubChunkAfter(post, insertAfter);
			}

			return addMe;
		}
		// else return;
		//otherwise, sprout into it, passing along the premade chunk
		else return targetChunk.spawnSubChunk(addMe, true);
	}

	console.error("can not insert chunk which overlaps other chunk boundaries", ptr.startIndex, ptr.endIndex, addMe.startIndex, addMe.endIndex);
	
}



exports.ScopeChunk.prototype.appendSubChunk = function(addMe) {
	return this.insertSubChunkAfter(addMe, -1);
}


exports.ScopeChunk.prototype.insertSubChunkAfter = function(addMe, prevChunk) {
	var THIS = this;


	if(prevChunk && prevChunk != -1 && prevChunk.parentChunk != THIS) {
		console.error("can not insert after non child", THIS, prevChunk)
		return;
	}

	addMe.removeSelfFromParent();
	addMe.parentChunk = THIS;

	//Add chunk to list
	if(prevChunk == -1 || prevChunk == THIS.lastSubChunk)
		THIS.subChunks.push(addMe);

	else 
		THIS.subChunks.splice(THIS.subChunks.indexOf(prevChunk) + 1, 0, addMe);



	//Add to chunks by name
	var scopeName = THIS.file != "TEST_MODE" ? addMe.scope.name : "testScope";
	if(THIS.subChunksByName[scopeName] == undefined)
		THIS.subChunksByName[scopeName] = [];

	var byName = THIS.subChunksByName[scopeName];
	if(prevChunk == -1 || prevChunk == THIS.lastSubChunk || byName.length == 0) 
		byName.push(addMe);

	else {
		var targetIndex = byName.findIndex((sub) => {
			return sub.startIndex > addMe.startIndex;
		});
		if(targetIndex != -1)
			byName.splice(targetIndex, 0, addMe)
		else
			byName.push(addMe);
	}


	//special cases for prev chunk,
	//undefined means at beginning
	//-1 means at end
	//otherwise stitch into center
	if(prevChunk == undefined) {
		if(THIS.firstSubChunk) {
			addMe.nextChunk = THIS.firstSubChunk;
			addMe.nextChunk.prevChunk = addMe;
		}
		THIS.firstSubChunk = addMe;
		THIS.lastSubChunk = THIS.lastSubChunk || addMe;
	}
	else if(prevChunk == -1 || prevChunk == THIS.lastSubChunk) {
		if(THIS.lastSubChunk) {
			addMe.prevChunk = THIS.lastSubChunk;
			addMe.prevChunk.nextChunk = addMe;
		}
		THIS.lastSubChunk = addMe;
		THIS.firstSubChunk = THIS.firstSubChunk || addMe;
	}
	else {
		if(prevChunk.nextChunk != undefined) {
			addMe.nextChunk = prevChunk.nextChunk;
			addMe.nextChunk.prevChunk = addMe;
		}

		prevChunk.nextChunk = addMe;
		addMe.prevChunk = prevChunk;
	}
}


exports.ScopeChunk.prototype.removeSelfFromParent = function() {
	if(this.parentChunk)
		this.parentChunk.removeSubChunk(this);
}

exports.ScopeChunk.prototype.removeSubChunk = function(target) {
	var THIS = this; 

	if(target == undefined)
		return;

	else if(target.parentChunk != THIS) {
		console.error("can't remove chunk that is not a sub")
		return;
	}

	if(target == THIS.firstSubChunk)
		THIS.firstSubChunk = target.nextChunk;

	if(target == THIS.lastSubChunk)
		THIS.lastSubChunk = target.prevChunk;

	var scopeName = THIS.file != "TEST_MODE" ? target.scope.name : "testScope";
	var byName = THIS.subChunksByName[scopeName];
	if(byName) {
		var targetIndex = byName.indexOf(target);
		if(targetIndex != -1) 
			byName.splice(targetIndex, 1);

		else console.error("removing sub chunk not found in byName")
	}	

	var targetIndex = THIS.subChunks.indexOf(target);
	if(targetIndex > -1)
		THIS.subChunks.splice(targetIndex, 1);
	else {
		console.error("could not find target in subChunks list", target)
		console.error(THIS.subChunks.map((sub)=>{return sub.startIndex + ' ' + sub.scope.name}));
	}

	if(target.nextChunk)
		target.nextChunk.prevChunk = target.prevChunk;

	if(target.prevChunk)
		target.prevChunk.nextChunk = target.nextChunk;

	target.parentChunk = undefined;
}









/********************************
*    GETTERS / SETTERS
*********************************/


exports.ScopeChunk.prototype.getRawCode = function() {
	return this.rawCode ? this.rawCode 
		: (this.rawCode = this.file.rawCode.substring(this.startIndex, this.endIndex));
}


exports.ScopeChunk.prototype.getRawText = function() {
	return this.rawText ? this.rawText 
		: (this.rawText = this.file.rawText.substring(this.getRawStartIndex(), this.getRawEndIndex()));
}

exports.ScopeChunk.prototype.getRawStartIndex = function() {
	return this.rawStartIndex !== undefined ? this.rawStartIndex 
		: (this.rawStartIndex = this.getRawRelativeCodeIndex(this.startIndex));
}

exports.ScopeChunk.prototype.getRawEndIndex = function() {
	return this.rawEndIndex !== undefined ? this.rawEndIndex 
		: (this.rawEndIndex = this.getRawRelativeCodeIndex(this.endIndex));
}

exports.ScopeChunk.prototype.getRawRelativeCodeIndex = function(codeIndex) {
	var THIS = this;
	var out = codeIndex;

	var splices = THIS.file.nonCodeSplices;
	var target = -1 + splices.find((splice) => {
		return splice.index - splice.totalOffset > codeIndex;
	})

	if(target >= 0)
		out += splices[target].totalOffset;

	return out;
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

		for(var c = 0; c < currentScopeChunks.length && matchLimitHit == false; c++) {
			var limit = isTargetDepth ? matchLimit - allMatches.length : undefined;

			var args = {
				startAfter: null,
				shallowSearch: isShallow,
				limit: limit
			}

			var matches = currentScopeChunks[c].getSubsOfName(target, args);

			if(isTargetDepth) {
				allMatches = allMatches.concat(matches);
				matchLimitHit = allMatches.length >= matchLimit;
			}
			else nextScopeChunks = nextScopeChunks.concat(matches);
		}
		currentScopeChunks = nextScopeChunks;
	}

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

	var atMatchLimit = function() {
		return args.matchLimit !== undefined && args.matches.length >= args.matchLimit-1;
	}


	if(subsOfName && subsOfName.length) {
		if(args.startAfter) {
			var startIndex = subsOfName.indexOf(args.startAfter);
			if(startIndex != -1) {
				for(var i = startIndex + 1; i > -1 && i < subsOfName.length; i++) {
					args.matches.push(subsOfName[i]);
					if(atMatchLimit())
						break;
				}
			}
		}
		else {
			for(var i = 0; i < subsOfName.length; i++) {
				args.matches.push(subsOfName[i]);
				if(atMatchLimit())
					break;
			}
		} 
	}
	else if(subScopeName == "*") {
		for(var sub = THIS.firstSubChunk; sub != undefined; sub = sub.nextChunk) {
			args.matches.push(sub);
			if(atMatchLimit())
				break;
		}
	} 
}



exports.ScopeChunk.prototype.hardSubNameSearch = function(subScopeName, args) {
	var THIS = this;
	var matches = args.matches;
	var startAt = args.startAfter ? args.startAfter.nextChunk : THIS.firstSubChunk;

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


















