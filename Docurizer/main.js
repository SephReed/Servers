var DOCZ = {};

const pathTool = require('path');
const rootFilePath = process.argv[2];
const fs = require('./libs/betterFs').fs;
const Scoperizer = require('./libs/Scoperizer/Scoperizer.js');
require('./libs/Scoperizer/augments/scopeChunks_toHtml.js').augment(Scoperizer);

const cppScopes = require('./libs/Scoperizer/scope_defs/cpp/scopes.js');
const cppParser = new Scoperizer.RuleSet(cppScopes);
// require('./libs/docurize_scopes.js').augment(cppParser);
// require('./libs/Scoperizer/cpp_classify.js').augment(cppParser);


// DOCZ.scopes = cppScopes;

// const generate_doc = require('./libs/generate_doc.js');

// DOCZ.docMaker = new generate_doc.Template("./libs/doc_template.html")


const Permeate = require('./libs/Scoperizer/Permeate.js');


DOCZ.limitFileCount = 1;
DOCZ.filesFound = 0;



DOCZ.files = {};
DOCZ.files.byPath = {};
DOCZ.files.list = [];
DOCZ.registerFile = function(file) {
	DOCZ.filesFound++;
	DOCZ.files.byPath[file.path] = file;
	DOCZ.files.list.push(file);

	console.log("file found", file.path);
}



cppParser.getScope("include").on("complete", function(scopeChunk) {
	var chunk = scopeChunk.getFirstSub(">string");
	if(chunk) {
		var include = chunk.getRawText().replace(/"/g, '');
		chunk.file.addInclude(include);
		scopeChunk.includePath = include;
	}
});







DOCZ.run = function() {
	
	DOCZ.assertViewer(rootFilePath)
	// .then(function(){
	console.log("RUN!");
	return DOCZ.sprout(rootFilePath).then(function(){
		var writePromises = [];

		var overview = {};
		overview.root = rootFilePath;

		var classes = DOCZ.classifyFiles(DOCZ.files.list);
		classes.list.forEach((classInfo) => {
			var doc = classInfo.getDoc();	
			writePromises.push(fs.promise.writeFile("renders/"+classInfo.relativeDirAndName+".doc.html", doc));
		})
		
		DOCZ.files.list.forEach((file) => {

			if(file.scopeChunk) {

				// var htmlVersion = DOCZ.htmlifySpacing(
				// 	`<link href='code_style.css' rel='stylesheet' type='text/css'>`
				// 	+ file.scopeChunk.getHtml().join('')
				// );

				var backSteps = file.relativeDir.replace(/[^/]+/g, '..');
				if(backSteps.length)
					backSteps+="/";
				// console.log(backSteps);

				var htmlVersion = `<link href='`+backSteps+`public/code_style.css' rel='stylesheet' type='text/css'>`
				+ `<script type="text/javascript" src="`+backSteps+`public/file_view.js"></script>`
				+ file.scopeChunk.toHtml();

				var outPath = file.path.replace(DOCZ.mootPath, "");
				outPath = "renders/"+outPath+".html";

				fs.ensureDirectoryExistence(outPath)
				writePromises.push(fs.promise.writeFile(outPath, htmlVersion));

				overview[file.path] = {
					includes: file.includePaths
				}
			}
			else {
				console.error("File:", file.nameAndExtension, "failed to scopify.  Skipping...")
			}
		});
		

		
		fs.ensureDirectoryExistence("renders/overview/");
		// writePromises.push(fs.promise.writeFile("renders/overview/file_data.json", JSON.stringify(overview)));

		// var includeOverviewHtml = DOCZ.createIncludeOrderOverview(rootFilePath, DOCZ.files.byPath);
		var includeOverviewHtml = DOCZ.createIncludeOrderOverview(classes);
		writePromises.push(fs.promise.writeFile("renders/overview/includeMap.html", includeOverviewHtml));

		return Promise.all(writePromises);

	}).catch(function(err) {
		console.error(err);
	});
}




DOCZ.sprout = function(filePath) {
	if(DOCZ.limitFileCount && DOCZ.limitFileCount <= DOCZ.filesFound)
		return Promise.resolve();

	if(DOCZ.files.byPath[filePath]) 
		return Promise.resolve(DOCZ.files.byPath[filePath]);

	var file = new DOCZ.class.File(filePath);
	DOCZ.registerFile(file);

	return file.scopifyText().then(function(){
		// console.log(file.includePaths);

		return Promise.all(
			file.includePaths
			.map(DOCZ.sprout)
		)
		.then(function(){
			return file;
		});
	}).catch(function(err){
		console.error(err);
	});
}














/******************************************
*
*		Class- ClassInfo
*
*****************************************/
DOCZ.class = {};


DOCZ.classifyFiles = function(files) {
	var classes = {};
	classes.byDirAndName = {};
	classes.list = [];
	classes.rootDirAndName;

	files.forEach((file) => {
		var dirAndName = pathTool.dirname(file.path)+'/'+file.name;

		if(classes.rootDirAndName == undefined)
			classes.rootDirAndName = dirAndName;

		var classObj = classes.byDirAndName[dirAndName];
		if(classObj == undefined) {
			classObj = classes.byDirAndName[dirAndName] = new DOCZ.class.ClassInfo(file);
			classes.list.push(classObj);
		}
		else classObj.addFile(file);		
	})

	classes.list.forEach((classInfo) => {
		classInfo.mineFiles();
	})

	return classes;
}


DOCZ.class.ClassInfo = function(originFile) {
	var THIS = this;
	THIS.includes = [];
	THIS.originFile = originFile;
	THIS.name = originFile.name;
	THIS.dirAndName = pathTool.dirname(originFile.path)+'/'+originFile.name;
	THIS.relativeDirAndName = originFile.relativeDir+"/"+originFile.name;
	THIS.files = {};

	// console.log(originFile, THIS.relativeDirAndName)

	THIS.functions = [];

	THIS.addFile(originFile);
}

// DOCZ.class.ClassInfo.prototype.getDoc = function() {
// 	var THIS = this;
// 	if(THIS.files["c"])
// 		return THIS.files["c"].getDoc();

// 	else if(THIS.files["cpp"])
// 		return THIS.files["cpp"].getDoc();

// 	else if(THIS.files["h"])
// 		return THIS.files["h"].getDoc();

// 	else if(THIS.files["hpp"])
// 		return THIS.files["hpp"].getDoc();
// };


DOCZ.class.ClassInfo.prototype.addFile = function(file) {
	var THIS = this;
	THIS.files[file.extension] = file;

	file.includes.forEach((includePath) => {
		var fullPath = file.getRelativePath(includePath);

		var classDirAndName = fullPath.replace(/\.[^/]*$/i, '');

		if(classDirAndName != THIS.dirAndName && THIS.includes.indexOf(classDirAndName == -1))
			THIS.includes.push(classDirAndName);


	})
}



DOCZ.class.ClassInfo.prototype.mineFiles = function() {
	var THIS = this;
	if(THIS.files["cpp"]) {
		var file = THIS.files["cpp"];

		var fnDefs = file.scopeChunk.getSubs("fnDef");
		fnDefs.forEach((fnDef) => {
			var functionInfo = {};
			functionInfo.scope = fnDef;
			
			var fnNameChunk = fnDef.getFirstSub(">fnDefHeader>fnCall>fnName");
			if(fnNameChunk == undefined) {
				console.error("\nERROR: No name found in fnHeader", fnDef.getRawText().substr(0, 32));
				console.error(fnDef.file.nameAndExtension);
				return;
			}
			functionInfo.name = fnNameChunk.getRawText();

			var returnType = fnDef.getFirstSub(">fnDefHeader>returnType");
			functionInfo.headerHtml = `<fnDefHeader>`;
			if(returnType)
				functionInfo.headerHtml += returnType.toHtml() + " ";
			functionInfo.headerHtml += fnDef.getFirstSub(">fnDefHeader>fnCall").toHtml();
			functionInfo.headerHtml += `<fnDefHeader>`;

			// console.log("START")
			var preCommentChunks = [];
			for(var ptr = fnDef.prevChunk; ptr != undefined; ptr = ptr.prevChunk) {
				// console.log(ptr.scope.name);
				if(ptr.scope.name == "comment" || ptr.scope.name == "multiLineComment")
					preCommentChunks.push(ptr);
				else if(ptr.scope.name != "LooseText")
					break;
			}

			functionInfo.longDesc = "";

			preCommentChunks.reverse().forEach((chunk) =>{
				var text;

				//get rid of comment identifiers
				if(chunk.scope.name = "comment")
					text = chunk.getRawText().replace(/^\/\//i, '');
				else if(chunk.scope.name = "multiLineComment") {
					text = chunk.getRawText().replace(/^\/\*\*/i, '');
					text = text.replace(/\*\*\/$/i, '');
				}

				//make sure each comment chunk ends nice
				if(text.charAt(text.length-1) == '.')
					text += "<br>";
				else if(text.charAt(text.length-1) != ' ')
					text += " ";

				//special cases for comment types
				if(text.startsWith("breif:"))
					functionInfo.breifDesc = text.replace(/breif:\s*/i, '');
				else if(text.startsWith("!!")) {}
					//do nothing, source code comment only
				else
					functionInfo.longDesc += text;
			});

			if(functionInfo.longDesc.length == 0)
				functionInfo.longDesc = "no description";

			THIS.functions.push(functionInfo);
		})
	}
	else {
		console.error("shit!  No .cpp file for class", THIS.name)
	}
}



DOCZ.class.ClassInfo.prototype.getDoc = function() {
	var THIS = this;

	if(THIS.doc !== undefined)
		return THIS.doc;

	var backSteps = THIS.relativeDirAndName.replace(/[^/]+/g, '..');
	backSteps = backSteps.replace(/[^\/]+$/i, '')
	backSteps = backSteps.replace(/^\/+/i, '')
	// if(backSteps.length)
	// 	backSteps += "/";

	console.log(backSteps)

	var out = ""
	out += `<link rel="stylesheet" type="text/css" href="`+backSteps+`public/code_style.css">\n`;
	out += `<link rel="stylesheet" type="text/css" href="`+backSteps+`public/doc_style.css">\n`;
	out += `<script type="text/javascript" src="`+backSteps+`public/file_view.js"></script>\n`;

	out += `<h1><keyComp>`+THIS.name+`</keyComp></h1>\n`;
	out += `<functions>\n`;

	THIS.functions.forEach((fn) => {
		out += `<function>\n`;
		out += `<fnHeader>`+fn.headerHtml+`</fnHeader>\n`;

		if(fn.breifDesc)
			out += `<h2>`+fn.breifDesc+`</h2>\n`;

		out += `<desc>\n`;
		out += fn.longDesc;
		out += `</desc>\n`;

		out += "<fileLinks>\n";
		for(var extension in THIS.files) {
			out += `<a href=".`+THIS.relativeDirAndName+`.`+extension+`.html#`+fn.name+`">(.`+extension+`)</a>`;
		}
		out += "</fileLinks>\n";
		
		out += `</function>\n`;
	})

	THIS.doc = out;
	return out;
}



/******************************************
*
*		Class- File
*
*****************************************/




DOCZ.class.File = function(filePath) {
	var THIS = this;
	THIS.path = filePath;


	if(DOCZ.mootPath == undefined) {
		DOCZ.mootPath = pathTool.dirname(filePath);
		console.log(DOCZ.mootPath);
	}

	THIS.relativeDir = pathTool
	.dirname(filePath)
	.replace(DOCZ.mootPath, '')
	.replace(/^\//i, '');
	


	THIS.nameAndExtension = pathTool.basename(THIS.path);
	var splitName = THIS.nameAndExtension.split('.');
	THIS.name = splitName[0];
	THIS.extension = splitName[1];
	THIS.includes = [];
	// THIS.includePaths = [];
	THIS.rawText;
	// THIS.allRegexs = {};

	if(THIS.extension == "h" || THIS.extension == "hpp") {
		var cppPath, cPath;
		cppPath = cPath = pathTool.dirname(THIS.path) +  "/" + THIS.name ;
		cppPath += ".cpp";
		cPath += ".c";

		if(fs.existsSync(cppPath)) {
			THIS.addInclude(THIS.name + ".cpp");
		}
		else if(fs.existsSync(cPath)) {
			THIS.addInclude(THIS.name + ".c");	
		}
	}
}





DOCZ.class.File.prototype.scopifyText = function() {
	var THIS = this;
	if(THIS.rawText == undefined) {
		return fs.promise.readFile(THIS.path)
		.then((data) => {
			// THIS.rawText = DOCZ.exitHtml(data+"");
			THIS.rawText = data+"";
			THIS.scopeChunk = cppParser.scopify(THIS);
			THIS.includePaths = THIS.includes.map((include) => {
				return THIS.getRelativePath(include);
			});
		});
	}

	else return Promise.resolve();
};


DOCZ.class.File.prototype.getRelativePath = function(path) {
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


DOCZ.class.File.prototype.addInclude = function(addMe) {
	if(this.includes.indexOf(addMe) == -1)
		this.includes.push(addMe);
}


DOCZ.class.File.prototype.getDoc = function () {
	var THIS = this;
	return DOCZ.docMaker.getDoc.then(()=>{
		var fillArgs = {
			className: THIS.name,
			functions: THIS.classFns ? THIS.classFns.all : []
		}
		return DOCZ.docMaker.fill(fillArgs);
	});
}










/******************************************
*
*		UI Stuff
*
*****************************************/

DOCZ.viewerDir = "public/default_viewer";
DOCZ.assertViewer = function(filePath) {
	return fs.copyFolder(DOCZ.viewerDir, "renders", true)
}


DOCZ.createIncludeOrderOverview = function(classes) {
	var classMap = classes.byDirAndName;

	var classInfo = classMap[classes.rootDirAndName];
	var includeDropID = 0;

	var out = `<link href='../public/overview.css' rel='stylesheet' type='text/css'>`;
	out += "<h1>Include Path Overview</h1>";


	var addedClasses = [];
	out += Permeate.from(classInfo, {
		childListName: "includes",
		breadthFirst: true,
		initFn: function(classInfo, state){
			if(classInfo == undefined){
				console.error("ClassInfo is undefined")
				return;
			}

			state.isRoot = addedClasses.length == 0;
			state.preAdded = addedClasses.indexOf(classInfo.dirAndName) != -1;
			if(state.preAdded == false)
				addedClasses.push(classInfo.dirAndName);
		},
		getChildFn: function(classInfo, childListItem, state) {
			return classMap[childListItem];
		},
		skipChildrenFn: function(classInfo, state){
			return state.preAdded;
		},
		postChildrenFn: function(classInfo, childResults, state) {
			if(classInfo == undefined){
				return "<class>missing class</class>";
			}

			var relativeNamePath = classInfo.relativeDirAndName.replace(/^\//i, '');
			var out = `<class>`;

			out += `<a href='../`+relativeNamePath+`.doc.html' target='file_content'`;
			out += state.preAdded ? `class='back_ref'>` : `>`;
			out += classInfo.name+`</a>`;

			if(state.preAdded == false) {
				for(var extension in classInfo.files) {
					if(extension != "doc") 
						out += "<a href='../"+relativeNamePath+"."+extension+".html' target='file_content' class='sameName'>(."+extension+")</a>";
				}

				if(childResults.length) {
					var ID = "inc_drop_"+includeDropID++;
					out += "<input type='checkbox' id='"+ID;
					out += state.isRoot ? "'' checked>" : "'>";
					out += "<label for='"+ID+"'></label>";
					out += "\n<includes>"

					out += childResults.join('\n');

					out += "</includes>\n";
				}
			}

			out += `</class>`;
			return out;
		}	

	})

	return out;
}




















DOCZ.getLast = function(arr){
	return arr[arr.length-1];
}


// eval(fs.readFileSync('libs/Scoperizer/scope_defs/cpp/scopes.js')+'');



DOCZ.run().then(function(){
	console.log("COMPLETE!");
});






