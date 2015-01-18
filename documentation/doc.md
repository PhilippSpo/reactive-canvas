# Canvas Fun Demo Documentation

There are two modes in demo: The view mode and the edit mode. You can change modes with a toggle button above the canvas. The layout in the canvas is the content.
 
##View mode:
The view mode is the default mode. Zooming and moving in the canvas happen in this mode. Clicking polygons changes the view to the detail view of the content in the space the polygon covers.
 
Actions:
-          Moving
-          Zooming
-          Polygon action
-          Creating polygon

 
##Edit mode:
The edit mode is for editing polygons. With entering the edit mode the mouse cursor changes to a cross.
 
Actions:
-          Creating polygons
-          Selecting polygons
-          Moving polygons
-          Deleting polygons
-          Adding new edge to polygon
-          Deleting polygon edge
-          Moving polygon edge
-          Moving polygone label
-          Moving
-          Zooming

 
 
 


##Detailed description of actions:
 
#####Moving in the canvas (view and edit mode)
For moving the point of view in the canvas press the left mouse button and move the mouse in the desired direction.   

#####Zooming in the canvas (view and edit mode)
For zooming use the slide bar above the canvas

#####Polygon action: Detail view of the content (view mode)
With clicking on one polygon the user comes to the detail view. In the detail view only the part of the content is seen which the clicked polygon covers.

#####Creating polygon (view and edit mode)
Clicking the Create-Button (+) a new polygon with four edges is created at upper left corner of the content. The polygon has a default size. The mode is automatically changed to the edit mode and the new polygon is selected to wokr with it.

#####Selecting polygons (edit mode)
By clicking on a polygon in the edit mode the polygon is selected. While selected a polygon darkens its background color and obtains handles at the edges and at the label. 

#####Moving polygons (edit mode)
A selected polygon is able to be moved. Press the left mouse button and move the mouse in the desired direction. The polygon follows the mouse movement. Release the mouse button at the desired end position. 

#####Deleting polygons (edit mode)
Select a polygon an press the delete-button (-) above the canvas.

#####Adding new edge to polygon (edit mode)
To add a new edge to a polygon select the polygon. Double-click at the desired postion of the new edge to create the edge there. The new edge is conntected with the both nearest existing edges. 

#####Deleting polygon edge (edit mode)
To delete a edge of a polygon select the polygon. Select the handle of the edge, which should be deleted, and press the delete-button (-) above the canvas.
If the number of edges goes under the limit of four, the polygon is re-created with four edges at upper left corner of the content in default size.

#####Moving plygon edge (edit mode)
To move a polygon edge select the polygon. Click on the handle of the edge which should be moved. The handle of the edge changes its colour to blue and is now selected. Press the left mouse button to move the edge. After moving the edge to its final position click some free space to release the selection of the edge.

#####Moving plygon label (edit mode)
After selecting a polygon click the on its label. The label is selected if its handles appear. It is now able to be moved by pressing the left mouse button over the label. Move it to the desired position and release the mouse button. 
