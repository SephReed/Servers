
IS_OFF = false;


function createAudioSendNode(audioCtx) {
	var limit = -1;
	var count = 0;

	var worker = new Worker('/js/downsampler.js');

	// Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
	var scriptNode = audioCtx.createScriptProcessor(512, 1, 1);
	console.log(scriptNode.bufferSize);



	// Give the node a function to process audio events
	scriptNode.onaudioprocess = function(audioProcessingEvent) {
		if(IS_OFF) return;

		if(limit == -1 || count < limit) {
			// The input buffer is the song we loaded earlier
			var inputBuffer = audioProcessingEvent.inputBuffer;
			var signal = inputBuffer.getChannelData(0);

			var output = audioProcessingEvent.outputBuffer.getChannelData(0);
			for(var i = 0; i < signal.length; i++) {
				output[i] = signal[i];
			}


			// console.log(signal);
			worker.postMessage(signal); 
		}
		count++;
	}

	return scriptNode;
}


function switchSendNodesOffOn(isOff) {
	if(isOff === undefined)
		IS_OFF = !IS_OFF;

	else IS_OFF = isOff;
}