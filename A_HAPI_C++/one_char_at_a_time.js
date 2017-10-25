
// HAPI.htmlifyScope = function(rawText, scopeInfo) {
// 	var out = {
// 		html: "",
// 		endIndex: -1
// 	};

// 	var thisScope = scopeInfo ? scopeInfo.scope : undefined;

// 	if(thisScope === undefined)
// 		out.endIndex = rawText.length-1;
// 	else if(thisScope.endIsRegExp)
// 		out.endIndex = 42;

// 	var subScopes = thisScope ? (thisScope.allowedSubScopes || []) : HAPI.scopes;
// 	var thisScopeEndDepth = -1;
// 	var scopedMatchDepth = [];
// 	var scopeMatches = [];
// 	for(var i in subScopes)
// 		scopedMatchDepth[i] = -1;

// 	var charStart = scopeInfo ? scopeInfo.startIndex : 0;


// 	var addLooseText = function(endIndex){
// 		if(thisScope && thisScope.startInclusive == false) {
// 			charStart = Math.max(charStart, scopeInfo.startIndex + thisScope.start.length);
// 		}
// 		if(charStart < endIndex)
// 			out.html += rawText.substring(charStart, endIndex);
// 	}
	

// 	//for each character, check each scope
// 	for(var i = charStart; i < rawText.length; i++) {
// 		var char = rawText[i];

// 		if(thisScope){
// 			if(out.endIndex < 0 && thisScope.end.charAt(thisScopeEndDepth+1) == char) {
// 				thisScopeEndDepth++;

// 				if(thisScopeEndDepth >= thisScope.end.length-1) 
// 					out.endIndex = i;
// 			}
// 			else {
// 				if(thisScope.start.charAt(0) == char)
// 					thisScopeEndDepth = 0;
// 				else
// 					thisScopeEndDepth = -1;
// 			}
// 		}

// 		//if an endIndex has been found and it has either
// 		//A: been reached or
// 		//B: there are no subscopes to search for
// 		if(out.endIndex != -1 && (i >= out.endIndex || subScopes.length == 0)) {
// 			//if this is a scoped case, do special things involving whether or not
// 			//the text start and end fall in or out of the tags
// 			//in either case, add the loose text to the output
// 			if(thisScope){
// 				var endGrab = out.endIndex+1;
// 				if(thisScope.endInclusive == false)
// 					endGrab -= thisScope.end.length;

// 				addLooseText(endGrab);

// 				out.html = "<"+thisScope.name+">"+out.html+"</"+thisScope.name+">";

// 				if(thisScope.endInclusive == false)
// 					out.html += thisScope.end;

// 				if(thisScope.startInclusive == false)
// 					out.html = thisScope.start + out.html;
// 			}
// 			else addLooseText(i+1);

// 			return out;
// 		}



// 		for(var s_num = 0; s_num < subScopes.length; s_num++){
// 			var scope = subScopes[s_num];

// 			//if a match has been found, and this scope is not another potential match, do nothing
// 			if(thisScope != scope && scopeMatches.length == 0 || scopedMatchDepth[s_num] != -1) {
// 				var doCheckForAllMatchesFound = false;

// 				//if the current char matches the next needed for a scope start match, move the match depht up 1
// 				if(scope.start.charAt(scopedMatchDepth[s_num] + 1) == char)
// 					scopedMatchDepth[s_num]++;

// 				//if it doensn't match, set the depth back to none
// 				//for cases where a match already exists, this will trigger a check for no more potentials
// 				//for cases where a match does not, the char will be checked for matching the start of this same scope
// 				else {
// 					doCheckForAllMatchesFound = (scopeMatches.length > 0);
					
// 					if(doCheckForAllMatchesFound == false && scope.start.charAt(0) == char)
// 						scopedMatchDepth[s_num] = 0;
// 					else
// 						scopedMatchDepth[s_num] = -1;
// 				}

// 				//if the scope match depth is the length of the scope trigger
// 				//signal for a check to see if no other potentials exist
// 				//remove this scope from the ones to be checked for matches
// 				//add this scope to the confirmed matches stack with its start index
// 				if(scopedMatchDepth[s_num] >= scope.start.length-1) {
// 					doCheckForAllMatchesFound = true;
// 					scopedMatchDepth[s_num] = -1;

// 					scopeMatches.push({
// 						scope: scope,
// 						startIndex: i - (scope.start.length-1)
// 					});
// 				}

// 				//if a pontential has been dropped, or confirmed
// 				//first check if no other running pontenials exist
// 				if(doCheckForAllMatchesFound) {
// 					var breakIntoBestMatch = scopedMatchDepth.reduce(function(sum, val){
// 						return sum && (val == -1);
// 					}, true);



// 					//if no pontentials exist, get the best match by length of trigger word
// 					//("if" vs "ifndef")
// 					//then recursively call this same function, but started at the begginnig of this scope
// 					//the function returns an html version of that scope, as well as an ending index
// 					if(breakIntoBestMatch){
// 						var bestMatch = scopeMatches.reduce(function(a, b){
// 							if(a.scope.start.length > b.scope.start.length)
// 								return a;
// 							else
// 								return b;
// 						});

// 						addLooseText(bestMatch.startIndex);
// 						
// 						// if(thisScope && thisScope.startInclusive == false) {
// 						// 	charStart = Math.max(charStart, scopeInfo.startIndex + thisScope.start.length);
// 						// }

// 						// if(charStart < bestMatch.startIndex)
// 						// 	out.html += rawText.substring(charStart, bestMatch.startIndex);

// 						var outcome = HAPI.htmlifyScope(rawText, bestMatch);
// 						
// 						out.html += outcome.html;
// 						i = outcome.endIndex;
// 						charStart = i+1;

// 						

// 						scopeMatches = [];
// 					}
// 				}
// 			}
			
// 		}
// 	}

// 	return out;
// }


// 