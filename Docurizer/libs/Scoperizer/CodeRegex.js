
exports.CodeRegex = function(normRegExpOrString, ruleSet) {
	var THIS = this;

	if(typeof normRegExpOrString == "object")
		THIS.source = normRegExpOrString.source;
	else
		THIS.source = normRegExpOrString;

	THIS.numCapturingGroups = 0;
	THIS.qualities = new Quality(THIS, 0);
}



exports.CodeRegex.prototype.matchesStart = function(string) {
	return this.matchesAt(string, 0);
};


exports.CodeRegex.prototype.matchesAt = function(string, index) {
	// console.log("searching for", this.source, "in", string)
	return this.qualities.execAtWithin(string, index);
};







var Quality = function(regex, index, capturingGroups) {
	var THIS = this;

	THIS.regex = regex;
	THIS.firstChild;
	THIS.lastChild;

	var isRoot = capturingGroups == undefined;
	THIS.capturingGroups = capturingGroups || [];

	if(index === undefined)
		return;

	THIS.startIndex = index;

	var source = regex.source;
	
	var current;
	var qualities = [];
	var splitsAt = [];
	var inSquareBrackets, doingRange;
	var inCurlyBrackets, currentNumber;
	var hangingAtStart, listComplete = false;

	if(isRoot == false && source.charAt(index) == "(") {
		index++;
		if(source.charAt(index) == "?") {
			index++;
			if(source.charAt(index) == ":")
				index++;

			else if(source.charAt(index) == "=" || (THIS.isInverse = source.charAt(index) == "!")) {
				THIS.lookahead = true;
				index++;
			}
			
		}
		else {
			regex.numCapturingGroups++;
			THIS.capturingGroups.push(regex.numCapturingGroups)
		}
		
	}

	for(;listComplete == false && index < source.length; index++) {
		var command = source.charAt(index);
		if(command == "\\") {
			state.index++;
			command += source.charAt(index);

			var isInverse = false;

			if(inSquareBrackets)
				current.match.push(command.charAt(1));

			else if(command == "\\b" || (isInverse = command == "\\B")) 
				current.afterWordEnd = !isInverse

			else {
				current = new Quality(THIS.regex);
				qualities.push(current);

				if(command == "\\d" || (isInverse = command == "\\D"))
					current.match = ["09"]

				else if(command == "\\w" || (isInverse = command == "\\W"))
					current.match = ["09", "az", "AZ", "_"]

				else if(command == "\\s" || (isInverse = command == "\\S"))
					current.match = ["\t", " ", "\n"]

				else
					current.match = command.charAt(1);

				current.isInverse = isInverse;
			}
		}


		//end square brackets must come before inSquareBrackets
		else if(command == "]")
			inSquareBrackets = false;

		//when inSquareBrackets, char is always a match case
		else if(inSquareBrackets) {
			if(command == '-') 
				doingRange = true;

			else if(doingRange) {
				current.match[current.match.length-1] += command;
				doingRange = false;
			}

			else
				current.match.push(command)
		}

		//modifiers
		else if(command == "*")
			current.count = [0, "i"]

		else if(command == "+"){
			current.count = [1, "i"]
			// console.log("plus found", current);
		}

		else if(command == "?") {
			if(current.count == undefined)
				current.count = [0, 1]
			else
				current.matchFewer = true;
		}

		else if(command == "^")
			hangingAtStart = true;

		else if(command == "$")
			current.atEnd = true;

		else if(command == "{") {
			current.count = [];
			currentNumber = "";
			inCurlyBrackets = true;
		}

		else if(inCurlyBrackets) {
			if(command == "}" || command == ","){
				if(command == "}")
					inCurlyBrackets = false;

				if(currentNumber)
					current.count.push(parseInt(currentNumber));
				else
					current.count.push("i");

				currentNumber = "";
			}
			currentNumber += command;
		}

		else if(command == "|")
			splitsAt.push(qualities.length);


		else if (command == "(") {
			current = new Quality(THIS.regex, index, THIS.capturingGroups.slice());
			qualities.push(current);
			index = current.endIndex;
		}

		else if(command == ")")
			listComplete = true;

		else {
			current = new Quality(THIS.regex);
			qualities.push(current);

			if(command == "[") {
				inSquareBrackets = true;
				current.match = [];

				if(source.charAt(state.index+1) == '^') {
					current.isInverse = true;
					state.index++;
				}
			}

			else if(command == ".") {
				current.match = '\n';
				current.isInverse = true;
			}

			else
				current.match = command;
		}

		if(hangingAtStart && command != "^") {
			current.atStart = true;
			hangingAtStart = false;
		}
	}

	THIS.endIndex = index - 1;
	THIS.source = regex.source.substring(THIS.startIndex, THIS.endIndex+1);

	if(splitsAt.length) {
		THIS.isOrList = true;
		THIS.list = [];

		var lastIndex = 0;
		var allSplitsAdded = false;
		for(var s = 0; allSplitsAdded == false; s++){
			var splitPoint = splitsAt[s];

			var orCaseList = new Quality(THIS.regex, undefined, THIS.capturingGroups.slice());
			
			if(splitPoint === undefined) {
				splitPoint = qualities.length;
				allSplitsAdded = true;
			}

			for(var q = lastIndex; q < splitPoint; q++)
				orCaseList.appendChild(qualities[q]);

			orCaseList.parent = THIS;
			THIS.list.push(orCaseList);
			lastIndex = splitPoint;
		}
	}
	else for(var q = 0; q < qualities.length; q++)
		THIS.appendChild(qualities[q]);
	
}


Quality.prototype.toString = function() {
	if(this.match)
		return this.match;

	else if(this.startIndex !== undefined && this.endIndex !== undefined)
		return this.regex.source.substring(this.startIndex, this.endIndex+1)

	else if(this.isOrList)
		return this.list.map((item) => { return item.toString(); }).join('|');

	else if(this.firstChild)
		return "("+this.firstChild.toString()+")";

	else console.log("not to stringable", this);
}



Quality.prototype.matchesChar = function(char) {
	var quality = this;
	if(quality.match === undefined)
		return false;

	var charIsMatch = (char == quality.match);
	if(charIsMatch == false && quality.match.length) {
		for(var q = 0; charIsMatch == false && q < quality.match.length; q++) {
			var matchCase = quality.match[q];
			if(matchCase.length == 1)
				charIsMatch = char == matchCase;

			else if(matchCase.length == 2)
				charIsMatch = (char >= matchCase.charAt(0) && char <= matchCase.charAt(1));

			else
				console.error("length not 1 or 2 for match case", matchCase)
		}
	}

	if(quality.isInverse)
		charIsMatch = !charIsMatch;

	return charIsMatch;
};



var getNextQualityAndArgs = function(quality, args) {
	if(quality.next) {
		return {
			quality: quality.next, 
			args : {
				matchCount: 0,
				callbackStack : args.callbackStack
			},
		}
	}
	else {
		var stack = args.callbackStack;
		var callback = args.callbackStack && args.callbackStack.slice(-1)[0]
		if(callback) {
			return {
				quality: callback.quality, 
				args : {
					matchCount: callback.matchCount,
					callbackStack: args.callbackStack.slice(0, -1)
				},
			}
		}
	}
	return undefined;
}

var getRepeatedQualityAndArgs = function(quality, args) {
	if(quality.match) {
		return {
			quality: quality,
			args: {
				matchCount: args.matchCount + 1,
				callbackStack: args.callbackStack
			}
		}
	}
	else if(quality.isOrList || quality.firstChild) {
		
		var nextStack = args.callbackStack.slice();
		nextStack.push({
			quality: quality,
			matchCount: args.matchCount + 1
		})

		var nextCheck = {
			args: {
				matchCount: 0,
				callbackStack: nextStack
			}
		}

		if(quality.isOrList)
			nextCheck.qualities = quality.list;

		else nextCheck.quality = quality.firstChild;

		return nextCheck;
	}
	else console.error("quality has neither children nor match cases", quality);
	
	return undefined;
}

//for cases where there is a potentially uneccessary match, first try skipping it
Quality.prototype.trySkippingAtWithin = function(stringToMatch, indexToCheck, limitingIndex, args) {
	var THIS = this;
	// console.log("try skip", THIS.toString());

	var canBeSkipped = THIS.matchCountAtMin(args.matchCount);
	if(canBeSkipped) {
		var nextCheck = getNextQualityAndArgs(THIS, args);
	
		if(nextCheck == undefined) {
			// console.log("end")
			return "";
		}

		var result = nextCheck.quality.execAtWithin(stringToMatch, indexToCheck, limitingIndex, nextCheck.args);
		return result;
	}
	return undefined;
}


Quality.prototype.tryMatchingAtWithin = function(stringToMatch, indexToCheck, limitingIndex, args) {
	var THIS = this;
	// console.log("try match", THIS.toString());

	var canBeRepeated = THIS.matchCountWithinMax(args.matchCount+1);
	var char = stringToMatch.charAt(indexToCheck);
	var antiMatch = THIS.match ? THIS.matchesChar(char) == false : undefined;

	if(canBeRepeated && !antiMatch){
		var nextCheck = getRepeatedQualityAndArgs(THIS, args);

		if(antiMatch === false)
			indexToCheck++;

		for(var loopCount = 0; 
		loopCount == 0 || (nextCheck.qualities && loopCount < nextCheck.qualities.length);
		loopCount++){
			var quality;
			if(nextCheck.qualities && nextCheck.qualities.length) 
				quality = nextCheck.qualities[loopCount];
			else quality = nextCheck.quality;

			if(quality == undefined)
				return undefined;

			var result = quality.execAtWithin(stringToMatch, indexToCheck, limitingIndex, nextCheck.args);
	
			if(result !== undefined) {
				if(antiMatch === false) {
					// console.log(char+result);
					return char + result;
				}
				return result;
			}
		}
	}

	// console.log("was skipped", THIS.toString(), args.matchCount, THIS.count)
	return undefined;
}


Quality.prototype.execAtWithin = function(stringToMatch, indexToCheck, limitingIndex, args) {
	indexToCheck = indexToCheck || 0;
	limitingIndex = limitingIndex === undefined ? stringToMatch.length : limitingIndex;

	if(indexToCheck >= limitingIndex) {
		return undefined;
	}

	// console.log("exec ", this.toString(), "at", stringToMatch.substr(indexToCheck, 8));

	var THIS = this;

	args = args || {
		matchCount: 0,
		callbackStack: []
	}

	if(THIS.matchFewer) {
		var result = THIS.trySkippingAtWithin(stringToMatch, indexToCheck, limitingIndex, args);
		if(result !== undefined)
			return result;
		return THIS.tryMatchingAtWithin(stringToMatch, indexToCheck, limitingIndex, args);
	}
	//in match more, try matching first, try skipping second
	else {
		var result = THIS.tryMatchingAtWithin(stringToMatch, indexToCheck, limitingIndex, args);
		if(result !== undefined)
			return result;
		return THIS.trySkippingAtWithin(stringToMatch, indexToCheck, limitingIndex, args);
	}

	return undefined;
}


Quality.prototype.appendChild = function(quality) {
	var THIS = this;

	quality.parent = THIS;

	if(THIS.firstChild == undefined)
		THIS.firstChild = quality;

	if(THIS.lastChild != undefined) {
		THIS.lastChild.next = quality;
		quality.prev = THIS.lastChild;
	}

	THIS.lastChild = quality;
};

Quality.prototype.getNext = function() {
	var THIS = this;
	if(THIS.next)
		return THIS.next;

	else if(THIS.parent)
		return THIS.parent.getNext();
}




Quality.prototype.matchCountAtMin = function(matchCount) {
	var THIS = this;
	if(THIS.count == undefined)
		return matchCount == 1;

	if(THIS.count.length == 1)
		return matchCount === THIS.count[0]

	return THIS.count[0] <= matchCount;
}

Quality.prototype.matchCountWithinMax = function(matchCount) {
	var THIS = this;
	if(THIS.count == undefined)
		return matchCount == 1;

	if(THIS.count.length == 1)
		return matchCount === THIS.count[0];

	return THIS.count[1] == 'i' || THIS.count[1] <= matchCount;
}























if(process.argv[1] == __filename) {
	var TESTS = [
		["(a|b(c|d)?)+", "bcabdabaneanbbadadbadnbaetnbdbteadbanbdanb"]
	]


	console.log("TESTING CodeRegex");

	var testIndex = process.argv[2] || 0; 
	var testVals = TESTS[testIndex];

	
	var stringToSearch = testVals[1];

	var testType = process.argv[3];
	if(testType == "benchmark") {

		var randomStarts = [];

		for(var i = 0; i < 10000; i++){
			var start = ~~(stringToSearch.length-9 * Math.random());
			randomStarts.push(start);
		}
		
		var startTime = Date.now();
		for(var i = 0; i < 10000; i++) {
			var nativeRegex = new RegExp(testVals[0]);	
			nativeRegex.exec(stringToSearch.slice(randomStarts[i]));
		}
		var nativeTime = Date.now() - startTime;


		startTime = Date.now();
		for(var i = 0; i < 10000; i++) {
			var regex = new exports.CodeRegex(testVals[0]);	
			regex.matchesStart(stringToSearch, randomStarts[i])
		}
		var codeRegexTime = Date.now() - startTime;
		
		console.log("native: ", nativeTime, " -- codeRegex: ", codeRegexTime, " -- diff: ", nativeTime-codeRegexTime);
	}

	else {
		var regex = new exports.CodeRegex(testVals[0]);
		console.log("searching", stringToSearch, 'for', regex.source)
		console.log(regex.matchesStart(stringToSearch))
	}
}









