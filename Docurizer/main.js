var DOCZ = {};

const pathTool = require('path');
const rootFilePath = process.argv[2];
const fs = require('./libs/betterFs').fs;
const Scoperizer = require('./libs/Scoperizer/Scoperizer.js');
require('./libs/Scoperizer/augments/scopeChunks_toHtml.js').augment(Scoperizer);

const cppScopes = require('./libs/Scoperizer/scope_defs/cpp/scopes.js');
const cppParser = new Scoperizer.RuleSet(cppScopes);
require('./libs/docurize_scopes.js').augment(cppParser);
// require('./libs/Scoperizer/cpp_classify.js').augment(cppParser);


// DOCZ.scopes = cppScopes;

const generate_doc = require('./libs/generate_doc.js');

DOCZ.docMaker = new generate_doc.Template("./libs/doc_template.html")


const Permeate = require('./libs/Permeate.js');


// DOCZ.limitFileCount = 2;
DOCZ.filesFound = 0;



DOCZ.files = {};
DOCZ.files.byPath = {};
DOCZ.files.list = [];
DOCZ.registerFile = function(file) {
	DOCZ.filesFound++;
	DOCZ.files.byPath[file.path] = file;
	DOCZ.files.list.push(file);
}



cppParser.getScope("include").on("complete", function(scopeChunk) {
	var chunk = scopeChunk.getFirstSub(">string");
	if(chunk) {
		var include = chunk.file.rawText.substring(chunk.startIndex+1, chunk.endIndex);
		chunk.file.addInclude(include);
		scopeChunk.includePath = include;
	}
});







DOCZ.run = function() {
	
	DOCZ.assertViewer(rootFilePath)
	// .then(function(){
	console.log("RUN!");
	return DOCZ.sprout(rootFilePath).then(function(){
		var overview = {};
		overview.root = rootFilePath;

		

		var writePromises = [];
		DOCZ.files.list.forEach((file) => {

			if(file.scopeChunk) {

				// var htmlVersion = DOCZ.htmlifySpacing(
				// 	`<link href='code_style.css' rel='stylesheet' type='text/css'>`
				// 	+ file.scopeChunk.getHtml().join('')
				// );

				var backSteps = file.relativeDir.replace(/[^/]+/g, '..');
				if(backSteps.length)
					backSteps+="/";
				console.log(backSteps);

				var htmlVersion = `<link href='`+backSteps+`public/code_style.css' rel='stylesheet' type='text/css'>`
				+ `<script type="text/javascript" src="`+backSteps+`public/file_view.js"></script>`
				// + DOCZ.htmlifySpacing(file.scopeChunk.getHtml().join(''));
				// + DOCZ.htmlifySpacing(file.scopeChunk.toHtml());
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


		var classes = DOCZ.classifyFiles(DOCZ.files.list);
		classes.list.forEach((classInfo) => {
			writePromises.push(classInfo.getDoc()
				.then((doc) => {
					fs.promise.writeFile("renders/"+classInfo.relativeDirAndName+".doc.html", doc)
					classInfo.doc = doc;
				})
			);	
		})
		

		
		fs.ensureDirectoryExistence("renders/overview/");
		// writePromises.push(fs.promise.writeFile("renders/overview/file_data.json", JSON.stringify(overview)));

		// var includeOverviewHtml = DOCZ.createIncludeOrderOverview(rootFilePath, DOCZ.files.byPath);
		var includeOverviewHtml = DOCZ.createIncludeOrderOverview(rootFilePath.replace(/\..*$/i, ''), classes.byDirAndName);
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

	files.forEach((file) => {
		var dirAndName = file.path.replace(/\..*$/i, '');

		var classObj = classes.byDirAndName[dirAndName];
		if(classObj == undefined) {
			classObj = classes.byDirAndName[dirAndName] = new DOCZ.class.ClassInfo(file);
			classes.list.push(classObj);
		}
		else classObj.addFile(file);
		
	})

	return classes;
}


DOCZ.class.ClassInfo = function(originFile) {
	var THIS = this;
	THIS.includes = [];
	THIS.originFile = originFile;
	THIS.name = originFile.name;
	THIS.dirAndName = originFile.path.replace(/\..*$/i, '');
	THIS.relativeDirAndName = originFile.relativeDir+"/"+originFile.name;
	THIS.files = {};

	THIS.addFile(originFile);
}

DOCZ.class.ClassInfo.prototype.getDoc = function() {
	var THIS = this;
	if(THIS.files["h"])
		return THIS.files["h"].getDoc();

	else if(THIS.files["hpp"])
		return THIS.files["hpp"].getDoc();

	else if(THIS.files["c"])
		return THIS.files["c"].getDoc();

	else if(THIS.files["cpp"])
		return THIS.files["cpp"].getDoc();
};


DOCZ.class.ClassInfo.prototype.addFile = function(file) {
	var THIS = this;
	THIS.files[file.extension] = file;

	file.includes.forEach((includePath) => {
		var fullPath = file.getRelativePath(includePath);

		var classDirAndName = fullPath.replace(/\..*$/i, '');

		if(classDirAndName != THIS.dirAndName && THIS.includes.indexOf(classDirAndName == -1))
			THIS.includes.push(classDirAndName);
	})
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
	THIS.allRegexs = {};

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


DOCZ.createIncludeOrderOverview = function(dirAndName, classMap, state) {


	var classInfo = classMap[dirAndName];
	var includeDropID = 0;

	var out = `<link href='../public/overview.css' rel='stylesheet' type='text/css'>`;
	out += "<h1>Include Path Overview</h1>";


	var addedClasses = [];
	out += Permeate.from(classInfo, {
		childListName: "includes",
		breadthFirst: true,
		initFn: function(classInfo, state){
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






