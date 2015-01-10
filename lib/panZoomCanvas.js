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
		x: null,
		y: null
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
	this.reactCanvObj.translation = this.translation;
};

PanZoomCanvas.prototype.translate = function(translation) {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext('2d');
	// ctx.translate(-this.recentTotalTrans.x, -this.recentTotalTrans.y);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.translate(translation.x, translation.y);
};

PanZoomCanvas.prototype.updateTotalTrans = function(currentTrans) {
	this.translation = currentTrans;
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
		// gap on the top
		if (currentTranslation.y > 0) {
				currentTranslation.y = 0;
		} else {
			// gap on the bottom
			if ((-currentTranslation.y + canvas.height) > currentImageHeight) {
				currentTranslation.y = - (currentImageHeight - canvas.height);
			}
		}

	}
	// case 3: image is wider than container
	if (canvas.width < currentImageWidth) {
		// gap on the left
		if (currentTranslation.x > 0) {
			currentTranslation.x = 0;
		} else {
			// gap on the right
			if ((-currentTranslation.x + canvas.width) > currentImageWidth) {
				currentTranslation.x = - (currentImageWidth - canvas.width);
			}
		}
	}
	return currentTranslation;
};

PanZoomCanvas.prototype.draw = function(ctx) {
	var canvas = document.getElementById(this.canvasId);
	// check if a ctx is prodivded
	if (!ctx) {
		ctx = canvas.getContext('2d');
	}
	// draw image on canvas with the scale
	// this.translate({x: this.translation.x - canvas.width, y: this.translation.y - canvas.height});
	// ctx.translate(canvas.width, canvas.height);
	ctx.scale(this.scaleFactor, this.scaleFactor);
	// ctx.translate(-canvas.width, -canvas.height);
	// this.translate(this.translation);

	ctx.drawImage(this.imageObj, 0, 0);
	// ctx.strokeStyle="#FF0000";
	// ctx.strokeRect(-this.translation.x * (1/this.scaleFactor),-this.translation.y * (1/this.scaleFactor),canvas.width * (1/this.scaleFactor),canvas.height * (1/this.scaleFactor));
};

PanZoomCanvas.prototype.setScale = function(scale) {
	var canvas = document.getElementById(this.canvasId);
	// calc current image dimensions
	var currentImageWidth = this.imageObj.width * scale;
	var currentImageHeight = this.imageObj.height * scale;
	// case 1: image smaller than container
	if (canvas.width > currentImageWidth || canvas.height > currentImageHeight) {
		return;
	}

	this.boundingRect = {
		x: -this.translation.x * (1/this.scaleFactor),
		y: -this.translation.y * (1/this.scaleFactor),
		w: canvas.width * (1/this.scaleFactor),
		h: canvas.height * (1/this.scaleFactor)
	};

	this.scaleFactor = scale;

	// check corners
	this.translate(this.checkBounds(this.translation));

	this.reactCanvObj.valid = false;
};