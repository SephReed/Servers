




UI = {};


UI.add = function(name, value, domNode) {
	UI[name] = new UI.item(name, value, domNode);
	return UI[name];
}





UI.item = function(name, value, domNode) {
	this.name = name;
	this.setDomNode(domNode);
	this.setValue(value);
}


UI.item.prototype.setDomNode = function(domNode) {
	this.domNode = domNode;
	if(this.domNodeListener)
		this.domNodeListener(domNode);
	this.sync();
};


UI.item.prototype.setValue = function(value) {
	this.value = value;
	this.sync();
};

UI.item.prototype.onValueChange = function(fn) {
	this.valueChangeListener = fn;
	this.sync();
};

UI.item.prototype.onDomNode = function(fn) {
	this.domNodeListener = fn;
	if(this.domNode)
		fn.call(this, this.domNode);
};


UI.item.prototype.sync = function() {
	if(this.value !== undefined && this.domNode && this.valueChangeListener) 
		this.valueChangeListener.call(this, this.value);
}







UI.item.prototype.setFromRangeValue = function(value) {
	var min = this.min || 0;
	var max = this.max || 1;
	var range = max-min;
	this.setValue(min+(range*(value/100.0)));
}

UI.item.prototype.convertToRangeValue = function() {
	var min = this.min || 0;
	var max = this.max || 1;
	var range = max-min;
	var ratio = (this.value - min)/range;
	return ratio * 100;
}














