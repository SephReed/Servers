var DOCZ = {};

const pathTool = require('path');
const rootFilePath = process.argv[2];
const fs = require('./libs/betterFs').fs;
const Scoperizer = require('./libs/Scoperizer/Scoperizer.js');
const cppScopes = require('./libs/Scoperizer/scope_defs/cpp/scopes.js');
const gemOfToHtml = require('./libs/Scoperizer/augments/scopeChunks_toHtml.js');
gemOfToHtml.augment(Scoperizer);



const gemOfDocurization = require('./libs/docurize_scopes.js');
gemOfDocurization.augment(cppScopes);


const cppRuleSet = new Scoperizer.RuleSet(cppScopes);

// DOCZ.scopes = cppScopes;

const generate_doc = require('./libs/generate_doc.js');

DOCZ.docMaker = new generate_doc.Template("./libs/doc_template.html")


// DOCZ.limitFileCount = 2;
DOCZ.filesFound = 0;



DOCZ.files = {};
DOCZ.registerFile = function(file) {
	DOCZ.filesFound++;
	DOCZ.files[file.path] = file;
}






cppRuleSet.getScope("include").on("complete", function(scopeChunk) {
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
		for(var path in DOCZ.files) {
			let file = DOCZ.files[path];

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

				overview[path] = {
					includes: file.includePaths
				}


				//MAKING OF DOCS
				writePromises.push(file.getDoc()
					.then((doc) => {
						fs.promise.writeFile("renders/"+file.name+".html", doc)
					})
				);
			}
			else {
				console.error("File:", file.nameAndExtension, "failed to scopify.  Skipping...")
			}
		}

		
		fs.ensureDirectoryExistence("renders/overview/");
		// writePromises.push(fs.promise.writeFile("renders/overview/file_data.json", JSON.stringify(overview)));

		var includeOverviewHtml = DOCZ.createIncludeOrderOverview(rootFilePath, DOCZ.files);
		writePromises.push(fs.promise.writeFile("renders/overview/includeMap.html", includeOverviewHtml));

		return Promise.all(writePromises);

	}).catch(function(err) {
		console.error(err);
	});
}




DOCZ.sprout = function(filePath) {
	if(DOCZ.limitFileCount && DOCZ.limitFileCount <= DOCZ.filesFound)
		return Promise.resolve();

	if(DOCZ.files[filePath]) 
		return Promise.resolve(DOCZ.files[filePath]);

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
*		Class- File
*
*****************************************/



DOCZ.class = {};
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

	var nonHeader = filePath.replace(/(hpp|h)$/i, "cpp");
	if(nonHeader != filePath)
		THIS.includes.push(pathTool.basename(nonHeader));
}





DOCZ.class.File.prototype.scopifyText = function() {
	var THIS = this;
	if(THIS.rawText == undefined) {
		return fs.promise.readFile(THIS.path)
		.then((data) => {
			// THIS.rawText = DOCZ.exitHtml(data+"");
			THIS.rawText = data+"";
			THIS.scopeChunk = cppRuleSet.scopify(THIS);
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

DOCZ.includeDropID = 0;
DOCZ.createIncludeOrderOverview = function(filePath, map, state) {
	var out = "";

	if(state === undefined) {
		state = { added: [] };	
		out += `<link href='../public/overview.css' rel='stylesheet' type='text/css'>`;
		out += "<h1>Include Path Overview</h1>";
	}

	var file = map[filePath];
	

	if(state.added.indexOf(filePath) != -1){
		return "<class><a href='../"+file.relativeDir+"/"+file.name+".html' target='file_content' class='back_ref'>"+file.name+"</a></class>";
	}
	state.added.push(filePath);


	var preOpened = state.added.length == 1;
	
	out += "<class>\n";
	filePath = filePath.replace("test/", '');

	out += "<a href='../"+file.relativeDir+"/"+file.name+".html' target='file_content'>"+file.name+"</a>";
	out += "<a href='../"+file.relativeDir+"/"+file.nameAndExtension+".html' target='file_content' class='sameName'>(.hpp)</a>"

	var includesHtml = "";
	// var splitName = pathTool.basename(filePath).split('.');
	if(file.includePaths) {
		file.includePaths.forEach(function(inc) {
			if(map[inc] !== undefined) {
				// var incSplitName = pathTool.basename(inc).split('.');
				if(inc.name == file.name){
					if(inc.extension != file.extension){
						inc = inc.replace("test/", '');
						out += "<a href='../"+inc.relativeDir+"/"+inc.nameAndExtension+".html' target='file_content' class='sameName'>(."+inc.extension+")</a>";
					}

					else console.error("file includes in self", filePath);
				}
				else {
					var addMe = DOCZ.createIncludeOrderOverview(inc, map, state);
					if(addMe)
						includesHtml += addMe;
				}	
			}
			else console.error("skipping includes", inc)
		});
	}

	if(includesHtml.length){
		var ID = "inc_drop_"+DOCZ.includeDropID++;
		out += "<input type='checkbox' id='"+ID;
		out += preOpened ? "'' checked>" : "'>";
		out += "<label for='"+ID+"'></label>";
		out += "\n<includes>"+includesHtml+"</includes>\n";
	}

	out += "</class>\n"
	return out;
}













DOCZ.getLast = function(arr){
	return arr[arr.length-1];
}


// eval(fs.readFileSync('libs/Scoperizer/scope_defs/cpp/scopes.js')+'');



DOCZ.run().then(function(){
	console.log("COMPLETE!");
});






