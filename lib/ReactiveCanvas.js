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
/*global ReactiveCanvasStore */
/*global CanvasController */
/*global PanZoomCanvas */
/*global ReactiveVar */
/*global CanvasFunctions */
/*global document*/
/*global lodash*/
/*global Tracker*/
/*jslint evil: true */

 var _ = lodash;

if (Meteor.isClient) {
	// session defaults
	Session.setDefault('shapeSelectedOnCanvas', false);
	Session.setDefault('coordSelectedOnCanvas', false);
	Session.setDefault('isEditingShapeOnCanvas', false);
	Session.setDefault('addPoints', false);
}

/* 
 * Constructor for Polygon objects to hold data for all drawn objects.
 * @class
 * @property {string} canvasId									- The id of the canvas html object
 * @property {Array.<Object>} shapeConfig						- List of shape configs
 * @property {string} shapeConfig.type							- The name of the shape that the config object is corresponding to
 * @property {Mongo.Collection} shapeConfig.collection			- The collection where the shape is stored
 * @property {function(string)} shapeConfig.extendOnCreation	- This function gets called once a new shape of the corresponding type
 * 		is inserted to the database, giving the possibilty of manipulating the document before it gets stored to the database
 * @property {PanZoomCanvas} panZoomLayer 						- Holds the pan zoom layer
 * @property {Array.<Shape>} shapes 							- List of all the actual shapes
 * @property {ReactiveVar} selection 							- Currently selected Shape
 * @property {ReactiveVar} editingShape 						- Indicator if a shape is currently edited
 * @property {boolean} editMode 								- State indicator for the edit/view mode
 */
ReactiveCanvas = function(canvasId, shapeConfig, imageSrc) {

	var self = this;

	self.canvasId = canvasId;
	self.shapeConfig = shapeConfig;

	self.shapes = [];
	self.selection = new ReactiveVar(null);
	self.editingShape = new ReactiveVar(false);
	self.editMode = false;
	// init env vars
	CanvasFunctions.setCanvasEnvironmentVariables(self.canvasId);
	// init canvas controller
	self.canvasController = new CanvasController(self.canvasId);
	// init pan zoom layer
	self.panZoomLayer = new PanZoomCanvas(self.canvasId, imageSrc, self);
	// add pan zoom layer to the draw queue
	self.canvasController.drawQueue.push(self.panZoomLayer);
	// add all the shapes and handle db updates
	self.setupReactiveUpdates();
	// init sessions
	self._initSessions();

	// set event queue to be the reversed draw queue
	self.canvasController.eventQueue = _(self.canvasController.drawQueue.slice()).reverse().value();

	ReactiveCanvasStore[self.canvasId] = self;
};

ReactiveCanvas.prototype.needsRedraw = function() {

	var self = this;

	self.panZoomLayer.redraw = true;

};

// Touches

/* 
 * Get mouse position for given event
 * @param {object} e - mouse event
 * @return {object} coord - mouse coodinates
 */
ReactiveCanvas.prototype.getMousePosForEvent = function(e) {

	var self = this;
	var coord = self.panZoomLayer.getMousePosForEvent(e);

	return self.panZoomLayer.translateCoord(coord);

};

/* 
 * selects a shape and deselects the currently select shape
 * @param {Shape} shape - shape to select
 */
ReactiveCanvas.prototype.selectShape = function(shape) {

	var self = this;
	var currentSelected = self.selection.get();

	if (currentSelected && ((currentSelected.dragging === true) || (currentSelected.resizing === true))) {
		return;
	}
	self.resetSelection();
	self.selection.set(shape);
	shape.select();
	self.needsRedraw();

};


/*
 * resets the selection when nothing is touched
 */
ReactiveCanvas.prototype.touchNotConsumed = function() {

	var self = this;

	self.resetSelection();

};

/*
 * set up observation of database
 */
ReactiveCanvas.prototype.setupReactiveUpdates = function() {
	var self = this;

	_.each(self.shapeConfig, function(cfg) {
		// get elements form database
		var shapes = cfg.collection.find();
		// get class for given shape type string
		var shapeDef = ReactiveCanvasStore.shapesDef[cfg.type];
		// observe added shapes
		shapes.observeChanges({
			added: function(id) {
				self.addShape(new shapeDef.shapeType(id, cfg, self));
			},
			removed: function(id){
				self.removeShape(id);
			}
		});
	});
};

/*
 * setup sessions for templates to update
 */
ReactiveCanvas.prototype._initSessions = function() {
	var self = this;
	// track shape selection
	Tracker.autorun(function() {
		var selection = self.selection.get();
		if (selection !== null) {
			Session.set('shapeSelectedOnCanvas', true);
		} else {
			Session.set('shapeSelectedOnCanvas', false);
			Session.set('addPoints', false);
		}
	});
	// track shape editing
	Tracker.autorun(function() {
		if(self.editingShape.get() === true){
			Session.set('isEditingShapeOnCanvas', true);
		}else{
			Session.set('isEditingShapeOnCanvas', false);
		}
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

// shape managing

ReactiveCanvas.prototype.addShape = function(shape) {

	var self = this;

	self.shapes.push(shape);
	self.canvasController.drawQueue.push(shape);
	self.canvasController.eventQueue = _(self.canvasController.drawQueue.slice()).reverse().value();

};

ReactiveCanvas.prototype.removeShape = function(shapeId) {

	var self = this;

	function removeShapeFromArray (array) {
		var index = _.findIndex(array, function(shape) { return shape.id ===shapeId; });
		if(index > -1){
			array.splice(index, 1);
		}
	}
	// remove shape from queues
	removeShapeFromArray(self.shapes);
	removeShapeFromArray(self.canvasController.drawQueue);
	self.canvasController.eventQueue = _(self.canvasController.drawQueue.slice()).reverse().value();
};

ReactiveCanvas.prototype.setShapeForCropping = function(shapeId) {

	var self = this;
	var canvas = document.getElementById(self.canvasId);
	var shape = self.getShapeForId(shapeId);
	self.clippedShape = shape;
	shape.fixedOpacity = 0;
	// set shape invisible
	// shape.visible = false;
	// calc the bounding rectangle for the canvas
	self.boundingRect = CanvasFunctions.calcClipRectangle(shape);
	// change canvas dimensions to fit the shape
	// canvas.width = self.boundingRect.w + 1;
	// canvas.height = self.boundingRect.h + 1;
	// translate context to shape
	self.panZoomLayer.translation = {
		x: - self.boundingRect.x + (canvas.width/2 - self.boundingRect.w/2),
		y: - self.boundingRect.y + (canvas.height/2 - self.boundingRect.h/2)
	};
	self.panZoomLayer.translate(self.panZoomLayer.translation);

	self.clipped = true;
	self.needsRedraw();
};

// determin that the next click/mouseDown event will add a point to the selected element
ReactiveCanvas.prototype.enableEditingMode = function() {
	this.editingShape.set(true);
};
// check if requirements for creating a valid element are fulfilled
ReactiveCanvas.prototype.finishElementCreation = function() {
	var mySel = this.selection.get();
	if (!mySel.mayBeCreated()) {
		// not fulfilled -> remove from database
		mySel.cfg.collection.remove({
			_id: mySel.id
		});
	}
	this.editingShape.set(false);
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

	var self = this;

	self.resetSelection();
	// self.initEventHandlers();
	if(self.clippedShape){
		self.clippedShape.fixedOpacity = undefined;
	}
	self.clippedShape = null;
	self.panZoomLayer.resetTransformation();
	// show all shapes
	_.each(self.shapes, function(shape) {
		shape.visible = true;
	});
	// reset bounding rectangle
	self.boundingRect = {
		x: 0,
		y: 0,
		w: self.panZoomLayer.imageObj.width,
		h: self.panZoomLayer.imageObj.height
	};
	self.canvasController._initEventHandlers();
};

ReactiveCanvas.prototype.setScale = function(scale) {
	this.panZoomLayer.setScale(scale);
};

/*
 * @returns {x: Number, y: Number} Origin relative to the viewport
 */
ReactiveCanvas.prototype.getOrigin = function() {

	var self = this;
	var canvas = document.getElementById(self.canvasId);
	return {
		x: self.boundingRect.x,
		y: self.boundingRect.y
	};
};

ReactiveCanvas.prototype.getConfigForShapeType = function(shapeType) {
	var cfg = _.find(this.shapeConfig, function(cfg) {
		return cfg.type === shapeType;
	});
	return cfg;
};

/*
 * creates the desired shape at the desired position (at the origin of the viewport)
 */
ReactiveCanvas.prototype.createShape = function(shapeType, mouseEvent, extendShape) {

	var self = this;
	var coord = self.getOrigin();
	var shapeDef = ReactiveCanvasStore.shapesDef[shapeType];
	var cfg = self.getConfigForShapeType(shapeType);

	if (mouseEvent) {
		coord = {
			x: mouseEvent.clientX,
			y: mouseEvent.clientY
		};
	}

	function transformCoord(coord) {
		coord = self.panZoomLayer.transformCoord(coord);
		return coord;
	}

	shapeDef.shapeFunctions.createStandardShape(cfg, coord, transformCoord, self.panZoomLayer.scaleFactor, extendShape);

};