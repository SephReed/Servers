

// 44100/16 = 2756

var downSampleRatio = 8;

var ws = new WebSocket('ws://localhost:4321');
ws.binaryType = 'arraybuffer';


ws.addEventListener('message', function (event) {
    var vals = new Uint8Array(event.data);
    // console.log('Message from server ', vals);
    // console.log('Message from server ', JSON.parse(event.data));

    // var vals = new Float32Array(12);

    self.postMessage(vals);
});


self.addEventListener('message', function(e) {
    if(ws.readyState != ws.OPEN) return;

    var data = e.data;


    var downSizeLength = ~~(data.length/downSampleRatio);
    console.log(downSizeLength);

    // var sendMe = new Float32Array(downSizeLength);
    // for(var i = 0; i < downSizeLength; i++) {
    //     sendMe[i] = data[i*downSampleRatio];
    // }

    var sendMe = new Uint8Array(downSizeLength);
    for(var i = 0; i < downSizeLength; i++) {
        var num = ((data[i*downSampleRatio]*1.5)+1.5)/3*255;
        num = Math.min(Math.max(num, 0), 255);
        // num = 255;
        sendMe[i] = num;
    }

    // console.log(sendMe);

    ws.send(sendMe.buffer);

}, false);