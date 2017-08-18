// Project A: Caterpillar and Bird Graphics 
///////////////////////////////////////////////////////////
// Credits to:
// Kouichi Matsude and Rodger Lea
// from "WebGL Programming Guide: Interactive 3D Graphics Programming with WebGL" 
/// and 
// Northwestern Univ Jack Tumblin 
////// .js and .html MODIFIED for EECS 351-1 

// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables
var ANGLE_STEP = 8.0;		// Rotation angle rate (degrees/second) 
 
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.

  // Create, init current rotation angle and movement variables
  var currentAngle = 0.0;
  var caterpillarAngle = 0.0; 
  var caterpillarMove = 0.0; 
  var caterpillarUpDown = 0.0;

  // crate, init variables for mouse dragging 
  var isDrag=false;
  var xMclik=0.0;
  var yMclik=0.0;
  var xMdragTot=0.0;
  var yMdragTot=0.0; 

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  	// Register all mouse and keyboard events 
  canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
  canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };					
  canvas.onmouseup = function(ev){myMouseUp(   ev, gl, canvas)};

	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
	window.addEventListener("keypress", myKeyPress, false);

  // Specify the color for clearing <canvas>
gl.clearColor(0.678, 1, 1, 1.0);
  //Enable 3D depth-test when drawing: don't over-draw at any pixel 
gl.enable(gl.DEPTH_TEST); 	  
	
  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  
  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    caterpillarAngle = animateC(caterpillarAngle);
    
    draw(gl, n, modelMatrix, u_ModelMatrix);   // Draw shapes
    //draw(gl,n,caterpillarAngle, modelMatrix, u_ModelMatrix); 
    // report current angle on console
    console.log('currentAngle=',currentAngle);
    console.log('caterpillarAngle=', caterpillarAngle); 
    
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image	
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all shapes.
 
 	// Make each 3D shape in its own array of vertices:
  makeBeak();             // create, fill the beakVerts array 
  makeEye();             // create, fill eyeVerts array 
  makeTail();					// create, fill the tailVerts array
  makeSphere();						// create, fill the sphVerts array
  makeLegPart();						// create, fill the legVerts array
  makeCaterpillarBody();				// create, fill the catbVerts array
  makeCaterpillarHead();        // create, fill cathVerts array 

	var mySiz = (tailVerts.length + sphVerts.length + eyeVerts.length + cathVerts.length 
							  + legVerts.length + catbVerts.length + beakVerts.length 
					);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	
	beakStart = 0;                                 // beak
	for(i=0,j=0; j< beakVerts.length; i++,j++) {
		colorShapes[i] = beakVerts[j];
	}
	eyeStart = i;                                  // eye
	for(j=0; j< eyeVerts.length; i++,j++) {
  	colorShapes[i] = eyeVerts[j];
		}
	tailStart = i;						
  for(j=0; j< tailVerts.length; i++,j++) {
  	colorShapes[i] = tailVerts[j];
		}
	sphStart = i;						
	for(j=0; j< sphVerts.length; i++, j++) {
		colorShapes[i] = sphVerts[j];
		}
		legStart = i;						
	for(j=0; j< legVerts.length; i++, j++) {
		colorShapes[i] = legVerts[j];
		}
		catbStart = i;						
	for(j=0; j< catbVerts.length; i++, j++) {
		colorShapes[i] = catbVerts[j];
		}
		cathStart = i;						
	for(j=0; j< cathVerts.length; i++, j++) {
		colorShapes[i] = cathVerts[j];
		}
	
  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}


function makeBeak() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.839, 0.839, 0.839]);	// dark gray
 //var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var topColr = new Float32Array([0.854, 0.64, 0.125]);	
 var botColr = new Float32Array([0.839, 0.839, 0.839]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 0.01;		// radius of bottom of cylinder
 
 // Create a (global) array to hold this cylinder's vertices;
 beakVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			beakVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			beakVerts[j+1] = 0.0;	
			beakVerts[j+2] = 1.0; 
			beakVerts[j+3] = 1.5;			// r,g,b = topColr[]
			beakVerts[j+4]=ctrColr[0]; 
			beakVerts[j+5]=ctrColr[1]; 
			beakVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			beakVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			beakVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			beakVerts[j+2] = 1.0;	// z
			beakVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			beakVerts[j+4]=topColr[0]; 
			beakVerts[j+5]=topColr[1]; 
			beakVerts[j+6]=topColr[2];			
		}
	}
	// Create the side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				beakVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				beakVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				beakVerts[j+2] = 1.0;	// z
				beakVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				beakVerts[j+4]=topColr[0]; 
				beakVerts[j+5]=topColr[1]; 
				beakVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				beakVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				beakVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				beakVerts[j+2] =-1.0;	// z
				beakVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				beakVerts[j+4]=botColr[0]; 
				beakVerts[j+5]=botColr[1]; 
				beakVerts[j+6]=botColr[2];			
		}
	}
	// Create the bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			beakVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			beakVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			beakVerts[j+2] =-1.0;	// z
			beakVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			beakVerts[j+4]=botColr[0]; 
			beakVerts[j+5]=botColr[1]; 
			beakVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			beakVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			beakVerts[j+1] = 0.0;	
			beakVerts[j+2] =-1.0; 
			beakVerts[j+3] = 1.0;			// r,g,b = botColr[]
			beakVerts[j+4]=botColr[0]; 
			beakVerts[j+5]=botColr[1]; 
			beakVerts[j+6]=botColr[2];
		}
	}
}


function makeTail() {
//==============================================================================
// Make a tail shape from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices'  
// and connect them as a 'stepped spiral' design (see makeTail) to build the
// from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 50;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)

  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold vertices:
  tailVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		////////////////////////////////////////////
		cos1 = Math.cos((s-3)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
				tailVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				tailVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				tailVerts[j+2] = cos0;		
				tailVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
				tailVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				tailVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				tailVerts[j+2] = cos1;																				// z
				tailVerts[j+3] = 1.0;																				// w.		
			}

			var colr = Math.random(); 
					tailVerts[j+4]=colr;
					tailVerts[j+5]=colr; 
					tailVerts[j+6]=colr;	
			
		}
	}
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeTail) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 50;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)

  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

    	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			var colr = Math.random();  
				sphVerts[j+4]=colr;
				sphVerts[j+5]=colr;
				sphVerts[j+6]= colr;
			
		}
	}
}

function makeEye() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeTail) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  //var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray

  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

  	var topColr = new Float32Array([0, 0, 0]);	
    var equColr = new Float32Array([0, 0, 0]);	// Equator:    bright green
    var botColr = new Float32Array([0, 0, 0]);	// blue
    	// Create a (global) array to hold this sphere's vertices:
  eyeVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
  										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				eyeVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				eyeVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				eyeVerts[j+2] = cos0;		
				eyeVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				eyeVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				eyeVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				eyeVerts[j+2] = cos1;																				// z
				eyeVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				eyeVerts[j+4]=topColr[0]; 
				eyeVerts[j+5]=topColr[1]; 
				eyeVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				eyeVerts[j+4]=botColr[0]; 
				eyeVerts[j+5]=botColr[1]; 
				eyeVerts[j+6]=botColr[2];	
			}
			else {
					eyeVerts[j+4]=botColr[0]; 
					eyeVerts[j+5]=botColr[1];  
					eyeVerts[j+6]=botColr[2]; 				
			}
		}
	}
}

function makeLegPart() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([.3, .2, 0]);	// dark gray
 //var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var topColr = new Float32Array([0.3, 0.2, 0]);	
 var botColr = new Float32Array([0.184, 0.184, 0.184]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 0.14;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 legVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			legVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			legVerts[j+1] = 0.0;	
			legVerts[j+2] = 0.5; 
			legVerts[j+3] = 0.5;			// r,g,b = topColr[]
			legVerts[j+4]=ctrColr[0]; 
			legVerts[j+5]=ctrColr[1]; 
			legVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			legVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);			// x
			legVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			legVerts[j+2] = 1.0;	// z
			legVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			legVerts[j+4]=topColr[0]; 
			legVerts[j+5]=topColr[1]; 
			legVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				legVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
				legVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
				legVerts[j+2] = 1.0;	// z
				legVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				legVerts[j+4]=topColr[0]; 
				legVerts[j+5]=topColr[1]; 
				legVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				legVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				legVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				legVerts[j+2] =-1.0;	// z
				legVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				legVerts[j+4]=botColr[0]; 
				legVerts[j+5]=botColr[1]; 
				legVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			legVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			legVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			legVerts[j+2] =-1.0;	// z
			legVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			legVerts[j+4]=botColr[0]; 
			legVerts[j+5]=botColr[1]; 
			legVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			legVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			legVerts[j+1] = 0.0;	
			legVerts[j+2] =-1.0; 
			legVerts[j+3] = 1.0;			// r,g,b = botColr[]
			legVerts[j+4]=botColr[0]; 
			legVerts[j+5]=botColr[1]; 
			legVerts[j+6]=botColr[2];
		}
	}
}

function makeCaterpillarBody() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	// dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.4;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 catbVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			catbVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			catbVerts[j+1] = 0.0;	
			catbVerts[j+2] = 1.0; 
			catbVerts[j+3] = 1.0;			// r,g,b = topColr[]
			catbVerts[j+4]=ctrColr[0]; 
			catbVerts[j+5]=ctrColr[1]; 
			catbVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			catbVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			catbVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			catbVerts[j+2] = 1.0;	// z
			catbVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			catbVerts[j+4]=topColr[0]; 
			catbVerts[j+5]=topColr[1]; 
			catbVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				catbVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				catbVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				catbVerts[j+2] = 1.0;	// z
				catbVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				catbVerts[j+4]=topColr[0]; 
				catbVerts[j+5]=topColr[1]; 
				catbVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				catbVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				catbVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				catbVerts[j+2] =-1.0;	// z
				catbVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				catbVerts[j+4]=botColr[0]; 
				catbVerts[j+5]=botColr[1]; 
				catbVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			catbVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			catbVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			catbVerts[j+2] =-1.0;	// z
			catbVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			catbVerts[j+4]=botColr[0]; 
			catbVerts[j+5]=botColr[1]; 
			catbVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			catbVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			catbVerts[j+1] = 0.0;	
			catbVerts[j+2] =-1.0; 
			catbVerts[j+3] = 1.0;			// r,g,b = botColr[]
			catbVerts[j+4]=botColr[0]; 
			catbVerts[j+5]=botColr[1]; 
			catbVerts[j+6]=botColr[2];
		}
	}
}  

function makeCaterpillarHead() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeTail) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.4, 0.7, 0.4]);	// North Pole: light gray
  var botColr = new Float32Array([0.4, 0.7, 0.4]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  cathVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts

		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
	 
				cathVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				cathVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				cathVerts[j+2] = cos0;		
				cathVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
				cathVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				cathVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				cathVerts[j+2] = cos1;																				// z
				cathVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// set some interesting colors for vertices:
				cathVerts[j+4]=topColr[0]; 
				cathVerts[j+5]=topColr[1]; 
				cathVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				cathVerts[j+4]=botColr[0]; 
				cathVerts[j+5]=botColr[1]; 
				cathVerts[j+6]=botColr[2];	
			}
			else {
				var color = Math.random();
				if (color > 0.5) {
					// light green 
					cathVerts[j+4]=0.4;// r
					cathVerts[j+5]=0.7;//g
					cathVerts[j+6]=0.4;//b	
				} 
				else{
					// light blue
					cathVerts[j+4]=0.5; // r
					cathVerts[j+5]=0.5;  //g
					cathVerts[j+6]=1.0;		//b	
				}
			}
		}
	}
}

function draw(gl, n, modelMatrix, u_ModelMatrix) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);

   //--------Draw Head
  modelMatrix.setTranslate( -0.04, .6, 0.5); // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(0.55,0.55,-1); // make it smaller 																		// to match WebGL display canvas.
  modelMatrix.scale(0.3, 0.3, 0.3);
  modelMatrix.rotate(currentAngle * 1.2, 0, 1, 1);  
  modelMatrix.translate(.2,-0.2,1.0)
	modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
	// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							sphStart/floatsPerVertex,	// start at this vertex number, and 
  							sphVerts.length/floatsPerVertex);	// draw this many vertices.

pushMatrix(modelMatrix);

   //--------Draw Eye 
  modelMatrix.translate( -0.3, 0.3, 1.0); 												// to match WebGL display canvas.
  modelMatrix.scale(0.17, 0.17, 0.17);
	// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							eyeStart/floatsPerVertex,	// start at this vertex number, and 
  							eyeVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 

   //--------Draw Eye 
  modelMatrix.translate( -0.3, 0.3, -1.0);												// to match WebGL display canvas.
  modelMatrix.scale(0.17, 0.17, 0.17);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							eyeStart/floatsPerVertex,	// start at this vertex number, and 
  							eyeVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix(); 
pushMatrix(modelMatrix);

 // Draw Beak  
 modelMatrix.translate( -1.1, .18, 0.1);
 modelMatrix.scale(0.34,0.34,0.34);
 modelMatrix.rotate(80,0,1,0);
 modelMatrix.rotate(15,1,0,0);
  modelMatrix.rotate(currentAngle * -1.5, 1, 0, 0);  
  modelMatrix.translate(0.7,0,0);
 gl.uniformMatrix4fv(u_ModelMatrix,false,modelMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  
 modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 

 // Draw beak: moving part 
 modelMatrix.translate( -1.1, .4, 0.1);
 modelMatrix.scale(0.34,0.34,0.34);
 modelMatrix.rotate(80,0,1,0);
 modelMatrix.rotate(15,1,0,0);
  modelMatrix.rotate(currentAngle * 1.5, 1, 0, 0);  
  modelMatrix.translate(0.7,0,0);
 gl.uniformMatrix4fv(u_ModelMatrix,false,modelMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  

modelMatrix = popMatrix(); 
  //--------Draw Body
  modelMatrix.translate( 0.8, -2.2, 0); 
  modelMatrix.scale(1.7,1.7,1.7);							
  modelMatrix.translate(.3,0,0.1)
	// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							sphStart/floatsPerVertex,	// start at this vertex number, and 
  							sphVerts.length/floatsPerVertex);	// draw this many vertices.


  //-------Draw tail 
  modelMatrix.translate(1,-0.6, -0.4);  
  modelMatrix.rotate(-90, 0,1,0);
  modelMatrix.translate(0.4,0.6,0.1);
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  // Draw just the vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							tailStart/floatsPerVertex, // start at this vertex number, and
  							tailVerts.length/floatsPerVertex);	// draw this many vertices.


pushMatrix(modelMatrix); 
////JOINTED LEGS/////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

  //--------Draw Upper Leg: left
  modelMatrix.translate(0.2, -1.1, 1.1);
  modelMatrix.scale(0.4,0.4,0.4);							
  modelMatrix.rotate(90,1,0,0);
  modelMatrix.rotate(currentAngle * 1.7, 1,0, 0);  
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

  //--------Draw Lower Leg left
  modelMatrix.translate(0,0.39,1.8);
  modelMatrix.rotate(150,1,0,0);
  modelMatrix.rotate(currentAngle * 0.4, 0,0, 1);  // Spin on Z axis
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix.translate(-.5,.2,-.98);
    
      //--------Draw top Claw part
  modelMatrix.rotate(0,1,0,0);		
 modelMatrix.rotate(70,0,1,0);
 modelMatrix.rotate(90,0,0,1);   
  modelMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

pushMatrix(modelMatrix); 
 //--------Draw top Claw part
  modelMatrix.translate(-0.6,0,0.2);	
  modelMatrix.rotate(40,0,1,0.4);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix(); 
  
 //--------Draw top Claw part
 modelMatrix.translate(-1.05,-0.2,.7);
 modelMatrix.rotate(80,0,1,0.4);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix(); 

  //--------Draw Upper Leg: right
  modelMatrix.translate(0, -1.1, 0.8);	
  modelMatrix.scale(0.4,0.4,0.4);							
  modelMatrix.rotate(90,1,0,0);
  modelMatrix.rotate(currentAngle * 1.2, 1,0, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

  //--------Draw Lower Leg left
  modelMatrix.translate(0,0.39,1.8);
  modelMatrix.rotate(150,1,0,0);
  modelMatrix.rotate(currentAngle * 0.4, 0,0, 1);  
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix.translate(-0.2,.3,-1);  // move drawing axis 

      //--------Draw top Claw part
  modelMatrix.rotate(0,1,0,0);		
  modelMatrix.rotate(70,0,1,0);
  modelMatrix.rotate(90,0,0,1); 
  modelMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.


pushMatrix(modelMatrix); 
 //--------Draw top Claw part
  modelMatrix.translate(-0.6,0,0.2);
  modelMatrix.rotate(40,0,1,0.4);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.

modelMatrix = popMatrix(); 
  
 //--------Draw Claw part
 modelMatrix.translate(-1.05,-0.2,.7);		
 modelMatrix.rotate(80,0,1,0.4);
 gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  legStart/floatsPerVertex,	// start at this vertex number, and
  						  legVerts.length/floatsPerVertex);	// draw this many vertices.


//-------CATERPILLAR-------------------------------------------
//----------------------------------------------------------

  //--------Draw Head
  modelMatrix.setTranslate( -0.5 + caterpillarMove, -0.65 + caterpillarUpDown, 0.0); 						
  modelMatrix.rotate(180,0,0,1);														
  modelMatrix.scale(0.045, 0.045, 0.045);
  modelMatrix.translate(caterpillarAngle * 0.04,0,0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							cathStart/floatsPerVertex,	// start at this vertex number, and 
  							cathVerts.length/floatsPerVertex);	// draw this many vertices.
  
  // caterpillar section 1
  modelMatrix.translate(-1,0,0);  
  modelMatrix.rotate(90,0,1,0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							catbStart/floatsPerVertex, // start at this vertex number, and
  							catbVerts.length/floatsPerVertex);	// draw this many vertices.

  for (i=0; i < 9; i++) {
  modelMatrix.translate(0,0,-0.9); 
  modelMatrix.translate(0,currentAngle * -0.03,0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							catbStart/floatsPerVertex, // start at this vertex number, and
  							catbVerts.length/floatsPerVertex);	// draw this many vertices.

  }

// caterpillar middle section 
modelMatrix.translate(0,0,-0.9); 
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices

  for (i=0; i < 5; i++) {
modelMatrix.translate(0,0,-0.9); 
  modelMatrix.translate(0,currentAngle * 0.03,0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices
  }

// caterpillar section 18
modelMatrix.translate(0,0,-0.9); 
modelMatrix.translate(0,currentAngle * 0.03,0); 
modelMatrix.translate(0,0,currentAngle * 0.03);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices

// caterpillar section 19
modelMatrix.translate(0,0,-0.9); 
modelMatrix.translate(0,currentAngle * 0.03,0); 
modelMatrix.translate(0,0,currentAngle * 0.03);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices

// caterpillar section 20
modelMatrix.translate(0,0,-0.9); 
modelMatrix.translate(0,currentAngle * 0.03,0); 
modelMatrix.translate(0,0,currentAngle * 0.03);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices

// caterpillar section 21
modelMatrix.translate(0,0,-0.9); 
modelMatrix.translate(0,0,currentAngle * 0.03); 
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive
  							catbStart/floatsPerVertex, // start at this vertex number
  							catbVerts.length/floatsPerVertex);	// draw this many vertices

// caterpillar rear 
  modelMatrix.translate(0,0,-1); 														
  modelMatrix.scale(1.1, 1.1, 1.1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,				// drawing primitive 
  							cathStart/floatsPerVertex,	// start at this vertex number 
  							cathVerts.length/floatsPerVertex);	// draw this many vertices.
}


// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_last2 = Date.now(); 

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  if(angle >  13.5 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle < -13.5 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animateC(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last2;
  g_last2 = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
   if(angle >  13.5 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  console.log(newAngle); 
  return newAngle %= 360;
}

function spinUp() {
  ANGLE_STEP += 5; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}
 

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	
	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down. 

	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	xMclik = x;													// Make next drag-measurement from here.
	yMclik = y;
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
};


function myKeyDown(ev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).

	switch(ev.keyCode) {			// keycodes !=ASCII, but are very consistent for 
	//	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
		case 13: 
			console.log(' Instructions');
			document.getElementById('Instructions').innerHTML = 
				' Instructions: Try out the arrow keys and buttons'; 
			break; 
		case 37:		// left-arrow key
			moveLeft(); 
			break;
		case 38:		// up-arrow key
			moveUp(); 
			break;
		case 39:		// right-arrow key
			moveRight(); 
  		break;
		case 40:		// down-arrow key
			moveDown(); 
  		break; 
		default:
			
			break;
	}
}

function moveLeft() {
	caterpillarMove -= .01; 
}

function moveRight() {
	caterpillarMove += .01; 
}

function moveUp() {
	if (caterpillarUpDown < .3) {
		caterpillarUpDown += .01;
	}
}

function moveDown () {
	caterpillarUpDown -= .01; 
}

function myKeyUp(ev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well
	console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
}

function myKeyPress(ev) {
	console.log('myKeyPress():keyCode='+ev.keyCode  +', charCode=' +ev.charCode+
												', shift='    +ev.shiftKey + ', ctrl='    +ev.ctrlKey +
												', altKey='   +ev.altKey   +
												', metaKey(Command key or Windows key)='+ev.metaKey);
}