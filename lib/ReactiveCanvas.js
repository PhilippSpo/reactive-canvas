// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

/* jshint strict: false */

/*jshint undef:true */
/*global Meteor */
/*global Session */
/*global ReactiveCanvas:true */
/*global Rectangle */
/*global Polygon */
/*global PanZoomCanvas */
/*global addPointToPolyDoc */
/*global ReactiveVar */
/*global Tracker */
/*global CanvasFunctions */
/*global setInterval */
/*global _ */
/*global document*/
/*global $ */

if (Meteor.isClient) {
	// session defaults
	Session.setDefault('shapeSelectedOnCanvas', false);
	Session.setDefault('coordSelectedOnCanvas', false);
	Session.setDefault('isCreatingElementOnCanvas', false);
	Session.setDefault('addPoints', false);
}

// Constructor for Polygon objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
ReactiveCanvas = function(canvas, rectCollection, polyCollection) {
	// **** First some setup! ****

	this.canvas = canvas;
	this.rectCollection = rectCollection;
	this.polyCollection = polyCollection;

	// init functions that the developer may overwrite
	this.extendRectangle = function() {};
	this.extendPolygon = function() {};

	// to improve readability all the base variables go in here
	this.setupBaseVariables();

	// **** Keep track of state! ****
	this.initStateVariables();

	// **** REACTIVITY COMES HERE ****
	this.setupReactiveUpdates();

	// **** Then events! ****
	this.initEventHandlers();

	// **** Options! ****
	this.interval = 30;
	var self = this;
	setInterval(function() {
		self.draw();
	}, self.interval);

	// **** State tracking with sessions ****
	this.initReactiveStateTracking();

	this.panZoomLayer = new PanZoomCanvas(canvas, '/cad.jpg', this);
};

// Touches

var mousemove = function(e) {
	var self = e.data;
	var mouse = CanvasFunctions.getMouse(e, self.translation, self.panZoomLayer.scaleFactor, self.canvas);
	e.currentTarget.style.cursor = 'auto';
	var mySel = self.selection.get();
	if (mySel) {
		if(mySel.mousemove(e, mouse) === true){
			return;
		}
	}
	self.panZoomLayer.mousemove(e, mouse);
	self.valid = false;
};

var mousedown = function(e) {
	var self = e.data;
	var mouse = CanvasFunctions.getMouse(e, self.translation, self.panZoomLayer.scaleFactor, self.canvas);
	// tmp var if one gets selected
	if (self.creatingElement.get() === true) {
		self.addPointToCreatingElement(mouse);
		return;
	}
	// only handle the already selected element
	var currentSelected = self.selection.get();
	if (currentSelected !== null) {
		currentSelected.mousedown(e, mouse);
	}
	self.panZoomLayer.mousedown(e, mouse);
};

var mouseup = function(e) {
	var self = e.data;
	var mouse = CanvasFunctions.getMouse(e, self.translation, self.panZoomLayer.scaleFactor, self.canvas);
	var tmpSelected = false;
	// foreward mouseup event to panzoomlayer
	self.panZoomLayer.mouseup(e, mouse);
	// if there already is a selected, prefer it
	var currentSelected = self.selection.get();
	if (currentSelected) {
		if(currentSelected.mouseup(e, mouse) === true){
			self.valid = false;
			return;
		}
	}
	// handle all the shapes for finding one to select
	var shapes = self.shapes;
	var l = shapes.length;
	for (var i = l - 1; i >= 0; i--) {
		var mySel = shapes[i];
		if (mySel.contains(mouse.x, mouse.y) && tmpSelected === false) {
			mySel.mouseup(e, mouse);
			tmpSelected = true;
		} else {
			// unset the state of the shape as selected
			mySel.deselect();
			self.valid = false;
		}
	}
	// if no shape was touched
	if (tmpSelected === false) {
		if (self.selection.get() !== null) {
			self.resetSelection();
			self.valid = false;
		}
	}
};

var dblclick = function(e) {
	var self = e.data;
	// check if we are already creating an element
	if (self.creatingElement.get() === true) {
		return;
	}
	if (self.permitCreation === false) {
		return;
	}
	var mouse = CanvasFunctions.getMouse(e, self.translation, self.panZoomLayer.scaleFactor, self.canvas);
	var insertedId = null;
	if (self.insertMode === 'rect') {
		CanvasFunctions.insertRectangle(mouse, self.rectCollection, self.extendRectangle);
	}
	if (self.insertMode === 'poly') {
		insertedId = CanvasFunctions.insertPolygon(mouse, self.polyCollection, self.extendPolygon);
	}
	if(insertedId !== null) {
		self.createdId.set(insertedId);
		self.creatingElement.set(true);
	}
};

ReactiveCanvas.prototype.addPointToCreatingElement = function(mouse) {
	var alreadySelected = this.selection.get();
	var newPoint = {
		x: mouse.x,
		y: mouse.y
	};
	if (this.createdId.get() === 0) {
		if (alreadySelected === null) {
			// Nothing selected to add something onto!
			return;
		}
	}
	if (this.insertMode === 'poly') {
		if (this.createdId.get() !== 0) {
			addPointToPolyDoc(newPoint, this, this.createdId.get(), this.polyCollection);
			return;
		}
	}
	if (alreadySelected !== null) {
		alreadySelected.addPoint(newPoint);
	}
};

// initializers

ReactiveCanvas.prototype.initEventHandlers = function() {

	//fixes a problem where double clicking causes text to get selected on the canvas
	var canvas = $('#'+this.canvas);
	canvas.on('selectstart', function(e) {
		e.preventDefault();
		return false;
	});
	// Up, down, and move are for dragging
	canvas.off('mousedown', mousedown);
	canvas.on('mousedown', this, mousedown);
	// canvas.on('touchstart', this, mousedown);
	// add mouse move handlers
	canvas.off('mousemove', mousemove);
	canvas.on('mousemove', this, mousemove);
	// canvas.on('touchmove', this, mousemove);
	// add mouse up handler
	canvas.off('mouseup', mouseup);
	canvas.on('mouseup', this, mouseup);
	// double click for making new shapes
	canvas.off('dblclick', dblclick);
	canvas.on('dblclick', this, dblclick);
};

ReactiveCanvas.prototype.initStateVariables = function() {
	this.valid = false; // when set to false, the canvas will redraw everything
	this.shapes = []; // the collection of things to be drawn
	this.dragging = false; // Keep track of when we are dragging
	// the current selected object. In the future we could turn this into an array for multiple selection
	this.selection = new ReactiveVar(null);
	this.dragoffx = 0; // See mousedown and mousemove events for explanation
	this.dragoffy = 0;
};

ReactiveCanvas.prototype.initReactiveStateTracking = function() {
	var self = this;
	// track shape selection
	Tracker.autorun(function() {
		var selection = self.selection.get();
		if (selection !== null) {
			Session.set('shapeSelectedOnCanvas', true);
			if (selection instanceof Polygon) {
				Session.set('addPoints', true);
			} else {
				Session.set('addPoints', false);
			}
		} else {
			Session.set('shapeSelectedOnCanvas', false);
			Session.set('addPoints', false);
		}
	});
	// track shape creation
	Tracker.autorun(function() {
		var isCreating = self.creatingElement.get();
		Session.set('isCreatingElementOnCanvas', isCreating);
	});
	// track shape coordinate selection
	Tracker.autorun(function() {
		var selection = self.selection.get();
		if (selection !== null) {
			if (selection.selectedCoord.get() !== null) {
				Session.set('coordSelectedOnCanvas', true);
			} else {
				Session.set('coordSelectedOnCanvas', false);
			}
		} else {
			Session.set('coordSelectedOnCanvas', false);
		}
	});
};

ReactiveCanvas.prototype.setupReactiveUpdates = function() {
	var self = this;
	// get elements form database
	var rectangles = this.rectCollection.find();
	var polygons = this.polyCollection.find();

	// observe added and removed
	rectangles.observeChanges({
		added: function(id) {
			self.addShape(new Rectangle(id, self.rectCollection, self));
		}
	});
	polygons.observeChanges({
		added: function(id) {
			self.addShape(new Polygon(id, self.polyCollection, self));
		}
	});
};

ReactiveCanvas.prototype.setupBaseVariables = function() {
	this.creatingElement = new ReactiveVar(false);
	this.permitCreation = true;
	this.insertMode = 'rect';
	this.createdId = new ReactiveVar(0);
	this.translation = {
		x: 0,
		y: 0
	};
	// this.scaleFactor = 1.0;

	CanvasFunctions.setCanvasEnvironmentVariables(this.canvas);
};

// drawing

ReactiveCanvas.prototype.addShape = function(shape) {
	this.shapes.push(shape);
	this.valid = false;
};

ReactiveCanvas.prototype.clear = function() {
	var canvas = document.getElementById(this.canvas);
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
ReactiveCanvas.prototype.draw = function(redrawAsChild) {
	if (!redrawAsChild) {
		redrawAsChild = false;
	}
	// if our state is invalid, redraw and validate!
	if (!this.valid || redrawAsChild) {
		var canvas = document.getElementById(this.canvas);
		if (!canvas) {
			return;
		}
		var ctx = canvas.getContext('2d');
		var shapes = this.shapes;
		var mySel = this.selection.get();
		if (!redrawAsChild) {
			this.clear();
		}

		if (!this.valid && !redrawAsChild) {
			if (typeof this.redrawParent === 'function') {
				this.redrawParent();
				return;
			}
		}

		this.panZoomLayer.draw(ctx);

		// ** Add stuff you want drawn in the background all the time here **

		// draw all shapes
		var l = shapes.length;
		for (var i = 0; i < l; i++) {
			var shape = shapes[i];
			if (mySel !== shape) {
				// draw this shape as last
				// We can skip the drawing of elements that have moved off the screen:
				if (shape.x > (canvas.width - this.translation.x) || shape.y > (canvas.height - this.translation.y) ||
					shape.x + shape.w < this.translation.x || shape.y + shape.h < this.translation.y) {
					continue;
				}
				shapes[i].draw(ctx);
			}
		}
		// draw selected shape
		if (mySel !== null) {
			mySel.draw(ctx);
		}
		this.valid = true;
	}
};

// determin that the next click/mouseDown event will add a point to the selected element
ReactiveCanvas.prototype.enableEditingMode = function() {
	this.creatingElement.set(true);
};
// check if requirements for creating a valid element are fulfilled
ReactiveCanvas.prototype.finishElementCreation = function() {
	var mySel = this.selection.get();
	if (!mySel.mayBeCreated()) {
		// not fulfilled -> remove from database
		mySel.rectCollection.remove({
			_id: mySel.id
		});
	}
	this.creatingElement.set(false);
};

ReactiveCanvas.prototype.getShapeForId = function(id) {
	var retShape = null;
	_.each(this.shapes, function(shape) {
		if (shape.id === id) {
			retShape = shape;
			return;
		}
	});
	return retShape;
};

ReactiveCanvas.prototype.resetSelection = function() {
	if (this.selection.get() !== null) {
		this.selection.get().deselect();
		this.selection.set(null);
	}
};

ReactiveCanvas.prototype.cleanup = function() {
	this.resetSelection();
	this.initEventHandlers();
	this.translation = {
		x: 0,
		y: 0
	};
	_.each(this.shapes, function(shape) {
		shape.visible = true;
	});
};

ReactiveCanvas.prototype.setScale = function(scale){
	this.panZoomLayer.setScale(scale);
};