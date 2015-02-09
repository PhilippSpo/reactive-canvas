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
	this.reactCanvObj.valid = false;
};

PanZoomCanvas.prototype.mouseDown = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	self.dragStartMousePos = mouse;
	self.isMouseDown = true;
};

PanZoomCanvas.prototype.mouseMove = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	if (!self.isMouseDown) {
		return;
	}
	var relTrans = {
		x: (mouse.x - self.dragStartMousePos.x) * self.scaleFactor,
		y: (mouse.y - self.dragStartMousePos.y) * self.scaleFactor
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
};

PanZoomCanvas.prototype.mouseUp = function(e) {

	var self = this;
	var mouse = self.getMousePosForEvent(e);

	self.isMouseDown = false;
	self.reactCanvObj.translation = self.translation;
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
	this.reactCanvObj.translation = this.translation;
};

PanZoomCanvas.prototype.draw = function(ctx) {
	var canvas = document.getElementById(this.canvasId);
	// check if a ctx is prodivded
	if (!ctx) {
		ctx = canvas.getContext('2d');
	}

	// this.clear(canvas, ctx);

	ctx.save();
	if (this.reactCanvObj.clippedShape) {
		CanvasFunctions.clipShapeOnCanvas(canvas, this.reactCanvObj.clippedShape);
	}
	ctx.drawImage(this.imageObj, 0, 0);

	ctx.restore();
};

PanZoomCanvas.prototype.clear = function(canvas, ctx) {

	var self = this;
	// only clear the visible rectangle defined by the canvas
	var canvasOrigin = {
		x: 0,
		y: 0
	};
	var canvasExpansion = {
		x: canvas.width,
		y: canvas.height
	};
	var transformedOrigin = self.transformCoord(canvasOrigin);//CanvasFunctions.transformCoord(this.canvas, canvasOrigin, this.panZoomLayer.scaleFactor, this.panZoomLayer.translation);
	var transformedExpansion = self.transformCoord(canvasExpansion);//CanvasFunctions.transformCoord(this.canvas, canvasExpansion, this.panZoomLayer.scaleFactor, this.panZoomLayer.translation);
	console.log(transformedExpansion);
	var transformedDimension = {
		w: transformedExpansion.x,
		h: transformedExpansion.y
	};
	ctx.clearRect(transformedOrigin.x, transformedOrigin.y, transformedDimension.w, transformedDimension.h);
};

PanZoomCanvas.prototype.setScale = function(scale) {
	if (scale === this.scaleFactor) {
		return;
	}
	if (this.checkScale(scale) === false) {
		return;
	}

	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	// calc current image dimensions
	var currentImageWidth = this.imageObj.width * scale;
	var currentImageHeight = this.imageObj.height * scale;
	// case 1: image smaller than container
	if (canvas.width > currentImageWidth || canvas.height > currentImageHeight) {
		return;
	}

	// problem hier:
	// 1,21 zoom != 1,20 zoom nochmal um 1,01 gezoomt
	// 1,20 * 1,01 != 1,21
	// -> 1,21 / 1,20 = relScale
	var relScale = scale / this.scaleFactor;
	this.scaleFactor = scale;

	var w = -this.translation.x + canvas.width / 2;
	var h = -this.translation.y + canvas.height / 2;

	// ctx.setTransform( scale, 0, 0, scale, w, h);
	ctx.transform(relScale, 0, 0, relScale, w, h);
	ctx.transform(1, 0, 0, 1, -w, -h);

	// check if the image still fits in the canvas
	this.checkBounds();

	this.reactCanvObj.valid = false;
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

PanZoomCanvas.prototype.checkScale = function(scale) {
	var canvas = document.getElementById(this.canvasId);
	var canvasOrigin = CanvasFunctions.transformCoord(this.canvasId, {
		x: -this.translation.x,
		y: -this.translation.y
	}, scale, this.translation);
	var canvasExpansion = CanvasFunctions.transformCoord(this.canvasId, {
		x: -this.translation.x + canvas.width,
		y: -this.translation.y + canvas.height
	}, scale, this.translation);

	var CanvasDimensions = {
		x: canvasExpansion.x - canvasOrigin.x,
		y: canvasExpansion.y - canvasOrigin.y
	};

	if (CanvasDimensions.x > this.reactCanvObj.boundingRect.w || CanvasDimensions.y > this.reactCanvObj.boundingRect.h) {
		return false;
	}
	return true;
};

PanZoomCanvas.prototype.checkBounds = function() {
	var canvas = document.getElementById(this.canvasId);
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
				x: coord.x - this.reactCanvObj.boundingRect.x - this.reactCanvObj.boundingRect.w * x,
				y: coord.y - this.reactCanvObj.boundingRect.y - this.reactCanvObj.boundingRect.h * y
			};
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

	return CanvasFunctions.getMouse(coord, self.translation, self.scaleFactor, self.canvasId);

};