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
// remove shape from canvas and delete reference
Rectangle.prototype.remove = function(removeFromDb) {
  if (removeFromDb) {
    this.collection.remove({
      _id: this.id
    });
  }
  // remove shape from canvas when it has been removed in the db
  var index = this.canvasStateObj.shapes.indexOf(this);
  if (index > -1) {
    this.canvasStateObj.shapes.splice(index, 1);
  }
  if (this.canvasStateObj.selection.get() === this) {
    this.canvasStateObj.selection.set(null);
    this.canvasStateObj.creatingElement.set(false);
  }
  // tell canvas to redraw
  this.canvasStateObj.valid = false;
};

Rectangle.prototype.setOpacity = function(opacity) {
  var c = this.color;
  if (!this.color) {
    return;
  }
  this.fill = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + opacity + ')';
  this.opacity = opacity;
};

// Draws this shape to a given context
Rectangle.prototype.draw = function(ctx) {

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
  // ctx.fillRect(this.x, this.y, this.w, this.h);
  ctx.beginPath();
  ctx.moveTo(this.x, this.y);
  ctx.lineTo(this.x + this.w, this.y);
  ctx.lineTo(this.x + this.w, this.y + this.h);
  ctx.lineTo(this.x, this.y + this.h);
  ctx.closePath();
  ctx.fill();

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
  drawRectWithBorder(this.x, this.y, this.closeEnough, ctx);
  drawRectWithBorder(this.x + this.w, this.y, this.closeEnough, ctx);
  drawRectWithBorder(this.x + this.w, this.y + this.h, this.closeEnough, ctx);
  drawRectWithBorder(this.x, this.y + this.h, this.closeEnough, ctx);
};

// Determine if a point is inside the shape's bounds
Rectangle.prototype.contains = function(mx, my) {
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  var xBool = false;
  var yBool = false;
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  if (this.w >= 0) {
    xBool = (this.x <= mx) && (this.x + this.w >= mx);
  } else {
    xBool = (this.x >= mx) && (this.x + this.w <= mx);
  }
  if (this.h >= 0) {
    yBool = (this.y <= my) && (this.y + this.h >= my);
  } else {
    yBool = (this.y >= my) && (this.y + this.h <= my);
  }
  return (xBool && yBool);
};

// Determine if a point is inside the shape's handles
Rectangle.prototype.touchedAtHandles = function(mx, my) {
  // 1. top left handle
  if (checkCloseEnough(mx, this.x, this.closeEnough) && checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 2. top right handle
  else if (checkCloseEnough(mx, this.x + this.w, this.closeEnough) && checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 3. bottom left handle
  else if (checkCloseEnough(mx, this.x, this.closeEnough) && checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
  // 4. bottom right handle
  else if (checkCloseEnough(mx, this.x + this.w, this.closeEnough) && checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
};

Rectangle.prototype.deselect = function() {
  this.selected = false;
  this.selectedCoord.set(null);
};

// mouse down handler for selected state
Rectangle.prototype.mouseDownSelected = function(e, mouse) {
  var mouseX = mouse.x;
  var mouseY = mouse.y;
  var self = this;

  // if there isn't a rect yet
  if (self.w === undefined) {
    self.x = mouseY;
    self.y = mouseX;
    this.canvasStateObj.dragBR = true;
  }

  // if there is, check which corner
  //   (if any) was clicked
  //
  // 4 cases:
  // 1. top left
  else if (checkCloseEnough(mouseX, self.x, self.closeEnough) && checkCloseEnough(mouseY, self.y, self.closeEnough)) {
    this.canvasStateObj.dragTL = true;
    e.target.style.cursor = 'nw-resize';
  }
  // 2. top right
  else if (checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && checkCloseEnough(mouseY, self.y, self.closeEnough)) {
    this.canvasStateObj.dragTR = true;
    e.target.style.cursor = 'ne-resize';
  }
  // 3. bottom left
  else if (checkCloseEnough(mouseX, self.x, self.closeEnough) && checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
    this.canvasStateObj.dragBL = true;
    e.target.style.cursor = 'sw-resize';
  }
  // 4. bottom right
  else if (checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
    this.canvasStateObj.dragBR = true;
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
  var mouseX = mouse.x;
  var mouseY = mouse.y;

  if (this.canvasStateObj.dragTL) {
    e.target.style.cursor = 'nw-resize';
    // switch to top right handle
    if (((this.x + this.w) - mouseX) < 0) {
      this.canvasStateObj.dragTL = false;
      this.canvasStateObj.dragTR = true;
    }
    // switch to top bottom left
    if (((this.y + this.h) - mouseY) < 0) {
      this.canvasStateObj.dragTL = false;
      this.canvasStateObj.dragBL = true;
    }
    this.w += this.x - mouseX;
    this.h += this.y - mouseY;
    this.x = mouseX;
    this.y = mouseY;
  } else if (this.canvasStateObj.dragTR) {
    e.target.style.cursor = 'ne-resize';
    // switch to top left handle
    if ((this.x - mouseX) > 0) {
      this.canvasStateObj.dragTR = false;
      this.canvasStateObj.dragTL = true;
    }
    // switch to bottom right handle
    if (((this.y + this.h) - mouseY) < 0) {
      this.canvasStateObj.dragTR = false;
      this.canvasStateObj.dragBR = true;
    }
    this.w = Math.abs(this.x - mouseX);
    this.h += this.y - mouseY;
    this.y = mouseY;
  } else if (this.canvasStateObj.dragBL) {
    e.target.style.cursor = 'sw-resize';
    // switch to bottom right handle
    if (((this.x + this.w) - mouseX) < 0) {
      this.canvasStateObj.dragBL = false;
      this.canvasStateObj.dragBR = true;
    }
    // switch to top left handle
    if ((this.y - mouseY) > 0) {
      this.canvasStateObj.dragBL = false;
      this.canvasStateObj.dragTL = true;
    }
    this.w += this.x - mouseX;
    this.h = Math.abs(this.y - mouseY);
    this.x = mouseX;
  } else if (this.canvasStateObj.dragBR) {
    e.target.style.cursor = 'se-resize';
    // switch to bottom left handle
    if ((this.x - mouseX) > 0) {
      this.canvasStateObj.dragBR = false;
      this.canvasStateObj.dragBL = true;
    }
    // switch to top right handle
    if ((this.y - mouseY) > 0) {
      this.canvasStateObj.dragBR = false;
      this.canvasStateObj.dragTR = true;
    }
    this.w = Math.abs(this.x - mouseX);
    this.h = Math.abs(this.y - mouseY);
  }

  this.canvasStateObj.valid = false; // something is resizing so we need to redraw
  this.valid = false; // store information to database when rect gets drawn
};

Rectangle.prototype.mouseUpSelected = function(e) {
  this.canvasStateObj.dragTL = this.canvasStateObj.dragTR = this.canvasStateObj.dragBL = this.canvasStateObj.dragBR = false;
};