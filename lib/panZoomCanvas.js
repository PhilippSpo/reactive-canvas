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
	this.imageObj.onload = function(){
		self.imageOnload();
	};

	this.imageObj.src = imageSrc;
};

PanZoomCanvas.prototype.imageOnload = function(e, mouse) {
	// image is loaded so we can define the limits of pan and zoom
	this.reactCanvObj.boundingRect = {
		x: 0,
		y: 0,
		w: this.imageObj.width,
		h: this.imageObj.height
	};
};

PanZoomCanvas.prototype.mousedown = function(e) {
	var mouse = CanvasFunctions.getMouse(e, this.translation, this.scaleFactor, this.canvasId);
	this.dragStartMousePos = mouse;
	this.mouseDown = true;
};

PanZoomCanvas.prototype.mousemove = function(e) {
	var mouse = CanvasFunctions.getMouse(e, this.translation, this.scaleFactor, this.canvasId);
	if (!this.mouseDown) {
		return;
	}
	var relTrans = {
		x: (mouse.x - this.dragStartMousePos.x),
		y: (mouse.y - this.dragStartMousePos.y)
	};
	var newTotalTrans = {
		x: this.translation.x + relTrans.x,
		y: this.translation.y + relTrans.y
	};	
	// perform the actial translation
	this.translate(relTrans);
	// store the translation to the total counter
	this.updateTotalTrans(newTotalTrans);
	// check if the image still fits in the canvas
	this.checkBounds();

	this.dragStartMousePos = mouse;
};

PanZoomCanvas.prototype.mouseup = function(e) {
	var mouse = CanvasFunctions.getMouse(e, this.translation, this.scaleFactor, this.canvasId);
	this.recentDragPos = mouse;
	this.mouseDown = false;
	this.reactCanvObj.translation = this.translation;
};

PanZoomCanvas.prototype.translate = function(translation) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	// ctx.translate(-this.recentTotalTrans.x, -this.recentTotalTrans.y);
	// ctx.transform(1, 0, 0, 1, 0, 0);
	ctx.translate(translation.x, translation.y);
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

	ctx.drawImage(this.imageObj, 0, 0);
};

PanZoomCanvas.prototype.setScale = function(scale) {
	if (scale === this.scaleFactor) {
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

PanZoomCanvas.prototype.checkBounds = function() {
	var canvas = document.getElementById(this.canvasId);
	var w = canvas.width;
	var h = canvas.height;
	var imgW = this.imageObj.width;
	var imgH = this.imageObj.height;
	console.log(this.reactCanvObj.boundingRect);
	// check all 4 corners of the canvas viewport
	for (var x = 0; x < 2; x++) {
		for (var y = 0; y < 2; y++) {
			// calc coord of canvas bounds in the ctx system
			var coord = CanvasFunctions.transformCoord(this.canvasId, {
				x: -this.translation.x + w * x,
				y: -this.translation.y + h * y
			}, this.scaleFactor, this.translation);
			var delta = {
				x: coord.x - this.reactCanvObj.boundingRect.w * x,
				y: coord.y - this.reactCanvObj.boundingRect.h * y
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