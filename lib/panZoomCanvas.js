// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update January 2015
//
// Free to use and distribute at will
// So long as you are nice to people, etc

/* jshint strict: false */

/* global PanZoomCanvas:true */
/* global CanvasFunctions */

PanZoomCanvas = function(canvasId, imageSrc, reactCanvObj) {
	// gerenal inits
	this.canvasId = canvasId;
	this.imageObj = new Image();
	this.reactCanvObj = reactCanvObj;
	// pan zoom inits
	this.scaleFactor = 1;
	this.prevScaleFactor = 1;
	this.translation = {
		x: 0,
		y: 0
	};
	var self = this;
	// bind event handler
	this.imageObj.onload = function() {
		self.imageOnload();
	};

	this.imageObj.src = imageSrc;
};

PanZoomCanvas.prototype.imageOnload = function() {
	// image is loaded so we can define the limits of pan and zoom
	if (!this.reactCanvObj.clipped) {
		this.reactCanvObj.boundingRect = {
			x: 0,
			y: 0,
			w: this.imageObj.width,
			h: this.imageObj.height
		};
	}
	this.redraw = true;
};

PanZoomCanvas.prototype.mouseDown = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	self.dragStartMousePos = mouse;
	self.translationBeforeMovement = self.translation;
	self.isMouseDown = true;
};

PanZoomCanvas.prototype.mouseMove = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	if (!self.isMouseDown) {
		return;
	}
	
	var check = self.checkImageSize();

	var relTrans = {
		x: (mouse.x - self.dragStartMousePos.x) * self.scaleFactor * check.x,
		y: (mouse.y - self.dragStartMousePos.y) * self.scaleFactor * check.y
	};
	var newTotalTrans = {
		x: self.translation.x + relTrans.x,
		y: self.translation.y + relTrans.y
	};
	// perform the actial translation
	self.translate(relTrans);
	// store the translation to the total counter
	self.updateTotalTrans(newTotalTrans);
	// check if the image still fits in the canvas
	self.checkBounds();

	self.dragStartMousePos = mouse;

	this.redraw = true;
};

PanZoomCanvas.prototype.mouseUp = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	self.isMouseDown = false;
	self.reactCanvObj.translation = self.translation;

	if(self.translationBeforeMovement !== self.translation){
		return {consumed: true, stopPropagation: true};
	}
	return false;
};

PanZoomCanvas.prototype.translate = function(translation) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	// ctx.translate(-this.recentTotalTrans.x, -this.recentTotalTrans.y);
	// ctx.transform(1, 0, 0, 1, 0, 0);
	ctx.translate(translation.x, translation.y);
};

PanZoomCanvas.prototype.resetTransformation = function() {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	this.translation = {
		x: 0,
		y: 0
	};
	this.scaleFactor = 1;
};

PanZoomCanvas.prototype.updateTotalTrans = function(currentTrans) {
	this.translation = currentTrans;
};

PanZoomCanvas.prototype.draw = function(ctx) {
	if (!this.redraw) {
		return false;
	}
	var canvas = document.getElementById(this.canvasId);
	// check if a ctx is prodivded
	if (!ctx) {
		ctx = canvas.getContext('2d');
	}


	ctx.save();

	this.clear(canvas, ctx);

	if (this.reactCanvObj.clippedShape) {
		// CanvasFunctions.clipShapeOnCanvas(ctx, this.reactCanvObj.clippedShape);
	}
	ctx.drawImage(this.imageObj, 0, 0);

	// ctx.fillStyle = "red";
	// ctx.fillRect(-this.translation.x + (canvas.width/2 - this.reactCanvObj.boundingRect.w/2),-this.translation.y + (canvas.height/2 - this.reactCanvObj.boundingRect.h/2),100,100);

	ctx.restore();

	this.redraw = false;
	return true;

};

PanZoomCanvas.prototype.clear = function(canvas, ctx) {

	var self = this;
	// only clear the visible rectangle defined by the canvas
	var origin = {
		x: -self.translation.x,
		y: -self.translation.y
	};
	var canvasExpansion = {
		x: origin.x + canvas.width,
		y: origin.y + canvas.height
	};
	var transformedOrigin = self.transformCoord(origin);
	var transformedExpansion = self.transformCoord(canvasExpansion);

	var transformedDimension = {
		w: transformedExpansion.x - transformedOrigin.x,
		h: transformedExpansion.y - transformedOrigin.y
	};
	ctx.clearRect(transformedOrigin.x, transformedOrigin.y, transformedDimension.w, transformedDimension.h);
};

PanZoomCanvas.prototype.setScale = function(scale) {

	var self = this;
	if (scale === self.scaleFactor) {
		return;
	}

	var canvas = document.getElementById(self.canvasId);
	var ctx = canvas.getContext('2d');

	// problem hier:
	// 1,21 zoom != 1,20 zoom nochmal um 1,01 gezoomt
	// 1,20 * 1,01 != 1,21
	// -> 1,21 / 1,20 = relScale
	var relScale = scale / self.scaleFactor;
	self.scaleFactor = scale;

	var w = -self.translation.x + canvas.width / 2;
	var h = -self.translation.y + canvas.height / 2;

	ctx.transform(relScale, 0, 0, relScale, w, h);
	ctx.transform(1, 0, 0, 1, -w, -h);

	// check if the image still fits in the canvas
	self.checkBounds();

	self.redraw = true;
};

PanZoomCanvas.prototype.getMinScale = function() {

	var self = this;
	var canvas = document.getElementById(self.canvasId);
	var ctx = canvas.getContext('2d');

	return canvas.width / self.getBoundingRectWithOverhead().w;
};

PanZoomCanvas.prototype.translateDeltaX = function(delta) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	this.translation.x += delta;
	ctx.translate(delta, 0);
};

PanZoomCanvas.prototype.translateDeltaY = function(delta) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	this.translation.y += delta;
	ctx.translate(0, delta);
};

PanZoomCanvas.prototype.getBoundingRectWithOverhead = function() {

	var overhead = {
		x: this.reactCanvObj.boundingRect.w * 0,
		y: this.reactCanvObj.boundingRect.h * 0
	};
	var boundingRect = {
		x: this.reactCanvObj.boundingRect.x - overhead.x,
		y: this.reactCanvObj.boundingRect.y - overhead.y,
		w: this.reactCanvObj.boundingRect.w + overhead.x * 2,
		h: this.reactCanvObj.boundingRect.h + overhead.y * 2
	};
	return boundingRect;

};

PanZoomCanvas.prototype.checkImageSize = function() {

	var self = this;
	var canvas = document.getElementById(this.canvasId);
	var boundingRect = self.getBoundingRectWithOverhead();

	var checkX = false;
	var checkY = false;

	if (canvas.width < boundingRect.w * this.scaleFactor) {
		checkX = true;
	}
	if (canvas.height < boundingRect.h * this.scaleFactor) {
		checkY = true;
	}
	return {
		x: checkX,
		y: checkY
	};
};

PanZoomCanvas.prototype.checkBounds = function() {

	var self = this;
	var canvas = document.getElementById(this.canvasId);

	var check = self.checkImageSize();

	// calc current image dimensions
	var boundingRect = self.getBoundingRectWithOverhead();
	
	var w = canvas.width;
	var h = canvas.height;

	// check all 4 corners of the canvas viewport
	for (var x = 0; x < 2; x++) {
		for (var y = 0; y < 2; y++) {
			// calc coord of canvas bounds in the ctx system
			var coord = CanvasFunctions.transformCoord(this.canvasId, {
				x: -this.translation.x + w * x,
				y: -this.translation.y + h * y
			}, this.scaleFactor, this.translation);
			var delta = {
				x: coord.x - boundingRect.x - boundingRect.w * x,
				y: coord.y - boundingRect.y - boundingRect.h * y
			};
			if (check.x === true) {
				if (x === 0) {
					// top corners
					if (delta.x < 0) {
						this.translateDeltaX(delta.x);
					}
				} else {
					// bottom corners
					if (delta.x > 0) {
						this.translateDeltaX(delta.x);
					}
				}
			}
			if (check.y === true) {
				if (y === 0) {
					// left corners
					if (delta.y < 0) {
						this.translateDeltaY(delta.y);
					}
				} else {
					// right corners
					if (delta.y > 0) {
						this.translateDeltaY(delta.y);
					}
				}
			}
		}
	}
};

/* 
 * translate coord with current translation and scale
 * @param {object} coord - coord to translate
 * @return {object} coord - transformed coodinates
 */
PanZoomCanvas.prototype.translateCoord = function(coord) {

	var self = this;

	coord.x += -self.translation.x * 1 / self.scaleFactor;
	coord.y += -self.translation.y * 1 / self.scaleFactor;

	return coord;

};

/* 
 * transform coord with current transformations
 * @param {object} coord - coord to transform
 * @return {object} coord - transformed coodinates
 */
PanZoomCanvas.prototype.transformCoord = function(coord) {

	var self = this;

	coord = CanvasFunctions.transformCoord(self.canvasId, coord, self.scaleFactor, self.translation);

	return coord;

};

/* 
 * Get mouse position for given event
 * @param {object} e - mouse event
 * @return {object} coord - mouse coodinates
 */
PanZoomCanvas.prototype.getMousePosForEvent = function(e) {

	var self = this;
	var coord = {
		x: e.clientX,
		y: e.clientY
	};

	return self.getMousePos(coord);

};

/* 
 * Get mouse position for given coordinate
 * @param {object} coord - coord to transform
 * @return {object} coord - mouse coodinates
 */
PanZoomCanvas.prototype.getMousePos = function(coord) {

	var self = this;
	var translation = self.translation;
	// when the canvas is moving this needs to refert to the translation when the movement started
	if (self.isMouseDown === true) {
		translation = self.translationBeforeMovement;
	}
	return CanvasFunctions.getMouse(coord, translation, self.scaleFactor, self.canvasId);

};