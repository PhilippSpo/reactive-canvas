// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

'use strict';

/*jshint undef:true */
/*global Meteor */
/*global Session */
/*global ReactiveCanvas:true */
/*global Rectangle */
/*global Polygon */
/*global addPointToPolyDoc */
/*global ReactiveVar */
/*global Tracker */
/*global CanvasFunctions */
/*global setInterval */
/*global _ */

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
	this.ctx = canvas.getContext('2d');
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
};

ReactiveCanvas.prototype.mousemove = function(e, mouse) {
	e.currentTarget.style.cursor = 'auto';
	var mySel = this.selection.get();
	if (this.dragging) {
		var translation = {
			x: mouse.x - this.dragoffx,
			y: mouse.y - this.dragoffy
		};
		if (mySel instanceof Rectangle) {
			// We don't want to drag the object by its top-left corner, we want to drag it
			// from where we clicked. Thats why we saved the offset and use it here
			mySel.x = translation.x;
			mySel.y = translation.y;
			this.valid = false; // Something's dragging so we must redraw
			mySel.valid = false; // store information to database when rect gets drawn
		}
		if (mySel instanceof Polygon) {
			mySel.move(e, translation);
			this.dragoffx = mouse.x;
			this.dragoffy = mouse.y;
		}
	}
	if (this.resizing) {
		if (mySel instanceof Rectangle) {
			mySel.mouseMoveResize(e, mouse);
		}
		if (mySel instanceof Polygon) {
			mySel.mouseMove(e, mouse);
		}
	}
};

ReactiveCanvas.prototype.mousedown = function(e, mouse) {
	var shapes = this.shapes;
	var l = shapes.length;
	// tmp var if one gets selected
	if (this.creatingElement.get() === true) {
		this.addPointToCreatingElement(mouse);
		return;
	}
	var tmpSelected = false;
	// first handle the already selected element
	var currentSelected = this.selection.get();
	if (currentSelected !== null) {
		if (currentSelected.contains(mouse.x, mouse.y)) {
			this.handleSelectedShape(e, mouse, currentSelected);
			tmpSelected = true;
		} else {
			// unset the state of the shape as selected
			currentSelected.deselect();
			this.valid = false;
		}
	}
	// then handle the rest
	for (var i = l - 1; i >= 0; i--) {
		var mySel = shapes[i];
		if (mySel === currentSelected) {
			continue;
		}
		if (mySel.contains(mouse.x, mouse.y) && tmpSelected === false) {
			this.handleSelectedShape(e, mouse, mySel);
			tmpSelected = true;
		} else {
			// unset the state of the shape as selected
			mySel.deselect();
			this.valid = false;
		}
	}
	// if no shape was touched
	if (tmpSelected === false) {
		this.selection.set(null);
	}
};

ReactiveCanvas.prototype.dblclick = function(e) {
	// check if we are already creating an element
	if (this.creatingElement.get() === true) {
		return;
	}
	var mouse = CanvasFunctions.getMouse(e);
	if (this.insertMode === 'rect') {
		this.insertRectangle(mouse);
	}
	if (this.insertMode === 'poly') {
		this.insertPolygon(mouse);
	}
};

ReactiveCanvas.prototype.insertRectangle = function(mouse) {
	var counter = this.rectCollection.find().fetch().length;
	var extendRectangle = this.extendRectangle();
	var color = CanvasFunctions.getRandomRgbColor();
	var insertRectangle = {
		coords: {
			x: mouse.x - 10,
			y: mouse.y - 10,
			w: 100,
			h: 100,
		},
		color: color,
		name: 'Rectangle ' + counter
	};
	if (extendRectangle) {
		insertRectangle = _.extend(insertRectangle, extendRectangle);
	}
	this.rectCollection.insert(insertRectangle);
};

ReactiveCanvas.prototype.insertPolygon = function(mouse) {
	var counter = this.polyCollection.find().fetch().length;
	var extendPolygon = this.extendPolygon();
	var color = CanvasFunctions.getRandomRgbColor();
	var insertPolygon = {
		coords: [mouse],
		color: color,
		name: 'Poly ' + counter
	};
	if (extendPolygon) {
		insertPolygon = _.extend(insertPolygon, extendPolygon);
	}
	var id = this.polyCollection.insert(insertPolygon);
	this.createdId.set(id);
	this.creatingElement.set(true);
};

ReactiveCanvas.prototype.handleSelectedShape = function(e, mouse, selectedShape) {
	// check if this shape is already selected
	if (this.selection.get() === selectedShape) {
		if (selectedShape.touchedAtHandles(mouse.x, mouse.y)) {
			// in this case the shape is touched at the handles -> resize
			// pass event to shape event handler and begin possible resizing
			if (selectedShape instanceof Rectangle) {
				selectedShape.mouseDownSelected(e, mouse);
				this.resizing = true;
			}
			if (selectedShape instanceof Polygon) {
				selectedShape.mouseDown(e, mouse);
				this.resizing = true;
			}
		} else {
			// in this case the shape is touched, but NOT at the handles -> drag
			// Keep track of where in the object we clicked
			// so we can move it smoothly (see mousemove)
			if (selectedShape instanceof Rectangle) {
				this.dragoffx = mouse.x - selectedShape.x;
				this.dragoffy = mouse.y - selectedShape.y;
			}
			if (selectedShape instanceof Polygon) {
				// store drag start points
				this.dragoffx = mouse.x;
				this.dragoffy = mouse.y;
			}
			this.dragging = true;
		}
	}
	this.selection.set(selectedShape);
	// set the state of the shape as selected
	selectedShape.selected = true;
	this.valid = false;
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

ReactiveCanvas.prototype.initEventHandlers = function() {
	var myState = this;

	//fixes a problem where double clicking causes text to get selected on the canvas
	this.canvas.addEventListener('selectstart', function(e) {
		e.preventDefault();
		return false;
	}, false);

	// Up, down, and move are for dragging
	this.canvas.addEventListener('mousedown', mousedown, true);
	this.canvas.addEventListener('touchstart', mousedown, true);

	// add mouse move handlers
	this.canvas.addEventListener('mousemove', mousemove, true);
	this.canvas.addEventListener('touchmove', mousemove, true);

	// add mouse up handler
	this.canvas.addEventListener('mouseup', mouseup, true);
	// double click for making new shapes
	this.canvas.addEventListener('dblclick', dblclick, true);

	function mousedown(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = CanvasFunctions.getMouse(e);
		myState.mousedown(e, mouse);
	}

	function mousemove(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = CanvasFunctions.getMouse(e);
		myState.mousemove(e, mouse);
	}

	function mouseup(e) {
		myState.dragging = false;
		myState.resizing = false;
		var selectedElement = myState.selection.get();
		if (selectedElement instanceof Rectangle) {
			selectedElement.mouseUpSelected(e);
		}
	}

	function dblclick(e) {
		myState.dblclick(e);
	}
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
	this.insertMode = 'rect';
	this.createdId = new ReactiveVar(0);

	CanvasFunctions.setCanvasEnvironmentVariables(this.canvas);
};

ReactiveCanvas.prototype.addShape = function(shape) {
	this.shapes.push(shape);
	this.valid = false;
};

ReactiveCanvas.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
ReactiveCanvas.prototype.draw = function(redrawAsChild) {
	// if our state is invalid, redraw and validate!
	if (!this.valid || redrawAsChild) {
		var ctx = this.ctx;
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

		// ** Add stuff you want drawn in the background all the time here **

		// draw all shapes
		var l = shapes.length;
		for (var i = 0; i < l; i++) {
			var shape = shapes[i];
			if (mySel !== shape) {
				// draw this shape as last
				// We can skip the drawing of elements that have moved off the screen:
				if (shape.x > this.canvas.width || shape.y > this.canvas.height ||
					shape.x + shape.w < 0 || shape.y + shape.h < 0) {
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
		this.redrawAsChild = false;
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