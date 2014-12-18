// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

'use strict';

/*jshint undef:false */

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

	// to improve readability all the base variables go in here
	this.setupBaseVariables();

	// **** REACTIVITY COMES HERE ****
	this.setupReactiveUpdates();

	// **** Then events! ****
	var myState = this;

	//fixes a problem where double clicking causes text to get selected on the canvas
	canvas.addEventListener('selectstart', function(e) {
		e.preventDefault();
		return false;
	}, false);

	// Up, down, and move are for dragging
	canvas.addEventListener('mousedown', mousedown, true);
	canvas.addEventListener('touchstart', mousedown, true);

	function mousedown(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = myState.getMouse(e);
		myState.mousedown(e, mouse);
	}

	// add mouse move handlers
	canvas.addEventListener('mousemove', mousemove, true);
	canvas.addEventListener('touchmove', mousemove, true);

	function mousemove(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = myState.getMouse(e);
		myState.mousemove(e, mouse);
	}
	canvas.addEventListener('mouseup', function(e) {
		myState.dragging = false;
		myState.resizing = false;
		var selectedElement = myState.selection.get();
		if (selectedElement instanceof Rectangle) {
			selectedElement.mouseUpSelected(e);
		}
	}, true);
	// double click for making new shapes
	canvas.addEventListener('dblclick', dblclick, true);

	function dblclick(e) {
		myState.dblclick(e);
	}

	// **** Options! ****
	this.interval = 30;
	setInterval(function() {
		myState.draw();
	}, myState.interval);

	// **** State tracking with sessions ****
	this.initReactiveStateTracking();
};

ReactiveCanvas.prototype.mousemove = function(e, mouse) {
	e.currentTarget.style.cursor = 'auto';
	var mySel = this.selection.get();
	if (this.dragging) {
		if (mySel instanceof Rectangle) {
			// We don't want to drag the object by its top-left corner, we want to drag it
			// from where we clicked. Thats why we saved the offset and use it here
			mySel.x = mouse.x - this.dragoffx;
			mySel.y = mouse.y - this.dragoffy;
			this.valid = false; // Something's dragging so we must redraw
			mySel.valid = false; // store information to database when rect gets drawn
		}
		if (mySel instanceof Polygon) {
			var translation = {
				x: mouse.x - this.dragoffx,
				y: mouse.y - this.dragoffy
			};
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
	var tmpSelected = false;
	if (this.creatingElement.get() === true) {
		this.addPointToCreatingElement(mouse);
		return;
	}
	for (var i = l - 1; i >= 0; i--) {
		var mySel = shapes[i];
		if (shapes[i].contains(mouse.x, mouse.y) && tmpSelected === false) {
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
	var mouse = this.getMouse(e);
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	var counter = 0;
	if (this.insertMode === 'rect') {
		counter = this.rectCollection.find().fetch().length;
		this.rectCollection.insert({
			coords: {
				x: mouse.x - 10,
				y: mouse.y - 10,
				w: 100,
				h: 100,
			},
			color: {
				r: r,
				g: g,
				b: b
			},
			name: 'Rectangle ' + counter
		});
	}
	if (this.insertMode === 'poly') {
		counter = this.polyCollection.find().fetch().length;
		var id = this.polyCollection.insert({
			coords: [{
				x: mouse.x,
				y: mouse.y
			}],
			color: {
				r: r,
				g: g,
				b: b
			},
			name: 'Poly ' + counter
		});
		this.createdId.set(id);
		this.creatingElement.set(true);
	}
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
			console.log('Nothing selected to add something onto!');
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
	// This complicates things a little but but fixes mouse co-ordinate problems
	// when there's a border or padding. See getMouse for more detail
	if (document.defaultView && document.defaultView.getComputedStyle) {
		this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null).paddingLeft, 10) || 0;
		this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(this.canvas, null).paddingTop, 10) || 0;
		this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null).borderLeftWidth, 10) || 0;
		this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(this.canvas, null).borderTopWidth, 10) || 0;
	}
	// Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
	// They will mess up mouse coordinates and this fixes that
	var html = document.body.parentNode;
	this.htmlTop = html.offsetTop;
	this.htmlLeft = html.offsetLeft;

	// **** Keep track of state! ****

	this.valid = false; // when set to false, the canvas will redraw everything
	this.shapes = []; // the collection of things to be drawn
	this.dragging = false; // Keep track of when we are dragging
	// the current selected object. In the future we could turn this into an array for multiple selection
	this.selection = new ReactiveVar(null);
	this.dragoffx = 0; // See mousedown and mousemove events for explanation
	this.dragoffy = 0;
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
ReactiveCanvas.prototype.draw = function() {
	// if our state is invalid, redraw and validate!
	if (!this.valid) {
		var ctx = this.ctx;
		var shapes = this.shapes;
		var mySel = this.selection.get();
		this.clear();

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
	}
};

// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
ReactiveCanvas.prototype.getMouse = function(e) {
	var element = this.canvas,
		offsetX = 0,
		offsetY = 0,
		mx, my;

	// Compute the total offset
	if (element.offsetParent !== undefined) {
		do {
			offsetX += element.offsetLeft;
			offsetY += element.offsetTop;
		} while ((element = element.offsetParent));
	}

	// Add padding and border style widths to offset
	// Also add the <html> offsets in case there's a position:fixed bar
	offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
	offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

	mx = e.pageX - offsetX;
	my = e.pageY - offsetY;

	// We return a simple javascript object (a hash) with x and y defined
	return {
		x: mx,
		y: my
	};
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

// checks if two points are close enough to each other depending on the closeEnough param
ReactiveCanvas.prototype.checkCloseEnough = function(p1, p2, closeEnough) {
	return Math.abs(p1 - p2) < closeEnough;
};

// Draws a white rectangle with a black border around it
ReactiveCanvas.prototype.drawRectWithBorder = function(coords, sideLength, colors) {
	if (!colors) {
		colors = {};
	}
	if (!colors.borderColor) {
		colors.borderColor = 'black';
	}
	if (!colors.bgColor) {
		colors.bgColor = 'white';
	}
	this.ctx.save();
	this.ctx.fillStyle = colors.borderColor;
	this.ctx.fillRect(coords.x - (sideLength / 2), coords.y - (sideLength / 2), sideLength, sideLength);
	this.ctx.fillStyle = colors.bgColor;
	this.ctx.fillRect(coords.x - ((sideLength - 1) / 2), coords.y - ((sideLength - 1) / 2), sideLength - 1, sideLength - 1);
	this.ctx.restore();
};