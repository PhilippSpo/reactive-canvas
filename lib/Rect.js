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

Rectangle = function(id, shapeCollection, canvasStateObj) {
  var shape = shapeCollection.findOne({
    _id: id
  });
  if (!shape) {
    return;
  }
  this.id = id;
  this.selected = false;
  this.closeEnough = 10;
  this.collection = shapeCollection;
  this.valid = true;
  this.opacity = 0.6;
  this.name = shape.name;
  this.canvasStateObj = canvasStateObj;
  this.selectedCoord = new ReactiveVar(null);
  this.visible = true;
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
  });
};
Rectangle.prototype = new Shape();
// remove shape from canvas and delete reference
Rectangle.prototype.remove = function(removeFromDb) {
  Shape.prototype.remove.call(this, removeFromDb);
};

Rectangle.prototype.setOpacity = function(opacity) {
  Shape.prototype.setOpacity.call(this, opacity);
};

// Draws this shape to a given context
Rectangle.prototype.draw = function(ctx) {
  if(this.visible === false){
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
  ctx.stroke();

  // draw resize handles when selected
  if (this.selected === true) {
    this.drawHandles(ctx);
  }

  // add text
  ctx.font = '15pt Helvetica Neue';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(this.name, this.x + (this.w / 2), this.y + (this.h / 2));
};

// Draw handles for resizing the Rectangle
Rectangle.prototype.drawHandles = function(ctx) {
  var c = CanvasFunctions;
  var coord = {
    x: this.x,
    y: this.y
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x + this.w,
    y: this.y
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x + this.w,
    y: this.y + this.h
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x,
    y: this.y + this.h
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
};

// Determine if a point is inside the shape's bounds
Rectangle.prototype.contains = function(mx, my) {
  if(this.visible === false){
    return;
  }
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  var xBool = coordInRange(mx, this.x, this.w);
  var yBool = coordInRange(my, this.y, this.h);

  function coordInRange(mouseCoord, rectCoord, rectSideLength) {
    if (rectSideLength >= 0) {
      return (rectCoord <= mouseCoord) && (rectCoord + rectSideLength >= mouseCoord);
    } else {
      return (rectCoord >= mouseCoord) && (rectCoord + rectSideLength <= mouseCoord);
    }
  }
  return (xBool && yBool);
};

// Determine if a point is inside the shape's handles
Rectangle.prototype.touchedAtHandles = function(mx, my) {
  if(this.visible === false){
    return;
  }
  var c = CanvasFunctions;
  // 1. top left handle
  if (c.checkCloseEnough(mx, this.x, this.closeEnough) && c.checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 2. top right handle
  else if (c.checkCloseEnough(mx, this.x + this.w, this.closeEnough) && c.checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 3. bottom left handle
  else if (c.checkCloseEnough(mx, this.x, this.closeEnough) && c.checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
  // 4. bottom right handle
  else if (c.checkCloseEnough(mx, this.x + this.w, this.closeEnough) && c.checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
};

Rectangle.prototype.deselect = function() {
  this.selected = false;
  this.selectedCoord.set(null);
};

// mouse down handler for selected state
Rectangle.prototype.mouseDownSelected = function(e, mouse) {
  if(this.visible === false){
    return;
  }
  var mouseX = mouse.x;
  var mouseY = mouse.y;
  var self = this;
  var c = CanvasFunctions;

  // if there isn't a rect yet
  if (self.w === undefined) {
    self.x = mouseY;
    self.y = mouseX;
    c.dragBR = true;
  }

  // if there is, check which corner
  //   (if any) was clicked
  //
  // 4 cases:
  // 1. top left
  else if (c.checkCloseEnough(mouseX, self.x, self.closeEnough) && c.checkCloseEnough(mouseY, self.y, self.closeEnough)) {
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
  if(this.visible === false){
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

  this.canvasStateObj.valid = false; // something is resizing so we need to redraw
  this.valid = false; // store information to database when rect gets drawn
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

Rectangle.prototype.mouseUpSelected = function() {
  if(this.visible === false){
    return;
  }
  this.canvasStateObj.dragTL = this.canvasStateObj.dragTR = this.canvasStateObj.dragBL = this.canvasStateObj.dragBR = false;
};