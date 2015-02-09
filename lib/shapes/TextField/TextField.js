// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Polygon objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
/* jshint strict: false */

/*global TextField:true */
/*global Shape */

TextField = function(text, canvasStateObj, parentShapeCollection, parentShapeId) {
	this.canvasStateObj = canvasStateObj;
	this.text = text;
	this.h = 20;
	this.parentShapeCollection = parentShapeCollection;
	this.parentShapeId = parentShapeId;
};

// subclass
TextField.prototype = new Shape();

TextField.prototype.initPosition = function (argument) {
	var shape = this.parentShapeCollection.findOne({_id: this.parentShapeId});
	if(shape && shape.textPos){
		this.setPosition(shape.textPos.x, shape.textPos.y, this.canvasStateObj.canvasId);
	}
};

TextField.prototype.draw = function(ctx) {
	if (this.valid === false) {
		// update the database
		this.parentShapeCollection.update({
			_id: this.parentShapeId
		}, {
			$set: {
				textPos: {
					x: this.x + (this.w / 2),
					y: this.y + (this.h / 2)
				}
			}
		});
		this.valid = true;
	}

	if(!this.x && !this.y){
		this.initPosition();
	}

	ctx.save();
	ctx.font = '20px Helvetica Neue';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillStyle = 'black';
	ctx.fillText(this.text, this.x, this.y);
	ctx.restore();

	if (this.selected) {
		this.drawHandles(ctx);
	}
};

TextField.prototype._mouseUp = function(e, mouse) {
	if(this.contains(mouse.x, mouse.y)) {
		this.selected = true;
		this.isTouched = false;
		return true;
	}else{
      	this._deselect();
      	return false;
	}
};

TextField.prototype._mouseDown = function(e, mouse) {
	this.dragoff = {
		x: mouse.x - this.x,
		y: mouse.y - this.y
	};
	this.dragging = true;
	if(this.contains(mouse.x, mouse.y)){
		this.isTouched = true;
	}
};

TextField.prototype._mouseMove = function(e, mouse) {
	if (this.dragging) {
		this.translate(e, mouse);
		this.valid = false;
	}
};

TextField.prototype.translate = function(e, mouse) {
	var translation = {
		x: mouse.x - this.dragoff.x,
		y: mouse.y - this.dragoff.y
	};
	this.x = translation.x;
	this.y = translation.y;
};

TextField.prototype._select = function() {
	this.selected = true;
};
TextField.prototype._deselect = function() {
	this.selected = false;
	this.dragging = false;
};

TextField.prototype.setPosition = function(x, y, canvasId, invalidate) {
	var canvas = document.getElementById(canvasId);
	if(!canvas){
		return;
	}
	var ctx = canvas.getContext('2d');

	ctx.save();
	ctx.font = '20px Helvetica Neue';
	this.w = ctx.measureText(this.text).width;
	ctx.restore();
	this.x = x - (this.w / 2);
	this.y = y - (this.h / 2);

	if (invalidate !== false) {
		this.valid = false;
	}
};