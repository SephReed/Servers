const pathTool = require('path');
const fs = exports.fs = require('fs');


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
