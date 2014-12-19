# reactive-canvas
[![Code Climate](https://codeclimate.com/github/PhilippSpo/reactive-canvas/badges/gpa.svg)](https://codeclimate.com/github/PhilippSpo/reactive-canvas)<br>
Draw polygons and rectangles on a HTML5 canvas reactively<br>
Demo here: http://canvasisfun.meteor.com<br>
Demo code here: https://github.com/PhilippSpo/reactive-canvas-demo

### Getting started

Here is some example code to get you started.
first add philippspo:reactive-canvas to your meteor project.
```sh
$ meteor add philippspo:reactive-canvas
```
Next add a canvas element to your html.
```html
<template name="hello">
    <canvas id="canvas1" style="border: 1px solid black;" width="1000" height="1000">
        <br>
    	This text is displayed if your browser does not support HTML5 Canvas.
    </canvas>
</template>
```
Create some mongo collections to store your canvas elements into.
```javascript
Rectangles = new Mongo.Collection('rectangles');
Polygons = new Mongo.Collection('polygons');
```
Now add the client code for initializing the reactive canvas
```javascript
if (Meteor.isClient) {
    // subscribe to whatever collections you store your 2d elements in
    Meteor.subscribe('polygons');
    Meteor.subscribe('rectangles');
    // when the canvas is rendered we call the init function
    Template.hello.rendered = function() {
        init();
    };
    // initialize the reactiveCanvas and the Rectangles
    init = function() {
        var canvas = document.getElementById('canvas1');
        // store a reference to the reactive canvas in the template
        Template.hello.reactiveCanvas = new ReactiveCanvas(canvas, Rectangles, Polygons);
    }
}
```
The result of this is an empty canvas, so we are not quite there.
We need a way of telling the ReactiveCanvas which type of element we want to draw.
We will use some basic bootstrap buttons for this, which you can add where ever you want in your html.
```html
<div class="btn-group drawModeSelect" data-toggle="buttons">
	<label class="btn btn-default active">
		<input class="drawMode" type="radio" value="rect" autocomplete="off" checked> Rectangle
	</label>
	<label class="btn btn-default">
		<input class="drawMode" type="radio" value="poly" autocomplete="off"> Polygon
	</label>
</div>
<button id="finishElement" type="button" class="btn btn-success {{#unless isCreating}}hidden{{/unless}}">Done!</button>
```
And here come the event handlers and helpers for the code we just added.
```javascript
Template.hello.events({
    'change .drawMode': function(e) {
      var val = $('input[name=drawMode]:checked').val();
      Template.hello.reactiveCanvas.insertMode = val;
    },
    'click #finishElement': function() {
      Template.hello.reactiveCanvas.finishElementCreation();
    }
  });

  Template.hello.helpers({
    isCreating: function() {
      return Session.get('isCreatingElementOnCanvas');
    }
  });
```
When clicking on the buttons we just added, the insert mode of the Reactive gets changed either to `rect` or `poly`. Now a corresponding element can via double-clicking on the canvas.
For a polygon the process of adding a new element is a litte bit more complex. When double-clicking you add the first coordinate of the polygon. You can add more points then by just clicking at the desired spot on the canvas. When you hit the "Done!" button the polygon gets created, by calling the `finishElementCreating()` method on the ReactiveCanvas object.

### Session variables
As you can see in the `isCreating` helper ReactiveCanvas provides some session variables for you to reactivly update your UI.
  - `isCreatingElementOnCanvas`: equals true if there a polygon is beeing drawed on the canvas by the user
  - `shapeSelectedOnCanvas`: equals true if the user has selected a element
  - `addPoints`: equals true if a element is selected, to which the user may add some more coordinate points
  - `coordSelectedOnCanvas`: equals true if the user has selected a coordinate of a polygon (e.g. can be used for deleting polygon coordinate points)
