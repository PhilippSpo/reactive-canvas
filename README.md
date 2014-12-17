# reactive-canvas
Draw polygons and rectangles on a HTML5 canvas reactivly<br>

Here is some example code to get you started.
Add a canvas element to your html.
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
        var s = Template.hello.reactiveCanvas;
        var shapes = Rectangles.find();
        var polygons = Polygons.find();
    
        // observe added and removed
        shapes.observeChanges({
            added: function(id) {
                s.addShape(new Rectangle(id, Rectangles, s));
            },
            removed: function(id) {
                // is handled automatically at the moment
                // if you want to have some code to handle the removing do it here
            }
        });
        polygons.observeChanges({
            added: function(id) {
                s.addShape(new Polygon(id, Polygons, s));
            },
            removed: function(id) {
                // is handled automatically at the moment
                // if you want to have some code to handle the removing do it here
            }
        });
    }
}
```

Demo here: http://canvasisfun.meteor.com<br>
Demo code here: https://github.com/PhilippSpo/reactive-canvas-demo
