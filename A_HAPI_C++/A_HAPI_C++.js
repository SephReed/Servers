const path = require('path');
const rootFilePath = process.argv[2];
const fs = require('fs');





var HAPI = {};
eval(fs.readFileSync('scopes_c++.js')+'');

HAPI.mootPath = path.dirname(rootFilePath);

HAPI.files = {};
HAPI.registerFile = function(file) {
	HAPI.files[file.path] = file;
}


HAPI.writeFile = function(outPath, data) {
	return new Promise(function(resolve) {
		fs.writeFile(outPath, data, resolve);	
	});
}

HAPI.lstat = function(filePath) {
	return new Promise(function(resolve, reject) {
		fs.lstat(filePath, function(err, stats){
			if(err) reject();
			else resolve(stats);
		});
	});
}







HAPI.run = function() {
	
	HAPI.assertViewer(rootFilePath)
	// .then(function(){
	console.log("RUN!");
	return HAPI.sprout(rootFilePath).then(function(){
		var overview = {};
		overview.root = HAPI.files[rootFilePath].path;

		var writePromises = [];
		for(var path in HAPI.files) {
			var file = HAPI.files[path];

			var htmlVersion = HAPI.htmlify(file);

			var outPath = file.path.replace(HAPI.mootPath, "");
			outPath = "renders/"+outPath+".html";

			fs.ensureDirectoryExistence(outPath)
			writePromises.push(HAPI.writeFile(outPath, htmlVersion));

			overview[path] = {
				includes: file.includes.map(function(inc){ return inc.path; })
			}
		}

		// var overviewPath = overview.root.replace(HAPI.mootPath, "");
		var includeOverviewHtml = HAPI.createIncludeOrderOverview(overview.root, overview);
		includeOverviewHtml =  `<link href='overview/style.css' rel='stylesheet' type='text/css'>` + includeOverviewHtml;

		fs.ensureDirectoryExistence("renders/overview/null");
		writePromises.push(HAPI.writeFile("renders/overview/file_data.json", JSON.stringify(overview)));
		writePromises.push(HAPI.writeFile("renders/overview/includeMap.html", includeOverviewHtml));

		return Promise.all(writePromises);

	}).catch(function(err) {
		console.error(err);
	});
}

HAPI.createIncludeOrderOverview = function(path, map, state) {
	state = state || {
		added: []
	};

	if(state.added.indexOf(path) != -1)
		return;

	state.added.push(path);
	var file = map[path];
	// console.log(path, map);

	var out = "<class>";
	path = path.replace("test/", '');

	out += "<switch></switch><a href='../"+path+".html' target='file_content'>"+path+"</a>\n";

	// var childContainer = document.createElement("includes");
	// out.appendChild(childContainer);
	out += "<includes>"

	file.includes.forEach(function(inc) {
		var addMe = HAPI.createIncludeOrderOverview(inc, map, state);
		if(addMe)
			out += addMe;
	});

	out += "</includes></class>"
	return out;
}


HAPI.sprout = function(filePath) {
	if(HAPI.files[filePath]) 
		return Promise.resolve(HAPI.files[filePath]);

	var file = new HAPI.class.File(filePath);
	HAPI.registerFile(file);

	return file.isProcessed.then(function(){
		var promises = file.includes.map(function(inc){
			var path = inc.path;
			// delete inc.path;
			return HAPI.sprout(path).then(function(file){
				inc.file = file;
			});
		});

		// var promises = file.includes.map(HAPI.sprout);
		return Promise.all(promises).then(function(){
			return file;
		});
	}).catch(function(err){
		console.error(err);
	});
}




HAPI.htmlify = function(file) {
	file.unexitedText = file.rawText;
	file.rawText = HAPI.exitHtml(file.rawText)

	var out = HAPI.htmlifyScope(file).html;

	out = `<link href='code_style.css' rel='stylesheet' type='text/css'>` + out;
	out = HAPI.convertNonDisplayableHTMLChars(out);
	return out;
}


//TODO: progress regexs which don't fall into a scope to after the scope
//TODO: create an attribute for scopes which can interfere with the current ones end
//use for cases where read through / skip is effecient
HAPI.htmlifyScope = function(file, scopeInfo) {
	//variable to be returned at end
	var scopeChunk = new HAPI.class.ScopeChunk(file, scopeInfo);
	
	//allRegexs variable keeps track of shared info for file
	//regarding the locations of all matching scope starts and ends
	var allRegexs = file.allRegexs;

	var thisScope = scopeChunk.scope;
	var pointMatch = scopeChunk.pointMatch;

	//special case for matches that contain no sub space (ie. keywords, end after the match start)
	if(pointMatch && thisScope.end == undefined) {
		var text = pointMatch.text;
		scopeChunk.html = "<"+thisScope.name+">"+text+"</"+thisScope.name+">";
		scopeChunk.endIndex = pointMatch.index + text.length - 1;
		return scopeChunk;
	}


	var rawText = file.rawText,
		startMatchPointIDs = scopeChunk.startMatchPointIDs,
		endMatchPointIDs = scopeChunk.endMatchPointIDs,
		charStart = scopeChunk.startIndex,
		subScopes = thisScope.subScopes;


	var addLooseText = function(endIndex){
		if(thisScope && thisScope.startInclusive == false) {
			charStart = Math.max(charStart, pointMatch.index + pointMatch.text.length);
		}
		if(charStart < endIndex) {
			scopeChunk.html += rawText.substring(charStart, endIndex);
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
			scopeChunk.endIndex = regex.matchPoints[endPointID].index;
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
		for(var i in subScopes) {
			var regex = allRegexs[subScopes[i].start];
			var name = subScopes[i].name;
			var matchNum = startMatchPointIDs[name];
			

			if(matchNum != -1) {
				var scopeIndex = regex.matchPoints[matchNum].index;

				if(soonestScope == undefined || scopeIndex < soonestScopeIndex
				|| (scopeIndex == soonestScopeIndex && subScopes[i].priority > soonestScope.priority)){
					soonestScope = subScopes[i];
					soonestScopeIndex = scopeIndex;
					soonestScopeMatchID = matchNum;
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
			addLooseText(soonestScopeIndex);
			var outcome = HAPI.htmlifyScope(file, nextScopeInfo);

			scopeChunk.html += outcome.html;
			charStart = outcome.endIndex+1;

			for(name in outcome.endMatchPointUpdates)
				endMatchPointIDs[name] = outcome.endMatchPointUpdates[name];

			for(name in outcome.startMatchPointUpdates)
				startMatchPointIDs[name] = outcome.startMatchPointUpdates[name];
		}
	}

	
	//if this is a scoped case, do special things involving whether or not
	//the text start and end fall in or out of the tags
	//in either case, add the loose text to the output
	if(thisScope != HAPI.scopes.root){
		if(thisScope.endInclusive == false) {
			var endMatchID = endMatchPointIDs[thisScope.name];
			scopeChunk.endIndex -= allRegexs[thisScope.end].matchPoints[endMatchID].text.length;
			// scopeChunk.endIndex -= thisScope.end.length;
		}

		addLooseText(scopeChunk.endIndex+1);

		scopeChunk.html = "<"+thisScope.name+">"+scopeChunk.html+"</"+thisScope.name+">";

		if(thisScope.startInclusive == false)
			scopeChunk.html = pointMatch.text + scopeChunk.html;
	}
	else addLooseText(scopeChunk.endIndex+1);

	scopeChunk.startMatchPointUpdates = startMatchPointIDs;
	scopeChunk.endMatchPointUpdates = endMatchPointIDs;
	return scopeChunk;
}









HAPI.class = {};
HAPI.class.ScopeChunk = function(file, scopeInfo) {
	var THIS = this;
	THIS.html = "";
	THIS.subScopeChunks = [];
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
		THIS.pointMatch = allRegexs[THIS.scope.start].matchPoints[scopeInfo.matchID];
		THIS.startIndex = THIS.pointMatch.index;
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





HAPI.class.File = function(filePath) {
	

	var THIS = this;
	THIS.path = filePath;
	THIS.includes = [];
	THIS.rawText = "";
	THIS.allRegexs = {};
	THIS.isProcessed = new Promise(function(resolve, reject) {

		fs.readFile(filePath, function(err, data){
		    if(err){
		    	console.error("could not find", filePath);
		        reject();
		    } else {
		    	THIS.rawText = data+"";
		    	THIS.processText();
		    	resolve();
		    }
		});	
	});
}





HAPI.class.File.prototype.processText = function() {
	var THIS = this;

	var includes = THIS.rawText.match(/#include.+/g);
	if(includes) {
		includes.forEach(function(incLine){
			var addMe = {};
			addMe.rawText = incLine;

			incLine = incLine.match(/\".+\"/);
			if(incLine && incLine[0]) {
				incLine = incLine[0];
				incLine = incLine.substr(1, incLine.length-2);

				addMe.target = incLine;
				addMe.path = THIS.getRelativePath(incLine);


				THIS.includes.push(addMe);
			}
		});
	}
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

	return baseDir.reduce(function(sum, value){
		return sum + "/" + value;
	});
};









HAPI.exitHtml = function(exitMe) {
	// exitMe = exitMe.replace("<!--", '');
	exitMe = exitMe.replace(/&/g, '&amp;');
	exitMe = exitMe.replace(/</g, '&lt;');
	exitMe = exitMe.replace(/>/g, '&gt;');
	
	var tabs = exitMe.match(/\t+/g);

	if(tabs){
		var likelyTabAmount = tabs[tabs.length - 1].length + 1;
		var minAmount = -1;
		for(var i = 0; i < tabs.length; i++) {
			var numTabs = tabs[i].length;
			if(numTabs < minAmount || i == 0) {
				minAmount = numTabs;
			}			
		}

		var willRemove = Math.max(likelyTabAmount, minAmount);
		var regex = new RegExp("\n\t{"+willRemove+"}", "g");

		exitMe = exitMe.replace(regex, '\n');
	}

	return exitMe;
}

HAPI.convertNonDisplayableHTMLChars = function(showMe) {
	return showMe.replace(/\t/g, '&emsp;')
	.replace(/\n/g, '<br>\n');
}




HAPI.viewerDir = "default_viewer";
HAPI.assertViewer = function(filePath) {
	return fs.copyFolder(HAPI.viewerDir, "renders", true)
}








fs.copyFolder = function(sourcePath, targetPath, startAtItems, deepCopy, baseSourcePath) {
	baseSourcePath = baseSourcePath || sourcePath;
	// if(baseSourcePath === undefined && sourcePath && startAtItems == false)
	// 	baseSourcePath = path.basename(sourcePath);
	

	targetPath = targetPath || "";
	startAtItems = startAtItems || false;
	deepCopy = deepCopy === undefined ? true : deepCopy;

	// if(sourcePath && startAtItems == false)
	// 	targetPath += "/"+ 

	console.log("copyFromTo", sourcePath, targetPath);

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
				console.log("dircopyFromTo", targetDir, sourceDir);

				copyPromises.push(HAPI.lstat(sourceDir)
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
	console.log(filePath);
    var dirname = path.dirname(filePath);
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


HAPI.run().then(function(){
	console.log("COMPLETE!");
});