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
/*global addPointToPolyDoc */
/*global ReactiveVar */
/*global Tracker */
/*global CanvasFunctions */
/*global setInterval */
/*global _ */
/*global document*/

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
};

ReactiveCanvas.prototype.mousemove = function(e, mouse) {
	e.currentTarget.style.cursor = 'auto';
	var mySel = this.selection.get();
	if(mySel){
		mySel.mousemove(e, mouse);
	}
};

ReactiveCanvas.prototype.mousedown = function(e, mouse) {
	// tmp var if one gets selected
	if (this.creatingElement.get() === true) {
		this.addPointToCreatingElement(mouse);
		return;
	}
	// only handle the already selected element
	var currentSelected = this.selection.get();
	if (currentSelected !== null) {
		// if (currentSelected.contains(mouse.x, mouse.y)) {
			currentSelected.mousedown(e, mouse);
		// }
	}
};

ReactiveCanvas.prototype.mouseup = function(e, mouse) {
	var tmpSelected = false;
	// if there already is a selected, prefer it
	var currentSelected = this.selection.get();
	if(currentSelected){
		tmpSelected = currentSelected.mouseup(e, mouse);
	}
	// handle all the shapes for finding one to select
	var shapes = this.shapes;
	var l = shapes.length;
	for (var i = l - 1; i >= 0; i--) {
		var mySel = shapes[i];
		if(mySel === currentSelected){
			continue;
		}
		if (mySel.contains(mouse.x, mouse.y) && tmpSelected === false) {
			mySel.mouseup(e, mouse);
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
	if (this.permitCreation === false) {
		return;
	}
	var mouse = CanvasFunctions.getMouse(e, this.translation, this.scaleFactor, this.canvas);
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
	var canvas = document.getElementById(this.canvas);
	canvas.addEventListener('selectstart', function(e) {
		e.preventDefault();
		return false;
	}, false);

	// Up, down, and move are for dragging
	canvas.addEventListener('mousedown', mousedown, true);
	canvas.addEventListener('touchstart', mousedown, true);

	// add mouse move handlers
	canvas.addEventListener('mousemove', mousemove, true);
	canvas.addEventListener('touchmove', mousemove, true);

	// add mouse up handler
	canvas.addEventListener('mouseup', mouseup, true);
	// double click for making new shapes
	canvas.addEventListener('dblclick', dblclick, true);

	function mousedown(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = CanvasFunctions.getMouse(e, myState.translation, myState.scaleFactor, myState.canvas);
		myState.mousedown(e, mouse);
	}

	function mousemove(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = CanvasFunctions.getMouse(e, myState.translation, myState.scaleFactor, myState.canvas);
		myState.mousemove(e, mouse);
		return false;
	}

	function mouseup(e) {
		// get mouse pos
		var mouse = CanvasFunctions.getMouse(e, myState.translation, myState.scaleFactor, myState.canvas);
		myState.mouseup(e, mouse);
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
	this.permitCreation = true;
	this.insertMode = 'rect';
	this.createdId = new ReactiveVar(0);
	this.translation = {
		x: 0,
		y: 0
	};
	this.scaleFactor = 1.0;

	CanvasFunctions.setCanvasEnvironmentVariables(this.canvas);
};

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
		this.selection.get().selected = false;
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