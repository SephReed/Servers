//@args.initFn - A function to happen on each finding of a node
//@args.postChildrenFn - A function to happen after being called for all the children
//@args.breadthFirst - boolean
exports.from = function(rootNode, args) {
	if(args.initFn == undefined && args.postChildrenFn == undefined) return;

	if(args.childListName == undefined) {
		console.error("args.childListName must be defined");
		return;
	}




	// args.state = {};
	args.rootNode = rootNode;

	if(args.isAsync !== true) {
		if(args.breadthFirst !== true)
			return exports.syncDepthFirst(rootNode, args);
		else
			return exports.syncBreadthFirst(rootNode, args);
	}
	else console.error("Async Permeate not created yet");
}



// 	depth first
// 		a
// 	   / \
// 	  b   e
// 	 / \ / \
// 	c  d f  g
exports.syncDepthFirst = function(node, args) {
	var THIS = node;

	var state = {};

	if(args.initFn)
		args.initFn(THIS, state);

	var childResults = [];	
	if(args.skipChildrenFn == undefined || args.skipChildrenFn(THIS, state) == false) {
		THIS[args.childListName].forEach((child) =>{
			if(args.getChildFn)
				child = args.getChildFn(THIS, child, state);
			childResults.push(exports.syncDepthFirst(child, args));
		});
	}
	else console.log("Skipping children", THIS.name)

	return args.postChildrenFn ? args.postChildrenFn(THIS, childResults, state) : undefined;
}




// 	breadth first
// 		a
// 	   / \
// 	  b   c
// 	 / \ / \
// 	d  e f  g
exports.syncBreadthFirst = function(rootNode, args) {
	if(rootNode == undefined) {
		console.error("rootNode is undefined.  returning 42")
		return 42;
	}

	var THIS = rootNode;

	var rootState = {};

	if(args.initFn) 
		args.initFn(THIS, rootState);


	//special case for skipping all steps when no children exist from root
	if(THIS[args.childListName] === undefined || THIS[args.childListName].length == 0) {
		// console.log(THIS, args.childListName);
		return args.postChildrenFn ? args.postChildrenFn(THIS, [], rootState) : undefined;
	}

	var stepsInOrder = [{
		node: THIS,
		state: rootState,
	}]
	// var chunkStartPositions = []
	// var postSubCollectionsFns = [];

	//go through each chunk, first initing, then appending subs to list
	//does root, then all children, then all grandchildren, ...
	for(var i = 0; i < stepsInOrder.length; i++) {
		var node = stepsInOrder[i].node;
		var state = stepsInOrder[i].state
		
		if(args.skipChildrenFn == undefined || args.skipChildrenFn(node, state) == false) {
			node[args.childListName].forEach((child) => {
				if(args.getChildFn)
					child = args.getChildFn(node, child, state);

				var childState = {};

				if(args.initFn) 
					args.initFn(child, childState);

				// if(child[args.childListName] && child[args.childListName].length)	
					stepsInOrder.push({node: child, state: childState});
			});
		}
		else state.childrenSkipped = true;
	}

	//if no postChildrenFn, theres nothing to gather in reverse from children
	if(args.postChildrenFn == undefined)
		return;



	//for each chunk in reverse breadth order
	//if its children were explicitly skipped, it has no childResults
	//otherwise, pull from the results stack as many results as there are children
	//these will always be the correct results (but in reverse order)
	//process the childResults, and push the result onto the stack
	var resultsInOrder = [];
	while(step = stepsInOrder.pop()) {
		var node = step.node;
		var state = step.state;

		var childResults;
		if(state.childrenSkipped != true) {
			childResults = resultsInOrder.splice(0, node[args.childListName].length);
		}
		else childResults = [];

		resultsInOrder.push(args.postChildrenFn(node, childResults.reverse(), state));
	}

	if(resultsInOrder.length != 1)
		console.error("At rootChunk but wrong number of results on stack (should be 1)", resultsInOrder.length)

	return resultsInOrder.pop();
}







/********************************
*    TESTING
*********************************/


if(process.argv[1] == __filename) {
	console.log("TESTING SCOPERIZER");

	var testName = process.argv[2];

	if(testName == "breadth") {
		var rootNode = {
			ID: 0,
			childNodes: [
				{	
					ID: 1 ,
					childNodes: [
						{ ID: 2, childNodes: []},
						{ ID: 3, childNodes: []},
						{ ID: 4, childNodes: []}
					]
				},
				{	
					ID: 5 ,
					childNodes: [
						{ ID: 6, childNodes: []},
						{ ID: 7, childNodes: []},
						{ ID: 8, childNodes: []}
					]
				},
				{	
					ID: 9 ,
					childNodes: [
						{ ID: 10, childNodes: []},
						{ ID: 11, childNodes: []},
						{ ID: 12, childNodes: []}
					]
				}
			]
		}



		console.log(exports.from(rootNode, {
			breadthFirst: true,
			childListName: "childNodes",
			initFn: function(node, state) {
				console.log(node.ID);
			},
			postChildrenFn: function(node, childResults, state){
				console.log(childResults);
				childResults.unshift(node.ID);
				return childResults.join(",");
			}
		}));

	}
	else console.error(`Test "`+testName+`" not found`);
}


