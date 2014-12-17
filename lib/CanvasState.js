// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

if(Meteor.isClient){
	// session defaults
	Session.setDefault('shapeSelectedOnCanvas', false);
	Session.setDefault('coordSelectedOnCanvas', false);
	Session.setDefault('isCreatingElementOnCanvas', false);
	Session.setDefault('addPoints', false);
}

// Constructor for Polygon objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
CanvasState = function(canvas, mongoCol, polyCollection) {
	// **** First some setup! ****

	this.canvas = canvas;
	this.width = canvas.width;
	this.height = canvas.height;
	this.ctx = canvas.getContext('2d');
	this.collection = mongoCol;
	this.polyCollection = polyCollection;
	this.creatingElement = new ReactiveVar(false);
	this.insertMode = 'rect';
	this.createdId = new ReactiveVar(0);
	// This complicates things a little but but fixes mouse co-ordinate problems
	// when there's a border or padding. See getMouse for more detail
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
	if (document.defaultView && document.defaultView.getComputedStyle) {
		this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
		this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
		this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
		this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
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

	// **** Then events! ****

	// This is an example of a closure!
	// Right here "this" means the CanvasState. But we are making events on the Canvas itself,
	// and when the events are fired on the canvas the variable "this" is going to mean the canvas!
	// Since we still want to use this particular CanvasState in the events we have to save a reference to it.
	// This is our reference!
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
		var mx = mouse.x;
		var my = mouse.y;
		var shapes = myState.shapes;
		var l = shapes.length;
		// tmp var if one gets selected
		var tmpSelected = false;
		var alreadySelected = myState.selection.get();
		if (myState.creatingElement.get() === true) {
			var newPoint = {
				x: mouse.x,
				y: mouse.y
			};
			if (myState.createdId.get() === 0) {
				if (alreadySelected === null) {
					console.log('Nothing selected to add something onto!');
					return;
				}
			}
			if (myState.insertMode === 'poly') {
				if (myState.createdId.get() !== 0) {
					addPointToPolyDoc(newPoint, myState, myState.createdId.get(), polyCollection);
					return;
				}
			}
			if (alreadySelected !== null) {
				alreadySelected.addPoint(newPoint);
			}
			return;
		}
		for (var i = l - 1; i >= 0; i--) {
			var mySel = shapes[i];
			if (shapes[i].contains(mx, my) && tmpSelected === false) {
				// check if this shape is already selected
				if (myState.selection.get() === mySel) {
					if (shapes[i].touchedAtHandles(mx, my)) {
						// in this case the shape is touched at the handles -> resize
						// pass event to shape event handler and begin possible resizing
						if (mySel instanceof Rectangle) {
							mySel.mouseDownSelected(e, mouse);
							myState.resizing = true;
						}
						if (mySel instanceof Polygon) {
							mySel.mouseDown(e, mouse);
							myState.resizing = true;
						}
					} else {
						// in this case the shape is touched, but NOT at the handles -> drag
						// Keep track of where in the object we clicked
						// so we can move it smoothly (see mousemove)
						if (mySel instanceof Rectangle) {
							myState.dragoffx = mx - mySel.x;
							myState.dragoffy = my - mySel.y;
						}
						if (mySel instanceof Polygon) {
							// store drag start points
							myState.dragoffx = mx;
							myState.dragoffy = my;
						}
						myState.dragging = true;
					}
				}
				myState.selection.set(mySel);
				// set the state of the shape as selected
				mySel.selected = true;
				myState.valid = false;
				tmpSelected = true;
				// return;
			} else {
				// unset the state of the shape as selected
				mySel.deselect();
				myState.valid = false;
			}
		}
		// if no shape was touched
		if (tmpSelected === false) {
			myState.selection.set(null);
		}
		// havent returned means we have failed to select anything.

	}

	// add mouse move handlers
	canvas.addEventListener('mousemove', mousemove, true);
	canvas.addEventListener('touchmove', mousemove, true);

	function mousemove(e) {
		e.preventDefault();
		e.stopPropagation();
		var mouse = myState.getMouse(e);
		this.style.cursor = 'auto';
		var mySel = myState.selection.get();
		if (myState.dragging) {
			if (mySel instanceof Rectangle) {
				// We don't want to drag the object by its top-left corner, we want to drag it
				// from where we clicked. Thats why we saved the offset and use it here
				mySel.x = mouse.x - myState.dragoffx;
				mySel.y = mouse.y - myState.dragoffy;
				myState.valid = false; // Something's dragging so we must redraw
				mySel.valid = false; // store information to database when rect gets drawn
			}
			if (mySel instanceof Polygon) {
				var translation = {
					x: mouse.x - myState.dragoffx,
					y: mouse.y - myState.dragoffy
				};
				mySel.move(e, translation);
				myState.dragoffx = mouse.x;
				myState.dragoffy = mouse.y;
			}
		}
		if (myState.resizing) {
			if (mySel instanceof Rectangle) {
				mySel.mouseMoveResize(e, mouse);
			}
			if (mySel instanceof Polygon) {
				mySel.mouseMove(e, mouse);
			}
		}
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
		if (myState.creatingElement.get() === true) {
			return;
		}
		var mouse = myState.getMouse(e);
		var r = Math.floor(Math.random() * 255);
		var g = Math.floor(Math.random() * 255);
		var b = Math.floor(Math.random() * 255);
		if (myState.insertMode === 'rect') {
			// myState.addShape(new Rectangle(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(' + r + ',' + g + ',' + b + ',.6)'));
			counter = myState.collection.find().fetch().length;
			myState.collection.insert({
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
		if (myState.insertMode === 'poly') {
			counter = myState.polyCollection.find().fetch().length;
			var id = myState.polyCollection.insert({
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
			myState.createdId.set(id);
			myState.creatingElement.set(true);
		}
	}

	// **** Options! ****
	this.interval = 30;
	setInterval(function() {
		myState.draw();
	}, myState.interval);

	// **** State tracking with sessions ****
	Tracker.autorun(function() {
		var selection = myState.selection.get();
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
	Tracker.autorun(function() {
		var isCreating = myState.creatingElement.get();
		Session.set('isCreatingElementOnCanvas', isCreating);
	});
	Tracker.autorun(function() {
		var selection = myState.selection.get();
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

CanvasState.prototype.addShape = function(shape) {
	this.shapes.push(shape);
	this.valid = false;
};

CanvasState.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
};

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
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
				if (shape.x > this.width || shape.y > this.height ||
					shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
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
CanvasState.prototype.getMouse = function(e) {
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
CanvasState.prototype.enableEditingMode = function() {
	this.creatingElement.set(true);
};
// check if requirements for creating a valid element are fulfilled
CanvasState.prototype.finishElementCreation = function() {
	var mySel = this.selection.get();
	if (!mySel.mayBeCreated()) {
		// not fulfilled -> remove from database
		mySel.collection.remove({
			_id: mySel.id
		});
	}
	this.creatingElement.set(false);
};

// checks if two points are close enough to each other depending on the closeEnough param
checkCloseEnough = function(p1, p2, closeEnough) {
	return Math.abs(p1 - p2) < closeEnough;
};

// Draws a white rectangle with a black border around it
drawRectWithBorder = function(x, y, sideLength, ctx, borderColor, bgColor) {
	if (!borderColor) {
		borderColor = 'black';
	}
	if (!bgColor) {
		bgColor = 'white';
	}
	ctx.save();
	ctx.fillStyle = borderColor;
	ctx.fillRect(x - (sideLength / 2), y - (sideLength / 2), sideLength, sideLength);
	ctx.fillStyle = bgColor;
	ctx.fillRect(x - ((sideLength - 1) / 2), y - ((sideLength - 1) / 2), sideLength - 1, sideLength - 1);
	ctx.restore();
};