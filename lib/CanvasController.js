// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update February 2015
//
// Free to use and distribute at will
// As long as you are nice to people, etc

/* jshint strict: false */

/* global CanvasController:true */
/* global $ */
/* global lodash */
/* global _:true */
/* global ReactiveCanvasStore */

/*
 * Class controlling the events and draw order of a specific canvas html object
 *
 * @class
 * @property String  canvasId				   - The id of the canvas html object
 * @property [object]  drawQueue               - The draw queue, which holds drawable objects
 * @property [object]  eventQueue              - The draw queue, which holds objects that can consume mouse events
 */

 var _ = lodash;

CanvasController = function(canvasId) {

	var self = this;
	// properties
	self.drawQueue = [];
	self.eventQueue = [];
	self.canvasId = canvasId;

	self._initEventHandlers();

	self.interval = 30;
	setInterval(function() {
		self.draw();
	}, self.interval);
};

/*
 * calls the draw methodes on all drawable objects in the draw queue
 */
CanvasController.prototype.draw = function() {

	var self = this;
	var canvas = document.getElementById(this.canvasId);
	if(!canvas){
		return;
	}
	var ctx = canvas.getContext('2d');

	_.each(self.drawQueue, function(drawable) {
		drawable.draw(ctx);
	});

};

/*
 * binds touch/mouse event handlers to the canvas
 */
CanvasController.prototype._initEventHandlers = function() {

	var self = this;
	var canvas = $('#' + self.canvasId);

	//fixes a problem where double clicking causes text to get selected on the canvas
	canvas.on('selectstart', function(e) {
		e.preventDefault();
		return false;
	});

	canvas.on('mousedown', function(e) {
		self._mouseDown(e);
	});

	canvas.on('mousemove', function(e) {
		self._mouseMove(e);
	});

	canvas.on('mouseup', function(e) {
		self._mouseUp(e);
	});

};

/*
 * propagates mouse down events to all objects in the event queue
 */
CanvasController.prototype._mouseDown = function(e) {

	var self = this;

	_.each(self.drawQueue, function(drawable) {
		var consumed = false;
		// propagate event
		consumed = drawable.mouseDown(e);
		// if the drawable object consumed the touch, then the propagation gets stopped
		if(consumed === true){
			return false;
		}
	});

};

/*
 * propagates mouse move events to all objects in the event queue
 */
CanvasController.prototype._mouseMove = function(e) {

	var self = this;

	_.each(self.eventQueue, function(drawable) {
		var consumed = false;
		// propagate event
		consumed = drawable.mouseMove(e);
		// if the drawable object consumed the touch, then the propagation gets stopped
		if(consumed === true){
			return false;
		}
	});

};

/*
 * propagates mouse ups event to all objects in the event queue
 */
CanvasController.prototype._mouseUp = function(e) {

	var self = this;
	var touchConsumed = false;

	_.each(self.drawQueue, function(drawable) {
		var consumed = false;
		// propagate event
		consumed = drawable.mouseUp(e);
		// if the drawable object consumed the touch, then the propagation gets stopped
		if(consumed === true){
			touchConsumed = true;
		}
	});

	if(touchConsumed === false){
		ReactiveCanvasStore[self.canvasId].touchNotConsumed();
	}

};