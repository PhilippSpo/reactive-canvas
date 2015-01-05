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
/* global $ */

PanZoomCanvas = function(canvasId, imageSrc, reactCanvObj) {
	// gerenal inits
	this.canvasId = canvasId;
	this.imageObj = new Image();
	this.reactCanvObj = reactCanvObj;
	// pan zoom inits
	this.scaleFactor = 1;
	this.translation = {
		x: 0,
		y: 0
	};
	// bind event handler
	this.imageObj.onload = this.imageOnload;

	this.imageObj.src = imageSrc;
};

PanZoomCanvas.prototype.imageOnload = function(e, mouse) {
	// image is loaded so we can define the limits of pan and zoom
};

PanZoomCanvas.prototype.mousedown = function(e, mouse) {
	this.dragStartPos = this.translation;
	this.recentTotalTrans = this.translation;
	this.dragStartMousePos = mouse;
	this.mouseDown = true;
};

PanZoomCanvas.prototype.mousemove = function(e, mouse) {
	if(!this.mouseDown){
		return;
	}
	var newTotalTrans = {
		x: this.dragStartPos.x + (mouse.x - this.dragStartMousePos.x),
		y: this.dragStartPos.y + (mouse.y - this.dragStartMousePos.y)
	};
	console.log(newTotalTrans);
	newTotalTrans = this.checkBounds(newTotalTrans);
	// perform the actial translation
	this.translate(newTotalTrans);
	// store the translation to the total counter
	this.updateTotalTrans(newTotalTrans);
	// stage the translation for the next mousemove event
	this.recentTotalTrans = newTotalTrans;
};

PanZoomCanvas.prototype.mouseup = function(e, mouse) {
	this.recentDragPos = mouse;
	this.mouseDown = false;
};

PanZoomCanvas.prototype.translate = function(translation) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	ctx.translate(-this.recentTotalTrans.x, -this.recentTotalTrans.y);
	ctx.translate(translation.x, translation.y);
};

PanZoomCanvas.prototype.updateTotalTrans = function(currentTrans) {
	this.translation = currentTrans;
	this.reactCanvObj.translation = this.translation;
};

PanZoomCanvas.prototype.checkBounds = function(currentTranslation) {
	var canvas = document.getElementById(this.canvasId);
	// calc current image dimensions
	var currentImageWidth = this.imageObj.width * this.scaleFactor;
	var currentImageHeight = this.imageObj.height * this.scaleFactor;
	// case 1: image smaller than container
	if (canvas.width > currentImageWidth) {
		currentTranslation.x = 0;
	}
	if (canvas.height > currentImageHeight) {
		currentTranslation.y = 0;
	}
	// case 2: image is taller than container
	if (canvas.height < currentImageHeight) {
		// if MOUSE is moving to the BOTTOM
		if (currentTranslation.y > 0) {
			if (this.translation.y + currentTranslation.y > 0) {
				currentTranslation.y = 0;
			}
		} else {
			// if MOUSE is moving to the TOP
			if (this.translation.y - currentTranslation.y < -(currentImageHeight - canvas.height)) {
				currentTranslation.y = 0;
			}
		}

	}
	// case 3: image is wider than container
	if (canvas.width < currentImageWidth) {
		// if MOUSE is moving to the RIGHT
		if (currentTranslation.x > 0) {
			if (this.translation.x + currentTranslation.x > 0) {
				currentTranslation.x = 0;
			}
		} else {
			// if MOUSE is moving to the LEFT
			if (this.translation.x - currentTranslation.x < -(currentImageWidth - canvas.width)) {
				currentTranslation.x = 0;
			}
		}
	}
	return currentTranslation;
};

PanZoomCanvas.prototype.draw = function(ctx) {
	// check if a ctx is prodivded
	if (!ctx) {
		var canvas = document.getElementById(this.canvasId);
		ctx = canvas.getContext('2d');
	}
	// draw image on canvas with the scale
	ctx.scale(this.scaleFactor, this.scaleFactor);
	ctx.drawImage(this.imageObj, 0, 0);
};