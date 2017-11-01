const fs = require('fs');















var HAPI;



exports.setScopesDef = function(scopesDef) {
	HAPI = scopesDef;
}


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










/******************************************
*
*		Main Parser
*
*****************************************/
exports.RuleSet = function(scopeDefs) {
	var THIS = this;
	THIS.scopes = {};
	THIS.scopes.all = [];
	THIS.scopes.byID = {};

	scopeDefs.list.forEach(function(scopeDef, index) {

		scopeDef.priority = scopeDefs.list.length - index;
		var scope = new exports.Scope(scopeDef);

		if(scopeDef == scopeDefs.root)
			THIS.rootScope = scope

		THIS.scopes.all.push(scope);
		THIS.scopes.byID[scope.name] = scope;
	})

	THIS.computeSubScopes();
}

exports.RuleSet.prototype.getScope = function(scopeName) {
	return this.scopes.byID[scopeName];
}

exports.RuleSet.prototype.computeSubScopes = function(scope) {
	var THIS = this;
	scope = scope || THIS.rootScope;
	var out = [];
	if(scope.allowedSubScopes) {
		scope.subScopes = scope.allowedSubScopes
		.map((subScopeName) => {
			var addMe = THIS.scopes.byID[subScopeName];
			if(addMe == undefined)
				console.error("bad name for sub scope:", subScopeName);
			return addMe;
		}).filter((subScope) => {
			return subScope != undefined;
		})

		scope.subScopes.forEach((item) => {out.push(item.name)});

		scope.subScopes.filter((subScope) => {
			return subScope != scope;
		}).map(function(subScope){
			// console.log(subScope);
			return THIS.computeSubScopes(subScope);
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




//TODO: create special case for when non-inclusive starts end on or after charStart
//TODO: progress regexs which don't fall into a scope to after the scope
//TODO: get rid of match IDs, just pass on recent regex matches
//continue to record matches by start position
//find a way to make regexs not search passed a known start position
//TODO: create an attribute for scopes which can interfere with the current ones end

//use depthMode for cases where read through / skip is effecient
exports.RuleSet.prototype.scopify = function(file, scopeInfo) {
	var THIS = this;

	scopeInfo = scopeInfo || {
		startIndex: 0,
		endIndex: file.rawText.length-1,
		scope: THIS.rootScope,
	}

	//variable to be returned at end
	var scopeChunk = new exports.ScopeChunk(file, scopeInfo);
	if(scopeInfo.parentChunk)
		scopeInfo.parentChunk.appendSubChunk(scopeChunk);
	
	//allRegexs variable keeps track of shared info for file
	//regarding the locations of all matching scope starts and ends
	var allRegexs = file.allRegexs;

	var thisScope = scopeChunk.scope;


	// if(thisScope.name == "block") {
	// 	console.log("BLOCK", file.rawText.substr(scopeChunk.startIndex, 14));
	// 	console.log(thisScope.subScopes);
	// }

	//special case for matches that contain no sub space (ie. keywords, end after the match start)
	var startMatch = scopeChunk.startMatch;
	if(startMatch && thisScope.end == undefined) {
		// var text = pointMatch.text;
		// scopeChunk.html = "<"+thisScope.name+">"+text+"</"+thisScope.name+">";
		scopeChunk.endIndex = startMatch.index + startMatch.text.length - 1;
		scopeChunk.complete();
		return scopeChunk;
	}


	var rawText = file.rawText,
		startMatchPointIDs = scopeChunk.startMatchPointIDs,
		endMatchPointIDs = scopeChunk.endMatchPointIDs,
		charStart = scopeChunk.startIndex,
		subScopes = thisScope.subScopes;



	var addLooseText = function(endIndex){
		// charStart = Math.max(charStart, scopeChunk.startIndex);
		
		if(charStart <= endIndex) {
			var looseTextChunk = new exports.ScopeChunk(file, {
				parentChunk: scopeChunk,
				scope: exports.LOOSE_TEXT_SCOPE,
				startIndex: charStart,
				endIndex: endIndex
			});
			scopeChunk.appendSubChunk(looseTextChunk);
			// scopeChunk.subChunks.push({
			// 	file: file,
			// 	startIndex: charStart,
			// 	endIndex: endIndex-1,
			// })
			charStart = endIndex+1;
		}
	}

	var progressMatchPointID = function(name, matchPointIDs, regex, targetIndex, indexIsEnd) {
		if(targetIndex === undefined)
			targetIndex = charStart;

		//first asserts that all matches up to some index have been found
		//then iterates forward searching for a match beyond the current targetIndex

		var stopLoop;
		while(stopLoop !== true) {
			var matchID = matchPointIDs[name] || 0;

			while(matchID > regex.matchPoints.length-1) {
				if(regex.complete !== true) {
					var matches = regex.exec(rawText);
					
					if(matches == null){
						regex.complete = true;
						
					}

					else {
						regex.matchPoints.push({
							text: matches[0],
							index: matches.index
						});
					}
				}
				else matchID = -1;
			}

			var noMatchesLeft = matchID == -1,
				indexReachableFromTarget = false;

			if(noMatchesLeft == false) {
				var match = regex.matchPoints[matchID];
				var index = indexIsEnd == true ? match.index + match.text.length-1 : match.index;
				indexReachableFromTarget = index >= targetIndex;

				// if(indexIsEnd && thisScope.name == "fnDef") {
				// 	console.log(rawText.substr(targetIndex, 24));
				// 	console.log(targetIndex, match, indexReachableFromTarget);
				// }
			}

			stopLoop = noMatchesLeft || indexReachableFromTarget;

			matchPointIDs[name] = matchID;
			if(stopLoop == false)
				matchPointIDs[name]++;
		}
	}


	//if this scope is not root (terminates at end of file), make sure its potential end position is known
	//pontential end of scope will be moved if a subscope contains it
	//ie. bracket in bracket {{ match on loop 1-->} match on loop 2-->}
	var progressEndMatchPointID = function(soonestIndex, indexIsEnd) {
		if(thisScope != THIS.rootScope){ 
			var regex = allRegexs[thisScope.end];
			
			progressMatchPointID(thisScope.name, endMatchPointIDs, regex, soonestIndex, indexIsEnd);
			var endPointID = endMatchPointIDs[thisScope.name];
			var endMatch = regex.matchPoints[endPointID];
			if(endMatch == undefined) {
				console.error();
				console.error("ERROR: no end match for <"+thisScope.name+">")
				console.error(scopeChunk.file.path+":"+scopeChunk.startIndex)
				console.error(`"`+rawText.substr(scopeChunk.startIndex, 15)+`"`);
				console.error("recovering with soonestIndex");
				endMatch = {
					text: "FAIL",
					index: soonestIndex
				}
			}
			scopeChunk.setCurrentEndMatch(endMatch);
		}
	}

	

	


	//while there are subscopes left to branch into..
	var subScopesLeft = true;
	while(subScopesLeft) {
		
		//soonest ends is defined above, and modified below to always include
		//potential endings after adding a subscope
		//if this was a start match only scope, it would have returned already
		//end must be at least one char after start
		var soonestEnd = Math.max(charStart, scopeChunk.startIndex+1);	
		progressEndMatchPointID(soonestEnd);


		//for every subscope, make sure that the current id for next match
		//is after the current charStart.
		for(var i in subScopes) {
			var scope = subScopes[i];
			progressMatchPointID(scope.name, startMatchPointIDs, allRegexs[scope.start], charStart);
		}

		//compare all upcoming scopes, find the soonest one to start
		let soonestScope;
		let soonestScopeIndex = -42;
		let soonestScopeMatchID;
		let soonestMatch;

		for(var i in subScopes) {
			var subScope = subScopes[i];
			
			var regex = allRegexs[subScope.start];
			var name = subScope.name;
			var matchNum = startMatchPointIDs[name];
			var match = regex.matchPoints[matchNum];
			

			if(match != undefined) {
				var scopeIndex = match.index;
				if(subScope.startInclusive == false)
					scopeIndex += match.text.length;


				if(soonestScope == undefined || scopeIndex < soonestScopeIndex
				|| (scopeIndex == soonestScopeIndex && subScope.priority > soonestScope.priority)){
					soonestScope = subScope;
					soonestScopeIndex = scopeIndex;
					soonestScopeMatchID = matchNum;
					soonestMatch = regex.matchPoints[matchNum];
				}
			}
		}

		
		//if no subscopes exist, 
		//or the soonest ones nearest end ends after the end of this scope,
		//or the soonest one start must end after the end of this scope
		//end the search
		if(soonestScope == undefined
	 	|| (soonestScope.end && scopeChunk.endIndex <= soonestScopeIndex)
	 	|| (soonestScope.end == undefined && scopeChunk.endIndex < soonestScopeIndex + soonestMatch.text.length - 1)) {
			subScopesLeft = false;
		}

		//otherwise, create a class with the important information for the next scope function
		//includes the scope type, the start index, and the ids of matches it may have
		//match ids are based off of a list of all things matching a regexp in order
		else {
			startMatchPointIDs[soonestScope.name]++;

			var nextScopeInfo = {
				parentChunk: scopeChunk,
				scope: soonestScope,
				matchID: soonestScopeMatchID,
				startMatchPointIDs: {},
				endMatchPointIDs: {}
			}

			subScopes.forEach(function(subScope){
				nextScopeInfo.startMatchPointIDs[subScope.name] = startMatchPointIDs[subScope.name];
				nextScopeInfo.endMatchPointIDs[subScope.name] = endMatchPointIDs[subScope.name];
			});

			//make sure to add any loose text (no scope)
			//then use the outcome to find where the scope starts again next cycle
			// if(soonestScopeIndex == charStart)
				
			addLooseText(soonestScopeIndex-1);
			var outcome = THIS.scopify(file, nextScopeInfo);

			// scopeChunk.subChunks.push(outcome);

			// if(thisScope.name == "block")
			// 	console.log(soonestScope.name, thisScope.name)

			if(soonestScope != thisScope)
				progressEndMatchPointID(outcome.endIndex, true);
			else
				progressEndMatchPointID(outcome.endMatch.index + outcome.endMatch.text.length);
			
			//)};
			//for cases where an end match encompases other end matches
			if(scopeChunk.endMatch && scopeChunk.endIndex >= outcome.endIndex && scopeChunk.endMatch.index <= outcome.endIndex)
				subScopesLeft = false;
				// charStart = scopeChunk.endMatch.index;
			
			charStart = outcome.endIndex+1;

			for(name in outcome.endMatchPointUpdates)
				endMatchPointIDs[name] = outcome.endMatchPointUpdates[name];

			for(name in outcome.startMatchPointUpdates)
				startMatchPointIDs[name] = outcome.startMatchPointUpdates[name];
		}
	}

	if(charStart > scopeChunk.startIndex)
		addLooseText(scopeChunk.endIndex);
	

	scopeChunk.startMatchPointUpdates = startMatchPointIDs;
	scopeChunk.endMatchPointUpdates = endMatchPointIDs;
	scopeChunk.complete();
	return scopeChunk;
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









/*********************************************
*
*				Scope Chunk
*
********************************************/



exports.ScopeChunk = function(file, scopeInfo) {
	var THIS = this;

	THIS.subChunks = [];
	THIS.subChunksByName = {};
	THIS.lastSubChunk;
	THIS.parentChunk;
	THIS.prevChunk;
	THIS.nextChunk;

	//special case for making test scopes without any real data
	THIS.file = file;
	if(file == "TEST_MODE")
		return;

	// THIS.scope = scopeInfo ? scopeInfo.scope : HAPI.scopes.root;
	THIS.scope = scopeInfo.scope;

	//init allRegexs to contain any subscopes that are to be searched for
	//as well as the end regex for this scope
	var allRegexs = THIS.file.allRegexs;
	for(var i in THIS.scope.subScopes) {
		var keyString = THIS.scope.subScopes[i].start;
		if(allRegexs[keyString] == undefined) {
			allRegexs[keyString] = new RegExp(keyString, 'g');
			allRegexs[keyString].matchPoints = [];
		}
	}


	if(scopeInfo.matchID !== undefined) {
		THIS.startMatch = allRegexs[THIS.scope.start].matchPoints[scopeInfo.matchID];
		THIS.startIndex = THIS.startMatch.index;
		if(THIS.scope.startInclusive == false)
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

	else {
		THIS.endIndex = -1;

		//ensure that regex for end is initialized
		var keyString = THIS.scope.end;
		if(allRegexs[keyString] == undefined) {
			allRegexs[keyString] = new RegExp(keyString, 'g');
			allRegexs[keyString].matchPoints = [];
		}
	}

	THIS.startMatchPointIDs = scopeInfo.startMatchPointIDs || {};
	THIS.endMatchPointIDs = scopeInfo.endMatchPointIDs || {};
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


exports.ScopeChunk.prototype.setCurrentEndMatch = function(endMatch) {
	var THIS = this;
	THIS.endMatch = endMatch;
	THIS.endIndex = endMatch.index - 1;

	if(THIS.scope.endInclusive)
		THIS.endIndex += endMatch.text.length;
}



exports.ScopeChunk.prototype.getRawText = function() {
	var THIS = this;
	if(THIS.rawText == undefined)
		THIS.rawText = THIS.file.rawText.substring(THIS.startIndex, THIS.endIndex+1);

	return THIS.rawText;
}





/********************************
*    EVENT STUFF
*********************************/

exports.ScopeChunk.prototype.dispatchScopeEvent = function(eventName, args) {
	var THIS = this;
	if(THIS.scope.eventListeners == undefined)
		console.log(THIS.scope);

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
exports.ScopeChunk.prototype.getSubs = function(searchString, startAfter, matchLimit, state) {
	var THIS = this;
	var allMatches = [];
	var matchLimitHit = allMatches.length >= matchLimit;
	
	var matchArgs = searchString.match(/\w+|>/g);
	
	var currentScopeChunks = [THIS];
	for(var i = 0; i < matchArgs.length && matchLimitHit == false; i++) {
		var target = matchArgs[i], 
			shallow = false;
		if(target == ">") {
			i++;
			target = matchArgs[i];
			shallow = true;
		}

		var isTargetDepth = i >= matchArgs.length -1;
		var nextScopeChunks = [];

		// console.log(target, shallow);
		for(var c = 0; c < currentScopeChunks.length && matchLimitHit == false; c++) {
			var limit = isTargetDepth ? matchLimit - allMatches.length : undefined;

			var matches = currentScopeChunks[c].getSubsOfName(target, null, shallow, limit);
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
	return this.getSubsOfName(subScopeName, startAfter, shallowSearch, 1)[0];
}

exports.ScopeChunk.prototype.getSubsOfName = function(subScopeName, startAfter, shallowSearch, matchLimit, matches) {
	var THIS = this;
	matches = matches || [];
	
	if(shallowSearch) {
		//for scenarios where the chunks by name wont help
		if(startAfter && startAfter.chunk.name != subScopeName)
			return THIS.hardSubNameSearch(startAfter, subScopeName, matchLimit, matches);

		var subsOfName = THIS.subChunksByName[subScopeName];
		if(subsOfName && subsOfName.length) {
			if(startAfter) {
				var startIndex = subsOfName.indexOf(startAfter);
				if(startIndex != -1) {
					for(var i = startIndex + 1; i > -1 && i < subsOfName.length; i++) {
						matches.push(subsOfName[i]);
						if(matches.length >= matchLimit-1)
							break;
					}
				}
			}
			else matches = matches.concat(subsOfName);
		}
		else if(subScopeName == "*")
			matches = matches.concat(THIS.subChunks);
	}
	else console.error("only shallow search use '>'");

	return matches;
}

exports.ScopeChunk.prototype.hardShallowSubNameSearch = function(subScopeName, startAfter, matchLimit, matches) {
	console.error("INCOMPLETE CODE hardSub");
	var THIS = this;
	if(THIS.subChunks.length == 0)
		return undefined;

	if(THIS.contains(startAfter) == false) {
		console.error("can not startAfter chunk that is not subChunk");
		return undefined;
	}

	var startAt = startAfter ? startAfter.nextChunk : THIS.subChunks[0];
	for(ptr = startAt; ptr != undefined; ptr = ptr.nextChunk){
		if(ptr.scope.name == subScopeName || subScopeName == "*")
			return ptr;
	}
	return undefined;
}











/********************************
*    PERMEATE
*********************************/



//@args.initFn - A function to happen on each finding of a node
//@args.postSubsFn - A function to happen after being called for all the children
//@args.breadthFirst - boolean
exports.ScopeChunk.prototype.permeate = function(args) {
	if(args.initFn == undefined && args.postSubsFn == undefined) return;

	var THIS = this;

	args.state = {};
	args.rootNode = THIS;

	if(args.isAsync !== true) {
		if(args.breadthFirst !== true)
			return THIS.syncPermeateDepthFirst(args);
		else
			return THIS.syncPermeateBreadthFirst(args);
	}
	else console.error("Async Permeate not created yet");
}



// 	depth first
// 		a
// 	   / \
// 	  b   e
// 	 / \ / \
// 	c  d f  g
exports.ScopeChunk.prototype.syncPermeateDepthFirst = function(args) {
	var THIS = this;

	if(args.initFn)
		args.initFn(THIS, args.state);

	var childResults = [];
	THIS.subChunks.forEach((subChunk) =>{
		//returns an fn with the next step
		childResults.push(subChunk.syncPermeateDepthFirst(args));
	});

	// console.log(childResults);

	return args.postSubsFn ? args.postSubsFn(THIS, childResults, args.state) : undefined;
}




// 	breadth first
// 		a
// 	   / \
// 	  b   c
// 	 / \ / \
// 	d  e f  g
exports.ScopeChunk.prototype.syncPermeateBreadthFirst = function(args) {
	var THIS = this;

	if(args.initFn) 
		args.initFn(THIS, args.state);

	if(THIS.subChunks == undefined || THIS.subChunks.length == 0)
		return args.postSubsFn ? args.postSubsFn([]) : undefined;

	var chunksInOrder = [THIS]
	var chunkStartPositions = []
	// var postSubCollectionsFns = [];

	//go through each chunk, first initing, then appending subs to list
	//does root, then all children, then all grandchildren, ...
	for(var i = 0; i < chunksInOrder.length; i++) {
		var chunk = chunksInOrder[i];
			
		chunk.subChunks.forEach((sub) => {
			if(args.initFn) 
				args.initFn(sub, args.state);

			if(sub.subChunks && sub.subChunks.length)	
				chunksInOrder.push(sub);
		});
		console.log("LENGTH", chunksInOrder.length);
	}

	//if no postSubsFn, theres nothing to gather in reverse from children
	if(args.postSubsFn == undefined)
		return;



	//for each chunk in reverse breadth order
	//if it has no children, skip it
	//otherwise, iterate through children forwards, gathering the results
	//if the above child has children of its own, there should be a childResultsArray on the queue for it
	//once all results for a chunks children have been found, add them to the stack
	var childResultArrays = [];
	var childResultsIndex = 0;
	while(chunk = chunksInOrder.pop()) {
		var childResults = chunk.subChunks.map((sub) => {
			var grandChildResults;
			if(sub.subChunks && sub.subChunks.length){
				if(childResultArrays.length == 0)
					console.error("Chunk with subs exists, but not childResults on stack")

				grandChildResults = childResultArrays.pop();	
			}
			else grandChildResults = [];
			
			return args.postSubsFn(sub, grandChildResults, args.state);
		})
		childResultArrays.push(childResults);
	}

	if(childResultArrays.length == 0)
		console.error("At rootChunk but no childResults on stack")

	return args.postSubsFn(THIS, childResultArrays.pop(), args.state);
}










/********************************
*    TESTING
*********************************/


if(process.argv[1] == __filename) {
	console.log("TESTING SCOPERIZER");

	var testName = process.argv[2];

	if(testName == "breadth") {
		var rootChunk = new exports.ScopeChunk("TEST_MODE");
		var ID = 0;
		rootChunk.ID = ID++;
		for(var i = 0; i < 3; i++) {
			var subChunk = new exports.ScopeChunk("TEST_MODE");
			subChunk.ID = ID++;
			for(var j = 0; j < 4; j++) {
				var subSubChunk = new exports.ScopeChunk("TEST_MODE");
				subSubChunk.ID = ID++;
				subChunk.appendSubChunk(subSubChunk);
			}
			rootChunk.appendSubChunk(subChunk);
		}



		console.log(rootChunk.permeate({
			breadthFirst: true,
			initFn: function(scopeChunk, state) {
				console.log(scopeChunk.ID);
			},
			postSubsFn: function(scopeChunk, childResults, state){
				console.log(childResults);
				childResults.unshift(scopeChunk.ID);
				return childResults.join(",");
			}
		}));

	}
	else console.error(`Test "`+testName+`" not found`);
}








