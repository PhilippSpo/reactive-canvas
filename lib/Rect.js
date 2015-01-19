// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Rectangle objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.

/* jshint strict: false */

/*jshint undef:true */
/*global Rectangle:true */
/*global ReactiveVar */
/*global Tracker */
/*global Shape */
/*global CanvasFunctions */
/*global TextField */
/*global document */

Rectangle = function(id, shapeCollection, canvasStateObj) {
  var shape = shapeCollection.findOne({
    _id: id
  });
  if (!shape) {
    return;
  }
  this.id = id;
  this.collection = shapeCollection;
  this.valid = true;
  this.opacity = 0.6;
  this.name = shape.name;
  this.canvasStateObj = canvasStateObj;
  this.textField = new TextField(this.name, this.canvasStateObj, this.collection, this.id);
  this.selectedCoord = new ReactiveVar(null);
  this.visible = true;

  // call superclass constructor
  Shape.call(this, shape);
  // store context
  var self = this;

  Tracker.autorun(function() {
    var shape = shapeCollection.findOne({
      _id: self.id
    });
    if (!shape) {
      self.remove();
      return;
    }
    var coords = shape.coords;
    // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
    // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
    // But we aren't checking anything else! We could put "Lalala" for the value of x 
    self.x = coords.x || 0;
    self.y = coords.y || 0;
    self.w = coords.w || 1;
    self.h = coords.h || 1;
    var c = shape.color;
    self.color = c;
    self.fill = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + self.opacity + ')' || '#AAAAAA';
    // only set canvas to invalid and not the shape (so that the db doesnt get populated with the same change twice)
    canvasStateObj.valid = false;


    if (shape.hasOwnProperty('textPos')) {
      self.textField.setPosition(shape.textPos.x, shape.textPos.y, self.canvasStateObj.canvas, false);
    } else {
      self.textField.setPosition((self.x + (self.w / 2)), (self.y + (self.h / 2)), self.canvasStateObj.canvas, false);
    }
  });
};
Rectangle.prototype = new Shape();

// Draws this shape to a given context
Rectangle.prototype.draw = function(ctx) {
  if (this.visible === false) {
    return;
  }

  // set opacity according to selection
  if (this.selected === true) {
    this.setOpacity(0.9);
  } else {
    this.setOpacity(0.6);
  }

  // update collection if position/size was changed
  if (!this.valid) {
    this.collection.update({
      _id: this.id
    }, {
      $set: {
        coords: {
          x: this.x,
          y: this.y,
          w: this.w,
          h: this.h
        }
      }
    });
    this.valid = true;
  }
  ctx.save();
  // fill rect with color
  ctx.fillStyle = this.fill;
  ctx.fillRect(this.x, this.y, this.w, this.h);

  // black dashed border when selected
  if (this.selected === true) {
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
  }

  // dashed border
  ctx.beginPath();
  ctx.setLineDash([5]);
  ctx.rect(this.x, this.y, this.w, this.h);
  ctx.lineWidth = 0.7;
  ctx.closePath();
  ctx.stroke();

  // draw resize handles when selected
  if (this.selected === true) {
    this.drawHandles(ctx);
  }
  this.textField.draw(ctx);
  ctx.restore();
};

Rectangle.prototype.mousedown = function(e, mouse) {
  // if this Rectangle is not selected yet than we dont accept any touches
  if (this.visible === false || this.selected === false) {
    return;
  }
  // check for touch at handles
  if (this.touchedAtHandles(mouse.x, mouse.y)) {
    // resizing
    this.mouseDownResize(e, mouse);
  } else {
    if (this.contains(mouse.x, mouse.y)) {
      //dragging
      this.dragging = true;
      // handle text field first
      if (this.textField.selected && this.textField.contains(mouse.x, mouse.y)) {
        this.textField.mousedown(e, mouse);
      } else {
        // if text field is not touched -> move rectangle
        this.dragoffx = mouse.x - this.x;
        this.dragoffy = mouse.y - this.y;
        // also tell the text field about the touch
        this.textField.mousedown(e, mouse);
      }
    }
  }
};

Rectangle.prototype.mouseup = function(e, mouse) {
  var touchHandled = Shape.prototype.mouseup.call(this);
  if (!this.selected) {
    // set as selected
    this.selected = true;
    this.canvasStateObj.selection.set(this);
  } else {
    this.canvasStateObj.dragTL = this.canvasStateObj.dragTR = this.canvasStateObj.dragBL = this.canvasStateObj.dragBR = false;
    // stop resizing/dragging
    this.dragging = false;
    this.resizing = false;

    touchHandled = this.textField.mouseup(e, mouse);
  }
  if (this.contains(mouse.x, mouse.y)) {
    touchHandled = true;
  }
  return touchHandled;
};

Rectangle.prototype.translate = function(e, mouse) {
  var translation = {
    x: mouse.x - this.dragoffx,
    y: mouse.y - this.dragoffy
  };
  // perform translation
  this.x = translation.x;
  this.y = translation.y;

};

// mouse down handler for selected state
Rectangle.prototype.mouseDownResize = function(e, mouse) {
  if (this.visible === false) {
    return;
  }
  this.resizing = true;
  var mouseX = mouse.x;
  var mouseY = mouse.y;
  var self = this;
  var c = CanvasFunctions;

  // 4 cases:
  // 1. top left
  if (c.checkCloseEnough(mouseX, self.x, self.closeEnough) && c.checkCloseEnough(mouseY, self.y, self.closeEnough)) {
    this.touchedHandle = 'topleft';
    e.target.style.cursor = 'nw-resize';
  }
  // 2. top right
  else if (c.checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && c.checkCloseEnough(mouseY, self.y, self.closeEnough)) {
    this.touchedHandle = 'topright';
    e.target.style.cursor = 'ne-resize';
  }
  // 3. bottom left
  else if (c.checkCloseEnough(mouseX, self.x, self.closeEnough) && c.checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
    this.touchedHandle = 'bottomleft';
    e.target.style.cursor = 'sw-resize';
  }
  // 4. bottom right
  else if (c.checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && c.checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
    this.touchedHandle = 'bottomright';
    e.target.style.cursor = 'se-resize';
  }
  // (5.) none of them
  else {
    // handle not resizing
  }
  this.canvasStateObj.valid = false; // something is resizing so we need to redraw
};

// handler for resize mouse move
Rectangle.prototype.mouseMoveResize = function(e, mouse) {
  if (this.visible === false) {
    return;
  }
  // call the corresponding functino for the corresponding handle
  switch (this.touchedHandle) {
    case 'topleft':
      this.dragTopLeft(e, mouse);
      break;
    case 'topright':
      this.dragTopRight(e, mouse);
      break;
    case 'bottomleft':
      this.dragBottomLeft(e, mouse);
      break;
    case 'bottomright':
      this.dragBottomRight(e, mouse);
      break;
  }
};

Rectangle.prototype.dragTopLeft = function(e, mouse) {
  e.target.style.cursor = 'nw-resize';
  // switch to top right handle
  if (((this.x + this.w) - mouse.x) < 0) {
    this.touchedHandle = 'topright';
  }
  // switch to top bottom left
  if (((this.y + this.h) - mouse.y) < 0) {
    this.touchedHandle = 'bottomleft';
  }
  this.w += this.x - mouse.x;
  this.h += this.y - mouse.y;
  this.x = mouse.x;
  this.y = mouse.y;
};

Rectangle.prototype.dragTopRight = function(e, mouse) {
  e.target.style.cursor = 'ne-resize';
  // switch to top left handle
  if ((this.x - mouse.x) > 0) {
    this.touchedHandle = 'topleft';
  }
  // switch to bottom right handle
  if (((this.y + this.h) - mouse.y) < 0) {
    this.touchedHandle = 'bottomright';
  }
  this.w = Math.abs(this.x - mouse.x);
  this.h += this.y - mouse.y;
  this.y = mouse.y;
};

Rectangle.prototype.dragBottomLeft = function(e, mouse) {
  e.target.style.cursor = 'sw-resize';
  // switch to bottom right handle
  if (((this.x + this.w) - mouse.x) < 0) {
    this.touchedHandle = 'bottomright';
  }
  // switch to top left handle
  if ((this.y - mouse.y) > 0) {
    this.touchedHandle = 'topleft';
  }
  this.w += this.x - mouse.x;
  this.h = Math.abs(this.y - mouse.y);
  this.x = mouse.x;
};

Rectangle.prototype.dragBottomRight = function(e, mouse) {
  e.target.style.cursor = 'se-resize';
  // switch to bottom left handle
  if ((this.x - mouse.x) > 0) {
    this.touchedHandle = 'bottomleft';
  }
  // switch to top right handle
  if ((this.y - mouse.y) > 0) {
    this.touchedHandle = 'topright';
  }
  this.w = Math.abs(this.x - mouse.x);
  this.h = Math.abs(this.y - mouse.y);
};