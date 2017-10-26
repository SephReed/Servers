const pathTool = require('path');
const rootFilePath = process.argv[2];
const fs = require('fs');





var HAPI = {};
eval(fs.readFileSync('scopes_c++.js')+'');

HAPI.mootPath = pathTool.dirname(rootFilePath);

HAPI.files = {};
HAPI.registerFile = function(file) {
	HAPI.files[file.path] = file;
}








HAPI.run = function() {
	
	HAPI.assertViewer(rootFilePath)
	// .then(function(){
	console.log("RUN!");
	return HAPI.sprout(rootFilePath).then(function(){
		var overview = {};
		overview.root = rootFilePath;

		var writePromises = [];
		for(var path in HAPI.files) {
			var file = HAPI.files[path];

			// var htmlVersion = HAPI.htmlifySpacing(
			// 	`<link href='code_style.css' rel='stylesheet' type='text/css'>`
			// 	+ file.scopeChunk.getHtml().join('')
			// );

			var htmlVersion = `<link href='code_style.css' rel='stylesheet' type='text/css'>`
			+ file.scopeChunk.getHtml().join('')

			var outPath = file.path.replace(HAPI.mootPath, "");
			outPath = "renders/"+outPath+".html";

			fs.ensureDirectoryExistence(outPath)
			writePromises.push(fs.promise.writeFile(outPath, htmlVersion));

			overview[path] = {
				includes: file.includePaths
			}
		}

		
		fs.ensureDirectoryExistence("renders/overview/");
		// writePromises.push(fs.promise.writeFile("renders/overview/file_data.json", JSON.stringify(overview)));

		var includeOverviewHtml = HAPI.createIncludeOrderOverview(rootFilePath, HAPI.files);
		writePromises.push(fs.promise.writeFile("renders/overview/includeMap.html", includeOverviewHtml));

		return Promise.all(writePromises);

	}).catch(function(err) {
		console.error(err);
	});
}




HAPI.sprout = function(filePath) {
	if(HAPI.files[filePath]) 
		return Promise.resolve(HAPI.files[filePath]);

	var file = new HAPI.class.File(filePath);
	HAPI.registerFile(file);

	return file.scopifyText().then(function(){
		return Promise.all(file.includePaths.map(HAPI.sprout))
		.then(function(){
			return file;
		});
	}).catch(function(err){
		console.error(err);
	});
}
















/******************************************
*
*		Main Parser
*
*****************************************/





//TODO: create special case for when non-inclusive starts end on or after charStart
//TODO: progress regexs which don't fall into a scope to after the scope
//TODO: get rid of match IDs, just pass on recent regex matches
//continue to record matches by start position
//find a way to make regexs not search passed a known start position
//TODO: create an attribute for scopes which can interfere with the current ones end

//use depthMode for cases where read through / skip is effecient
HAPI.scopify = function(file, scopeInfo) {
	//variable to be returned at end
	var scopeChunk = new HAPI.class.ScopeChunk(file, scopeInfo);
	
	//allRegexs variable keeps track of shared info for file
	//regarding the locations of all matching scope starts and ends
	var allRegexs = file.allRegexs;

	var thisScope = scopeChunk.scope;
	

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
		charStart = Math.max(charStart, scopeChunk.startIndex);
		
		if(charStart < endIndex) {
			scopeChunk.subChunks.push({
				file: file,
				startIndex: charStart,
				endIndex: endIndex-1
			})
			charStart = endIndex;
		}
	}

	var progressMatchPointID = function(name, matchPointIDs, regex, targetIndex) {
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


			stopLoop = (matchID == -1 || regex.matchPoints[matchID].index >= targetIndex)

			matchPointIDs[name] = matchID;
			if(stopLoop == false)
				matchPointIDs[name]++;
		}
	}

	

	


	//while there are subscopes left to branch into..
	var subScopesLeft = true;
	while(subScopesLeft) {
		//if this scope is not root (terminates at end of file), make sure its potential end position is known
		//pontential end of scope will be moved if a subscope contains it
		//ie. bracket in bracket {{ match on loop 1-->} match on loop 2-->}
		if(thisScope != HAPI.scopes.root){ 
			var regex = allRegexs[thisScope.end];
			var soonestEnd = Math.max(charStart, scopeChunk.startIndex+1);
			
			progressMatchPointID(thisScope.name, endMatchPointIDs, regex, soonestEnd);
			var endPointID = endMatchPointIDs[thisScope.name];
			var endMatch = regex.matchPoints[endPointID];
			if(endMatch == undefined)
				console.error(regex.source, "pointID", endPointID, charStart, file.path, scopeChunk.startIndex, rawText.substr(scopeChunk.startIndex, 32));
			scopeChunk.setCurrentEndMatch(endMatch);
		}


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

		
		//if no subscopes exist, or the soonest one is after the end of this scope
		//end the search
		if(soonestScope == undefined || scopeChunk.endIndex <= soonestScopeIndex) {
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
				
			addLooseText(soonestScopeIndex);
			var outcome = HAPI.scopify(file, nextScopeInfo);

			scopeChunk.subChunks.push(outcome);


			
			
			//)};
			//for cases where an end match encompases other end matches
			if(scopeChunk.endMatch && scopeChunk.endIndex >= outcome.endIndex && scopeChunk.endMatch.index <= outcome.endIndex)
				charStart = scopeChunk.endMatch.index;
			else
				charStart = outcome.endIndex+1;

			for(name in outcome.endMatchPointUpdates)
				endMatchPointIDs[name] = outcome.endMatchPointUpdates[name];

			for(name in outcome.startMatchPointUpdates)
				startMatchPointIDs[name] = outcome.startMatchPointUpdates[name];
		}
	}

	

	scopeChunk.startMatchPointUpdates = startMatchPointIDs;
	scopeChunk.endMatchPointUpdates = endMatchPointIDs;
	scopeChunk.complete();
	return scopeChunk;
}



















/******************************************
*
*		Class- ScopeChunk
*
*****************************************/




HAPI.class = {};
HAPI.class.ScopeChunk = function(file, scopeInfo) {
	var THIS = this;
	THIS.html = "";
	THIS.subChunks = [];
	THIS.file = file;
	THIS.scope = scopeInfo ? scopeInfo.scope : HAPI.scopes.root;

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

	if(scopeInfo === undefined) {
		THIS.startIndex = 0;
		THIS.endIndex = file.rawText.length - 1;
		THIS.startMatchPointIDs = {};
		THIS.endMatchPointIDs = {}
	}	
	else {
		THIS.parentChunk = scopeInfo.parentChunk;
		THIS.startMatch = allRegexs[THIS.scope.start].matchPoints[scopeInfo.matchID];
		THIS.startIndex = THIS.startMatch.index;
		if(THIS.scope.startInclusive == false)
			THIS.startIndex += THIS.startMatch.text.length;

		THIS.endIndex = -1;
		THIS.startMatchPointIDs = scopeInfo.startMatchPointIDs;
		THIS.endMatchPointIDs = scopeInfo.endMatchPointIDs;

		//ensure that regex for end is initialized
		var keyString = THIS.scope.end;
		if(allRegexs[keyString] == undefined) {
			allRegexs[keyString] = new RegExp(keyString, 'g');
			allRegexs[keyString].matchPoints = [];
		}
	}
}

HAPI.class.ScopeChunk.prototype.complete = function() {
	var THIS = this;
		if(THIS.isComplete != true) {
		THIS.isComplete = true;	
		var onComplete = THIS.scope.onComplete;
		if(onComplete !== undefined)
			onComplete(THIS);
	}
}

HAPI.class.ScopeChunk.prototype.setCurrentEndMatch = function(endMatch) {
	var THIS = this;

	THIS.endMatch = endMatch;
	THIS.endIndex = endMatch.index - 1;

	if(THIS.scope.endInclusive)
		THIS.endIndex += endMatch.text.length;
}

HAPI.class.ScopeChunk.prototype.getFirstOfName = function(subScopeName, startIndex) {
	var THIS = this;
	for(var i = startIndex || 0; i < THIS.subChunks.length; i++) {
		var subChunk = THIS.subChunks[i];
				if(subChunk.scope && subChunk.scope.name == subScopeName)
			return { chunk: subChunk, index: i };
	}
}

HAPI.class.ScopeChunk.prototype.getHtml = function() {
	// return [this.html];
	var THIS = this;
	var outStrings = [];

	if(THIS.startMatch && THIS.startInclusive == false) {
		var firstSubChunk = THIS.subChunks[0];
		if(firstSubChunk && firstSubChunk.startIndex > THIS.startIndex) {
			var preText = THIS.file.rawText.substring(THIS.startIndex, firstSubChunk.startIndex);
			outStrings.push(HAPI.exitHtml(preText));
			// outStrings.push(preText);
		}
	}
	outStrings.push("<"+THIS.scope.name+">");


	if(THIS.subChunks.length == 0) {
		var allText = THIS.file.rawText.substring(THIS.startIndex, THIS.endIndex+1)
		outStrings.push(HAPI.exitHtml(allText));
		// outStrings.push(allText);
	}
	else {
		THIS.subChunks.forEach((subScopeChunk) => {
			if(subScopeChunk.scope) {
				var subStrings = subScopeChunk.getHtml();
				subStrings.forEach((subString) => {
					outStrings.push(subString);
				})
			}
			else {
				var start = subScopeChunk.startIndex;
				var end =  subScopeChunk.endIndex + 1;
				var chunklessText = subScopeChunk.file.rawText.substring(start, end);
				outStrings.push(HAPI.exitHtml(chunklessText));
				// outStrings.push(chunklessText);
			}
		});

		var lastSubChunk = HAPI.getLast(THIS.subChunks);
		var leftOvers = THIS.file.rawText.substring(lastSubChunk.endIndex+1, THIS.endIndex+1);
		outStrings.push(HAPI.exitHtml(leftOvers));
		// outStrings.push(leftOvers);
	}

	outStrings.push("</"+THIS.scope.name+">");
	return outStrings;
};






































/******************************************
*
*		Class- File
*
*****************************************/




HAPI.class.File = function(filePath) {
	var THIS = this;
	THIS.path = filePath;
	THIS.includes = [];
	// THIS.includePaths = [];
	THIS.rawText;
	THIS.allRegexs = {};

	var nonHeader = filePath.replace(/(hpp|h)$/i, "cpp");
	if(nonHeader != filePath)
		THIS.includes.push(pathTool.basename(nonHeader));
}





HAPI.class.File.prototype.scopifyText = function() {
	var THIS = this;
	if(THIS.rawText == undefined) {
		return fs.promise.readFile(THIS.path)
		.then((data) => {
			// THIS.rawText = HAPI.exitHtml(data+"");
			THIS.rawText = data+"";
			THIS.scopeChunk = HAPI.scopify(THIS);
			THIS.includePaths = THIS.includes.map((include) => {
				return THIS.getRelativePath(include);
			});
		});
	}

	else return Promise.resolve();

	// THIS.rawText = data+"";
	// THIS.scopifyText();

	// new Promise(function(resolve, reject) {

	// 	fs.readFile(filePath, function(err, data){
	// 	    if(err){
		// 	        reject();
	// 	    } else {
	// 	    	THIS.rawText = data+"";
	// 	    	THIS.scopifyText();
	// 	    	resolve();
	// 	    }
	// 	});	
	// });

	// var includes = THIS.rawText.match(/#include.+/g);
	// if(includes) {
	// 	includes.forEach(function(incLine){
	// 		var addMe = {};
	// 		addMe.rawText = incLine;

	// 		incLine = incLine.match(/\".+\"/);
	// 		if(incLine && incLine[0]) {
	// 			incLine = incLine[0];
	// 			incLine = incLine.substr(1, incLine.length-2);

	// 			addMe.target = incLine;
	// 			addMe.path = THIS.getRelativePath(incLine);


	// 			THIS.includes.push(addMe);
	// 		}
	// 	});
	// }
};


HAPI.class.File.prototype.getRelativePath = function(path) {
	var baseDir = this.path.split("/")
	baseDir.pop();

	var dirs = path.split("/");
	dirs.forEach(function(dir) {
		if(dir == "..") {
			if(baseDir.length)
				baseDir.pop();
			else
				console.error("can't get root")
		}
		else {
			baseDir.push(dir);
		}
	});

	return baseDir.join("/");
};


HAPI.class.File.prototype.addInclude = function(addMe) {
	if(this.includes.indexOf(addMe) == -1)
		this.includes.push(addMe);
}






/******************************************
*
*		HTML Tools
*
*****************************************/


HAPI.exitHtml = function(exitMe) {
	// exitMe = exitMe.replace("<!--", '');
	exitMe = exitMe.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');
	

	return exitMe.replace(/\t/g, '&emsp;')
	.replace(/\n/g, '<br>\n');
	// return exitMe;
}

HAPI.htmlifySpacing = function(showMe) {

	// var tabs = showMe.match(/\t+/g);

	// if(tabs){
	// 	var likelyTabAmount = tabs[tabs.length - 1].length + 1;
	// 	var minAmount = -1;
	// 	for(var i = 0; i < tabs.length; i++) {
	// 		var numTabs = tabs[i].length;
	// 		if(numTabs < minAmount || i == 0) {
	// 			minAmount = numTabs;
	// 		}			
	// 	}

	// 	var willRemove = Math.max(likelyTabAmount, minAmount);
	// 	var regex = new RegExp("\n\t{"+willRemove+"}", "g");

	// 	showMe = showMe.replace(regex, '\n');
	// }

	return showMe.replace(/\t/g, '&emsp;')
	.replace(/\n/g, '<br>\n');
}











/******************************************
*
*		UI Stuff
*
*****************************************/

HAPI.viewerDir = "default_viewer";
HAPI.assertViewer = function(filePath) {
	return fs.copyFolder(HAPI.viewerDir, "renders", true)
}

HAPI.includeDropID = 0;
HAPI.createIncludeOrderOverview = function(filePath, map, state) {
	var out = "";

	if(state === undefined) {
		state = { added: [] };	
		out += `<link href='style.css' rel='stylesheet' type='text/css'>`;
		out += "<h1>Include Path Overview</h1>";
	}
	

	if(state.added.indexOf(filePath) != -1){
		filePath = filePath.replace("test/", '');
		return "<class><a href='../"+filePath+".html' target='file_content' class='back_ref'>"+filePath+"</a></class>";
	}
	state.added.push(filePath);
	
	var file = map[filePath];
	
	out += "<class>\n";
	filePath = filePath.replace("test/", '');

	out += "<a href='../"+filePath+".html' target='file_content'>"+filePath+"</a>";

	var includesHtml = "";
	var splitName = pathTool.basename(filePath).split('.');
	file.includePaths.forEach(function(inc) {
		var incSplitName = pathTool.basename(inc).split('.');
		if(splitName[0] == incSplitName[0]){
			if(splitName[1] != incSplitName[1]){
				inc = inc.replace("test/", '');
				out += "<a href='../"+inc+".html' target='file_content' class='sameName'>(."+incSplitName[1]+")</a>";
			}

			else console.error("file includes in self", filePath);
		}
		else {
			var addMe = HAPI.createIncludeOrderOverview(inc, map, state);
			if(addMe)
				includesHtml += addMe;
		}		
	});

	if(includesHtml.length){
		var ID = "inc_drop_"+HAPI.includeDropID++;
		out += "<input type='checkbox' id='"+ID;
		out += state.added.length == 1 && false ? "'' checked>" : "'>";
		out += "<label for='"+ID+"'></label>";
		out += "\n<includes>"+includesHtml+"</includes>\n";
	}

	out += "</class>\n"
	return out;
}












fs.promise = {};
fs.promise.readFile = function(filePath) {
	return new Promise(function(resolve, reject) {
		fs.readFile(filePath, function(err, data){
		    if(err){
		    	console.error("could not find", filePath);
		        reject(err);
		    } else {
		    	resolve(data);
		    }
		});	
	});
}

fs.promise.writeFile = function(outPath, data) {
	return new Promise(function(resolve) {
		fs.writeFile(outPath, data, resolve);	
	});
}

fs.promise.lstat = function(filePath) {
	return new Promise(function(resolve, reject) {
		fs.lstat(filePath, function(err, stats){
			if(err) reject();
			else resolve(stats);
		});
	});
}



fs.copyFolder = function(sourcePath, targetPath, startAtItems, deepCopy, baseSourcePath) {
	baseSourcePath = baseSourcePath || sourcePath;
	// if(baseSourcePath === undefined && sourcePath && startAtItems == false)
	// 	baseSourcePath = pathTool.basename(sourcePath);
	

	targetPath = targetPath || "";
	startAtItems = startAtItems || false;
	deepCopy = deepCopy === undefined ? true : deepCopy;

	// if(sourcePath && startAtItems == false)
	// 	targetPath += "/"+ 

	
	fs.ensureDirectoryExistence(targetPath);

	return new Promise(function(resolve) {
		var copyPromises = [];
		fs.readdir(sourcePath, function(err, files){
			if(err) {
				copyPromises.push(Promise.reject(err));
				return;
			}

			files.forEach(function(fileName){
				var targetDir = targetPath+"/"+fileName;
				var sourceDir = sourcePath+"/"+fileName;
				
				copyPromises.push(fs.promise.lstat(sourceDir)
				.then((stats) => {
					if(stats.isDirectory()) {
						if(deepCopy) {
							return fs.copyFolder(sourceDir, targetDir, false, deepCopy, baseSourcePath);
						}
						else
							return Promise.resolve();
					}
					
					else {
						return fs.copyFile(sourceDir, targetDir);
					}
				}));
			});
		});
		return Promise.all(copyPromises);
	});
}




fs.ensureDirectoryExistence = function(filePath) {
		filePath += "FAKE_FILE_HACK";
    var dirname = pathTool.dirname(filePath);
    if (fs.existsSync(dirname)) {
    	return true;
    }
    fs.ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}


fs.copyFile = function(source, target) {
	return new Promise(function(resolve, reject){
	  	var cbCalled = false;

	  	var rd = fs.createReadStream(source);
		rd.on("error", function(err) {
		    done(err);
		});

		fs.ensureDirectoryExistence(target);
	    var wr = fs.createWriteStream(target);
	    wr.on("error", function(err) {
	    	done(err);
	    });
	    wr.on("close", function(ex) {
	    	done();
	    });
	    rd.pipe(wr);

	    function done(err) {
	    	if (!cbCalled) {
	    		cbCalled = true;

	    		if(err){
	    			console.error(err);
	      			reject(err);
	    		}
	      		else
	      			resolve();
	    	}
	    }
	});
}

HAPI.getLast = function(arr){
	return arr[arr.length-1];
}



HAPI.run().then(function(){
	console.log("COMPLETE!");
});