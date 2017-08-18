// Project B: Exploration of 3D Space with robots, animals, and objects
///////////////////////////////////////////////////////////
// Credits to:
// Kouichi Matsude and Rodger Lea
// from "WebGL Programming Guide: Interactive 3D Graphics Programming with WebGL" 
/// and 
// Northwestern Univ Jack Tumblin
// Inspiration from the movie Big Hero 6  
////// .js and .html MODIFIED for EECS 351-1 

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' + 
  'uniform mat4 u_viewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
   // make the length of the normal 1, convert to vec3
   ' vec3 normal = normalize(vec3(a_Normal));\n' + 
  ' vec3 zCoord = vec3(0,0,1);\n' + 
  ' float dotProduct = dot(normal, zCoord);\n' +
  ' float clampedResult = 0.3 + clamp(dotProduct,0.0,10.0) * 0.7;\n' + 
  '  gl_Position = u_ProjMatrix * u_viewMatrix * a_Position;\n' +
  '  v_Color = a_Color * clampedResult ;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
  
var floatsPerVertex = 10;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color + normal vector coordinates 

qNew = new Quaternion(0,0,0,1); // most recent drag rotation
qTot = new Quaternion(0,0,0,1); 
var quatMatrix = new Matrix4(); 

var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var ANGLE_STEP = 8.0;
var ANGLE_STEP2 = 15.0; 
var currentAngle = 0.0; 
var fullAngle = 0.0; 
var fingerAngle = 0.0; 

var canvas; 

function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');
  
    // re-size that canvas to fit the browser-window size:


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

	// Enable 3D depth-test when drawing: don't over-draw at any pixel 
	gl.enable(gl.DEPTH_TEST); 
	
  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBuffers(gl);

  if (n < 0) {
    console.log('Failed to specify the vertex infromation');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.1, 0.1, 0.1, 1.0);

  // Get the storage locations of u_viewMatrix and u_ProjMatrix variables
  var u_viewMatrix = gl.getUniformLocation(gl.program, 'u_viewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_viewMatrix || !u_ProjMatrix) { 
    console.log('Failed to get u_viewMatrix or u_ProjMatrix');
    return;
  }

  // Create the matrices
  var viewMatrix = new Matrix4();
  var projMatrix = new Matrix4();

 winResize(u_viewMatrix, viewMatrix, u_ProjMatrix, projMatrix);   // (HTML file also calls it on browser-resize events)

  // Register the event handlers
 document.onkeydown = function(ev){ keydown(ev, gl, u_viewMatrix, viewMatrix); };
	 canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas) }; 
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };         
  canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

 
  
  // REPLACE this orthographic camera matrix:
/*  projMatrix.setOrtho(-1.0, 1.0, 					// left,right;
  										-1.0, 1.0, 					// bottom, top;
  										0.0, 2000.0);				// near, far; (always >=0)
*/
	// with this perspective-camera matrix:
	// (SEE PerspectiveView.js, Chapter 7 of book)


  

   // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    fullAngle = animate2(fullAngle); 
    fingerAngle = animate3(fingerAngle); 

    draw(gl, u_viewMatrix, viewMatrix,u_ProjMatrix, projMatrix);  

    // report current angle on console
  //  console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);   
                      // Request that the browser re-draw the webpage
  };
  tick();             // start (and continue) animation: draw current image
}

// face line
function makeLine() {
 lineVerts = new Float32Array([
  0.0, 0.0, 0.0, 1.0,     0,0,0,   1,0,0,
  0.5, 0.0, 0.0, 1.0,     0,0,0,   1,0,0
  ]);
}

function makeBaymaxCylinder() {

 var clr = new Float32Array([1, 1, 1]); // white
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = .7;    // radius
 
 // Create a (global) array to hold this cylinder's vertices;
 BcylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      BcylVerts[j  ] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+1] = 0.0; 
      BcylVerts[j+2] = 0.5; 
      BcylVerts[j+3] = 0.5;     // r,g,b = topColr[]
      BcylVerts[j+4]=clr[0]; 
      BcylVerts[j+5]=clr[1]; 
      BcylVerts[j+6]=clr[2];
      BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      BcylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);      // x
      BcylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);      // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      BcylVerts[j+2] = 1.0; // z
      BcylVerts[j+3] = 1.0; // w.
      // r,g,b = color 
      BcylVerts[j+4]=clr[0]; 
      BcylVerts[j+5]=clr[1]; 
      BcylVerts[j+6]=clr[2]; 
      BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        BcylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
        BcylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
        BcylVerts[j+2] = 1.0; // z
        BcylVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
        BcylVerts[j+4]=clr[0]; 
        BcylVerts[j+5]=clr[1]; 
        BcylVerts[j+6]=clr[2];  
        BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0;     
    }
    else    // position all odd# vertices along the bottom cap:
    {
        BcylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        BcylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        BcylVerts[j+2] =-1.0; // z
        BcylVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
      BcylVerts[j+4]=clr[0]; 
      BcylVerts[j+5]=clr[1]; 
      BcylVerts[j+6]=clr[2]; 
      BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      BcylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
      BcylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
      BcylVerts[j+2] =-1.0; // z
      BcylVerts[j+3] = 1.0; // w.
      // r,g,b = clr 
      BcylVerts[j+4]=clr[0]; 
      BcylVerts[j+5]=clr[1]; 
      BcylVerts[j+6]=clr[2]; 
      BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0;     
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      BcylVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      BcylVerts[j+1] = 0.0; 
      BcylVerts[j+2] =-1.0; 
      BcylVerts[j+3] = 1.0;     // r,g,b = botColr[]
      BcylVerts[j+4]=clr[0]; 
      BcylVerts[j+5]=clr[1]; 
      BcylVerts[j+6]=clr[2]; 
      BcylVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+8] = 0.0; 
      BcylVerts[j+9] = 1.0; 
    }
  }
}

function makeBaymaxSphere() {
//==============================================================================
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 50; // # of vertices around the top edge of the slice
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.


      // Create a (global) array to hold this sphere's vertices:
  BsphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        BsphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);   
        BsphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
        BsphVerts[j+2] = cos0;    
        BsphVerts[j+3] = 1.0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        BsphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        BsphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        BsphVerts[j+2] = cos1;                                        // z
        BsphVerts[j+3] = 1.0;                                       // w.   
      }
      //var colr = Math.random();  
          BsphVerts[j+4]=1;// equColr[0]; 
          BsphVerts[j+5]=1;// equColr[1]; 
          BsphVerts[j+6]= 1;// equColr[2];
           BsphVerts[j+7]=0;// equColr[0]; 
          BsphVerts[j+8]=0;// equColr[1]; 
          BsphVerts[j+9]= 1;// equColr[2];
    }
  }
}

function makeEye() {
//==============================================================================
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  //var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray

  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

    var colr = new Float32Array([0, 0, 0]);  
      // Create a (global) array to hold this sphere's vertices:
  eyeVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
  
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        eyeVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        eyeVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        eyeVerts[j+2] = cos0;   
        eyeVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        eyeVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        eyeVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        eyeVerts[j+2] = cos1;                                       // z
        eyeVerts[j+3] = 1.0;                                        // w.   
      }
          eyeVerts[j+4]=colr[0]; 
          eyeVerts[j+5]=colr[1];  
          eyeVerts[j+6]=colr[2];   
          eyeVerts[j+7]=0; 
          eyeVerts[j+8]=0;  
          eyeVerts[j+9]=1;      
    }
  }
}

function makeBaymaxCBody() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([1, 1, 1]); // dark gray
 //var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
 var topColr = new Float32Array([1, 1, 1]); 
 var botColr = new Float32Array([1, 1, 1]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 1;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 baymaxCBodyVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      baymaxCBodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+1] = 0.0;  
      baymaxCBodyVerts[j+2] = 0.5; 
      baymaxCBodyVerts[j+3] = 0.5;      // r,g,b = topColr[]
      baymaxCBodyVerts[j+4]=ctrColr[0]; 
      baymaxCBodyVerts[j+5]=ctrColr[1]; 
      baymaxCBodyVerts[j+6]=ctrColr[2];
       baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      baymaxCBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);     // x
      baymaxCBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      baymaxCBodyVerts[j+2] = 1.0;  // z
      baymaxCBodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      baymaxCBodyVerts[j+4]=topColr[0]; 
      baymaxCBodyVerts[j+5]=topColr[1]; 
      baymaxCBodyVerts[j+6]=topColr[2];
     baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        baymaxCBodyVerts[j  ] = 1 * Math.cos(Math.PI*(v)/capVerts);   // x
        baymaxCBodyVerts[j+1] = 1 * Math.sin(Math.PI*(v)/capVerts);   // y
        baymaxCBodyVerts[j+2] = 1.0;  // z
        baymaxCBodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        baymaxCBodyVerts[j+4]=topColr[0]; 
        baymaxCBodyVerts[j+5]=topColr[1]; 
        baymaxCBodyVerts[j+6]=topColr[2]; 
             baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;    
    }
    else    // position all odd# vertices along the bottom cap:
    {
        baymaxCBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        baymaxCBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        baymaxCBodyVerts[j+2] =-1.0;  // z
        baymaxCBodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        baymaxCBodyVerts[j+4]=botColr[0]; 
        baymaxCBodyVerts[j+5]=botColr[1]; 
        baymaxCBodyVerts[j+6]=botColr[2];     
             baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      baymaxCBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      baymaxCBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      baymaxCBodyVerts[j+2] =-1.0;  // z
      baymaxCBodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      baymaxCBodyVerts[j+4]=botColr[0]; 
      baymaxCBodyVerts[j+5]=botColr[1]; 
      baymaxCBodyVerts[j+6]=botColr[2];   
           baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      baymaxCBodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      baymaxCBodyVerts[j+1] = 0.0;  
      baymaxCBodyVerts[j+2] =-1.0; 
      baymaxCBodyVerts[j+3] = 1.0;      // r,g,b = botColr[]
      baymaxCBodyVerts[j+4]=botColr[0]; 
      baymaxCBodyVerts[j+5]=botColr[1]; 
      baymaxCBodyVerts[j+6]=botColr[2];
           baymaxCBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+8] = 0.0;  
      baymaxCBodyVerts[j+9] = 1.0;
    }
  }
}

function makeRocketTop() {
    var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 50; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)

  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  RtopVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    ////////////////////////////////////////////
    cos1 = Math.cos((s-3)*sliceAngle);
    //cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        RtopVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);   
        RtopVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
        RtopVerts[j+2] = cos0;    
        RtopVerts[j+3] = 1.0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        RtopVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        RtopVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        RtopVerts[j+2] = cos1;                                        // z
        RtopVerts[j+3] = 1.0;                                       // w.   
      }

      var colr = Math.random(); 
          RtopVerts[j+4]= 0.317647;// equColr[0]; 
          RtopVerts[j+5]= 0.317647;// equColr[1]; 
          RtopVerts[j+6]= 0.317647;// equColr[2]; 
             RtopVerts[j+7]= 0;// equColr[0]; 
          RtopVerts[j+8]= 0;// equColr[1]; 
          RtopVerts[j+9]= 1;// equColr[2]; 
    }
  }

}  

function makeRocketBody() {
var ctrColr = new Float32Array([1, 0, 0]);  // dark gray
 var topColr = new Float32Array([0.5, 0, 0]); 
 var botColr = new Float32Array([1, 0, 0]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 1;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 RbodyVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      RbodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      RbodyVerts[j+1] = 0.0;  
      RbodyVerts[j+2] = 0.5; 
      RbodyVerts[j+3] = 0.5;      // r,g,b = topColr[]
      RbodyVerts[j+4]=ctrColr[0]; 
      RbodyVerts[j+5]=ctrColr[1]; 
      RbodyVerts[j+6]=ctrColr[2];
        RbodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      RbodyVerts[j+8] = 0.0;  
      RbodyVerts[j+9] = 1.0; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      RbodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);     // x
      RbodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      RbodyVerts[j+2] = 1.0;  // z
      RbodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      RbodyVerts[j+4]=topColr[0]; 
      RbodyVerts[j+5]=topColr[1]; 
      RbodyVerts[j+6]=topColr[2]; 
      RbodyVerts[j+7] = 0.0;      
      RbodyVerts[j+8] = 0.0;  
      RbodyVerts[j+9] = 1.0;     
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        RbodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
        RbodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
        RbodyVerts[j+2] = 1.0;  // z
        RbodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        RbodyVerts[j+4]=topColr[0]; 
        RbodyVerts[j+5]=topColr[1]; 
        RbodyVerts[j+6]=topColr[2];     
        RbodyVerts[j+7] = 0.0;     
        RbodyVerts[j+8] = 0.0;  
        RbodyVerts[j+9] = 1.0; 
    }
    else    // position all odd# vertices along the bottom cap:
    {
        RbodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        RbodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        RbodyVerts[j+2] =-1.0;  // z
        RbodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        RbodyVerts[j+4]=botColr[0]; 
        RbodyVerts[j+5]=botColr[1]; 
        RbodyVerts[j+6]=botColr[2];  
          RbodyVerts[j+7] = 0.0;     
      RbodyVerts[j+8] = 0.0;  
      RbodyVerts[j+9] = 1.0;    
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      RbodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      RbodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      RbodyVerts[j+2] =-1.0;  // z
      RbodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      RbodyVerts[j+4]=botColr[0]; 
      RbodyVerts[j+5]=botColr[1]; 
      RbodyVerts[j+6]=botColr[2];  
        RbodyVerts[j+7] = 0.0;      
      RbodyVerts[j+8] = 0.0;  
      RbodyVerts[j+9] = 1.0;  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      RbodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      RbodyVerts[j+1] = 0.0;  
      RbodyVerts[j+2] =-1.0; 
      RbodyVerts[j+3] = 1.0;      // r,g,b = botColr[]
      RbodyVerts[j+4]=botColr[0]; 
      RbodyVerts[j+5]=botColr[1]; 
      RbodyVerts[j+6]=botColr[2];
      RbodyVerts[j+7] = 0.0;      
      RbodyVerts[j+8] = 0.0;  
      RbodyVerts[j+9] = 1.0; 
    }
  }
  
}

function makeRocketBottom() {
  var ctrColr = new Float32Array([.3, .3, .3]); // dark gray
 var topColr = new Float32Array([0.3, 0.3, .3]);  
 var botColr = new Float32Array([0.4, 0.4, 0.4]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 3.5;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 rocketBottomVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      rocketBottomVerts[j  ] = 0.0;       // x,y,z,w == 0,0,1,1
      rocketBottomVerts[j+1] = 0.0; 
      rocketBottomVerts[j+2] = 0.5; 
      rocketBottomVerts[j+3] = 0.5;     // r,g,b = topColr[]
      rocketBottomVerts[j+4]=ctrColr[0]; 
      rocketBottomVerts[j+5]=ctrColr[1]; 
      rocketBottomVerts[j+6]=ctrColr[2];
       rocketBottomVerts[j+7] = 0.0;     
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      rocketBottomVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);      // x
      rocketBottomVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);      // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      rocketBottomVerts[j+2] = 1.0; // z
      rocketBottomVerts[j+3] = 1.0; // w.
      // r,g,b = topColr[]
      rocketBottomVerts[j+4]=topColr[0]; 
      rocketBottomVerts[j+5]=topColr[1]; 
      rocketBottomVerts[j+6]=topColr[2]; 
        rocketBottomVerts[j+7] = 0.0;      
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        rocketBottomVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
        rocketBottomVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
        rocketBottomVerts[j+2] = 1.0; // z
        rocketBottomVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
        rocketBottomVerts[j+4]=topColr[0]; 
        rocketBottomVerts[j+5]=topColr[1]; 
        rocketBottomVerts[j+6]=topColr[2];
          rocketBottomVerts[j+7] = 0.0;       
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0;       
    }
    else    // position all odd# vertices along the bottom cap:
    {
        rocketBottomVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        rocketBottomVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        rocketBottomVerts[j+2] =-1.0; // z
        rocketBottomVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
        rocketBottomVerts[j+4]=botColr[0]; 
        rocketBottomVerts[j+5]=botColr[1]; 
        rocketBottomVerts[j+6]=botColr[2];   
          rocketBottomVerts[j+7] = 0.0;      
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0;    
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      rocketBottomVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
      rocketBottomVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
      rocketBottomVerts[j+2] =-1.0; // z
      rocketBottomVerts[j+3] = 1.0; // w.
      // r,g,b = topColr[]
      rocketBottomVerts[j+4]=botColr[0]; 
      rocketBottomVerts[j+5]=botColr[1]; 
      rocketBottomVerts[j+6]=botColr[2];   
        rocketBottomVerts[j+7] = 0.0;       
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0;  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      rocketBottomVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      rocketBottomVerts[j+1] = 0.0; 
      rocketBottomVerts[j+2] =-1.0; 
      rocketBottomVerts[j+3] = 1.0;     // r,g,b = botColr[]
      rocketBottomVerts[j+4]=botColr[0]; 
      rocketBottomVerts[j+5]=botColr[1]; 
      rocketBottomVerts[j+6]=botColr[2];
        rocketBottomVerts[j+7] = 0.0;      
      rocketBottomVerts[j+8] = 0.0; 
      rocketBottomVerts[j+9] = 1.0; 
    }
  }
}

function makeRocketBoosterBottom() {
  var ctrColr = new Float32Array([1, 0.843, 0.0]);  // dark gray
 var topColr = new Float32Array([1, 0.843, 0.0]); // light green
 var botColr = new Float32Array([0.8549, 0.647, 0.125]);  // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 RboosterBotVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      RboosterBotVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+1] = 0.0;  
      RboosterBotVerts[j+2] = 1.0; 
      RboosterBotVerts[j+3] = 1.0;      // r,g,b = topColr[]
      RboosterBotVerts[j+4]=ctrColr[0]; 
      RboosterBotVerts[j+5]=ctrColr[1]; 
      RboosterBotVerts[j+6]=ctrColr[2];
       RboosterBotVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      RboosterBotVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      RboosterBotVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      RboosterBotVerts[j+2] = 1.0;  // z
      RboosterBotVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      RboosterBotVerts[j+4]=topColr[0]; 
      RboosterBotVerts[j+5]=topColr[1]; 
      RboosterBotVerts[j+6]=topColr[2]; 
       RboosterBotVerts[j+7] = 0.0;      
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0;     
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        RboosterBotVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        RboosterBotVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        RboosterBotVerts[j+2] = 1.0;  // z
        RboosterBotVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        RboosterBotVerts[j+4]=topColr[0]; 
        RboosterBotVerts[j+5]=topColr[1]; 
        RboosterBotVerts[j+6]=topColr[2];   
         RboosterBotVerts[j+7] = 0.0;      
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0;   
    }
    else    // position all odd# vertices along the bottom cap:
    {
        RboosterBotVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        RboosterBotVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        RboosterBotVerts[j+2] =-1.0;  // z
        RboosterBotVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        RboosterBotVerts[j+4]=botColr[0]; 
        RboosterBotVerts[j+5]=botColr[1]; 
        RboosterBotVerts[j+6]=botColr[2];
         RboosterBotVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      RboosterBotVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      RboosterBotVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      RboosterBotVerts[j+2] =-1.0;  // z
      RboosterBotVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      RboosterBotVerts[j+4]=botColr[0]; 
      RboosterBotVerts[j+5]=botColr[1]; 
      RboosterBotVerts[j+6]=botColr[2];
       RboosterBotVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0;    
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      RboosterBotVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      RboosterBotVerts[j+1] = 0.0;  
      RboosterBotVerts[j+2] =-1.0; 
      RboosterBotVerts[j+3] = 1.0;      // r,g,b = botColr[]
      RboosterBotVerts[j+4]=botColr[0]; 
      RboosterBotVerts[j+5]=botColr[1]; 
      RboosterBotVerts[j+6]=botColr[2];
       RboosterBotVerts[j+7] = 0.0;      
      RboosterBotVerts[j+8] = 0.0;  
      RboosterBotVerts[j+9] = 1.0; 
    }
  }
}

function makeRocketBoosterTop() {
//==============================================================================

  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 50; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.


      // Create a (global) array to hold this sphere's vertices:
  RboosterTopVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
  
 
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        RboosterTopVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        RboosterTopVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        RboosterTopVerts[j+2] = cos0;   
        RboosterTopVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        RboosterTopVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        RboosterTopVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        RboosterTopVerts[j+2] = cos1;                                       // z
        RboosterTopVerts[j+3] = 1.0;                                        // w.   
      }
      var colr = Math.random();  
          RboosterTopVerts[j+4]=1;
          RboosterTopVerts[j+5]=.843;
          RboosterTopVerts[j+6]= 0;
           RboosterTopVerts[j+7]=0;
          RboosterTopVerts[j+8]=0; 
          RboosterTopVerts[j+9]= 1;
      
    }
  }
}

function makeBirdSphere() {
//==============================================================================

  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 50; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  //var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray

  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.


      // Create a (global) array to hold this sphere's vertices:
  BirdsphereVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);

  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        BirdsphereVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);   
        BirdsphereVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
        BirdsphereVerts[j+2] = cos0;    
        BirdsphereVerts[j+3] = 1.0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        BirdsphereVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        BirdsphereVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        BirdsphereVerts[j+2] = cos1;                                        // z
        BirdsphereVerts[j+3] = 1.0;                                       // w.   
      }
      var colr = Math.random();  
          BirdsphereVerts[j+4]=colr;
          BirdsphereVerts[j+5]=colr;
          BirdsphereVerts[j+6]= colr;
        BirdsphereVerts[j+7]=0; 
          BirdsphereVerts[j+8]=0;
          BirdsphereVerts[j+9]=1;
    }
  }
}

function makeBeak() {
//==============================================================================
 var ctrColr = new Float32Array([0.839, 0.839, 0.839]); // dark gray
 //var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
 var topColr = new Float32Array([0.854, 0.64, 0.125]);  
 var botColr = new Float32Array([0.839, 0.839, 0.839]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 0.01;    // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 beakVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      beakVerts[j  ] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+1] = 0.0; 
      beakVerts[j+2] = 1.0; 
      beakVerts[j+3] = 1.5;     // r,g,b = topColr[]
      beakVerts[j+4]=ctrColr[0]; 
      beakVerts[j+5]=ctrColr[1]; 
      beakVerts[j+6]=ctrColr[2];
      beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0; 
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      beakVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);      // x
      beakVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);      // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      beakVerts[j+2] = 1.0; // z
      beakVerts[j+3] = 1.0; // w.
      // r,g,b = topColr[]
      beakVerts[j+4]=topColr[0]; 
      beakVerts[j+5]=topColr[1]; 
      beakVerts[j+6]=topColr[2]; 
          beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        beakVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);    // x
        beakVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);    // y
        beakVerts[j+2] = 1.0; // z
        beakVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
        beakVerts[j+4]=topColr[0]; 
        beakVerts[j+5]=topColr[1]; 
        beakVerts[j+6]=topColr[2]; 
            beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0;      
    }
    else    // position all odd# vertices along the bottom cap:
    {
        beakVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        beakVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        beakVerts[j+2] =-1.0; // z
        beakVerts[j+3] = 1.0; // w.
        // r,g,b = topColr[]
        beakVerts[j+4]=botColr[0]; 
        beakVerts[j+5]=botColr[1]; 
        beakVerts[j+6]=botColr[2]; 
            beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0;      
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      beakVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
      beakVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
      beakVerts[j+2] =-1.0; // z
      beakVerts[j+3] = 1.0; // w.
      // r,g,b = topColr[]
      beakVerts[j+4]=botColr[0]; 
      beakVerts[j+5]=botColr[1]; 
      beakVerts[j+6]=botColr[2]; 
          beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0;    
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      beakVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      beakVerts[j+1] = 0.0; 
      beakVerts[j+2] =-1.0; 
      beakVerts[j+3] = 1.0;     // r,g,b = botColr[]
      beakVerts[j+4]=botColr[0]; 
      beakVerts[j+5]=botColr[1]; 
      beakVerts[j+6]=botColr[2];
          beakVerts[j+7] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+8] = 0.0; 
      beakVerts[j+9] = 1.0; 
    }
  }
}

function makeTail() {
//==============================================================================
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 50; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)

  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  tailVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    ////////////////////////////////////////////
    cos1 = Math.cos((s-3)*sliceAngle);
    //cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        tailVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);   
        tailVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
        tailVerts[j+2] = cos0;    
        tailVerts[j+3] = 1.0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        tailVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        tailVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        tailVerts[j+2] = cos1;                                        // z
        tailVerts[j+3] = 1.0;                                       // w.   
      }

      var colr = Math.random(); 
          tailVerts[j+4]=colr;// equColr[0]; 
          tailVerts[j+5]=colr;// equColr[1]; 
          tailVerts[j+6]=colr;// equColr[2];  
       tailVerts[j+7]=0;// equColr[0]; 
          tailVerts[j+8]=0;// equColr[1]; 
          tailVerts[j+9]=1;// equColr[2];  
    }
  }
}

function makeLeg() {
//==============================================================================

 var ctrColr = new Float32Array([.3, .2, 0]); // dark gray
 //var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
 var topColr = new Float32Array([0.3, 0.2, 0]); 
 var botColr = new Float32Array([0.184, 0.184, 0.184]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = 0.14;    // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 legVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      legVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      legVerts[j+1] = 0.0;  
      legVerts[j+2] = 0.5; 
      legVerts[j+3] = 0.5;      // r,g,b = topColr[]
      legVerts[j+4]=ctrColr[0]; 
      legVerts[j+5]=ctrColr[1]; 
      legVerts[j+6]=ctrColr[2];
      legVerts[j+7] = 0.0;     
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0;
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      legVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);     // x
      legVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      legVerts[j+2] = 1.0;  // z
      legVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      legVerts[j+4]=topColr[0]; 
      legVerts[j+5]=topColr[1]; 
      legVerts[j+6]=topColr[2]; 
        legVerts[j+7] = 0.0;   
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0;    
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        legVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
        legVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
        legVerts[j+2] = 1.0;  // z
        legVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        legVerts[j+4]=topColr[0]; 
        legVerts[j+5]=topColr[1]; 
        legVerts[j+6]=topColr[2];   
          legVerts[j+7] = 0.0;     
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0;  
    }
    else    // position all odd# vertices along the bottom cap:
    {
        legVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        legVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        legVerts[j+2] =-1.0;  // z
        legVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        legVerts[j+4]=botColr[0]; 
        legVerts[j+5]=botColr[1]; 
        legVerts[j+6]=botColr[2];    
          legVerts[j+7] = 0.0;     
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0; 
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      legVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      legVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      legVerts[j+2] =-1.0;  // z
      legVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      legVerts[j+4]=botColr[0]; 
      legVerts[j+5]=botColr[1]; 
      legVerts[j+6]=botColr[2];   
        legVerts[j+7] = 0.0;    
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0;
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      legVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      legVerts[j+1] = 0.0;  
      legVerts[j+2] =-1.0; 
      legVerts[j+3] = 1.0;      // r,g,b = botColr[]
      legVerts[j+4]=botColr[0]; 
      legVerts[j+5]=botColr[1]; 
      legVerts[j+6]=botColr[2];
        legVerts[j+7] = 0.0;      
      legVerts[j+8] = 0.0;  
      legVerts[j+9] = 1.0;
    }
  }
}

function makeSnailShell() {
//==============================================================================

var rbend = 1.0;                    // Radius of circle formed by torus' bent bar
var rbar = 0.5;                     // radius of the bar we bent to form torus
var barSlices = 23;                 // # of bar-segments in the torus: >=3 req'd;
                                    // more segments for more-circular torus
var barSides = 13;                    // # of sides of the bar (and thus the 
                                    // number of vertices in its cross-section)
                                    // >=3 req'd;
                                    // more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//      --choose odd or prime#  for barSides, and
//      --choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

  // Create a (global) array to hold this torus's vertices:
 shellVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//  Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;                   // begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;  // theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;   // half-phi angle between each side of bar
                                      // (WHY HALF? 2 vertices per step in phi)
  // s counts slices of the bar; v counts vertices within one slice; j counts
  // array elements (Float32) (vertices*#attribs/vertex) put in shellVerts array.
  for(s=0,j=0; s<barSlices; s++) {    // for each 'slice' or 'ring' of the torus:
    for(v=0; v< 2*barSides; v++, j+=10) {    // for each vertex in this slice:
      if(v%2==0)  { // even #'d vertices at bottom of slice,
        shellVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
                                             Math.cos((s)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        shellVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
                                             Math.sin((s)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        shellVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        shellVerts[j+3] = 1.0;    // w
      }
      else {        // odd #'d vertices at top of slice (s+1);
                    // at same phi used at bottom of slice (v-1)
        shellVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
                                             Math.cos((s+1)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        shellVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
                                             Math.sin((s+1)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        shellVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        shellVerts[j+3] = 1.0;    // w
      }
      shellVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      shellVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      shellVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
       shellVerts[j+7] = 0;    // random color 0.0 <= R < 1.0
      shellVerts[j+8] = 0;    // random color 0.0 <= G < 1.0
      shellVerts[j+9] = 1;    // random color 0.0 <= B < 1.0
    }
  }
  // Repeat the 1st 2 vertices of the triangle strip to complete the torus:
      shellVerts[j  ] = rbend + rbar; // copy vertex zero;
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
      shellVerts[j+1] = 0.0;
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
      shellVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      shellVerts[j+3] = 1.0;    // w
      shellVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      shellVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      shellVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      shellVerts[j+7] = 0;    // random color 0.0 <= R < 1.0
      shellVerts[j+8] = 0;    // random color 0.0 <= G < 1.0
      shellVerts[j+9] = 1;    // random color 0.0 <= B < 1.0
      j+=10; // go to next vertex:
      shellVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
      shellVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
      shellVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      shellVerts[j+3] = 1.0;    // w
      shellVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      shellVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      shellVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      shellVerts[j+7] = 0;    // random color 0.0 <= R < 1.0
      shellVerts[j+8] = 0;    // random color 0.0 <= G < 1.0
      shellVerts[j+9] = 1;    // random color 0.0 <= B < 1.0
}

function makeSnailBody() {
//==============================================================================
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
 var topColr = new Float32Array([0.82, 0.705, 0.54]); // light green
 var botColr = new Float32Array([0.85, 0.52, .247]);  // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.4;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 snailBodyVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      snailBodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+1] = 0.0;  
      snailBodyVerts[j+2] = 1.0; 
      snailBodyVerts[j+3] = 1.0;      // r,g,b = topColr[]
      snailBodyVerts[j+4]=ctrColr[0]; 
      snailBodyVerts[j+5]=ctrColr[1]; 
      snailBodyVerts[j+6]=ctrColr[2];
      snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0;
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      snailBodyVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      snailBodyVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      snailBodyVerts[j+2] = 1.0;  // z
      snailBodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      snailBodyVerts[j+4]=topColr[0]; 
      snailBodyVerts[j+5]=topColr[1]; 
      snailBodyVerts[j+6]=topColr[2];
       snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0;     
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        snailBodyVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        snailBodyVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        snailBodyVerts[j+2] = 1.0;  // z
        snailBodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        snailBodyVerts[j+4]=topColr[0]; 
        snailBodyVerts[j+5]=topColr[1]; 
        snailBodyVerts[j+6]=topColr[2]; 
         snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0;    
    }
    else    // position all odd# vertices along the bottom cap:
    {
        snailBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        snailBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        snailBodyVerts[j+2] =-1.0;  // z
        snailBodyVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        snailBodyVerts[j+4]=botColr[0]; 
        snailBodyVerts[j+5]=botColr[1]; 
        snailBodyVerts[j+6]=botColr[2]; 
         snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0;    
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      snailBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      snailBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      snailBodyVerts[j+2] =-1.0;  // z
      snailBodyVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      snailBodyVerts[j+4]=botColr[0]; 
      snailBodyVerts[j+5]=botColr[1]; 
      snailBodyVerts[j+6]=botColr[2];  
       snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0; 
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      snailBodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      snailBodyVerts[j+1] = 0.0;  
      snailBodyVerts[j+2] =-1.0; 
      snailBodyVerts[j+3] = 1.0;      // r,g,b = botColr[]
      snailBodyVerts[j+4]=botColr[0]; 
      snailBodyVerts[j+5]=botColr[1]; 
      snailBodyVerts[j+6]=botColr[2];
       snailBodyVerts[j+7] = 0.0;      // x,y,z,w == 0,0,1,1
      snailBodyVerts[j+8] = 0.0;  
      snailBodyVerts[j+9] = 1.0;
    }
  }
}  

function makeSnailHead() {
//==============================================================================
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.8, 0.52, 0.247]); // North Pole: light gray
  var equColr = new Float32Array([0.9568, 0.643, 0.3764]);  // Equator:    bright green
  var botColr = new Float32Array([0.9568, 0.643, 0.3764]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  snailHeadVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        snailHeadVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        snailHeadVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        snailHeadVerts[j+2] = cos0;   
        snailHeadVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        snailHeadVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        snailHeadVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        snailHeadVerts[j+2] = cos1;                                       // z
        snailHeadVerts[j+3] = 1.0;                                        // w.   
      }
      if(s==0) {  // finally, set some interesting colors for vertices:
        snailHeadVerts[j+4]=topColr[0]; 
        snailHeadVerts[j+5]=topColr[1]; 
        snailHeadVerts[j+6]=topColr[2]; 
        }
      else if(s==slices-1) {
        snailHeadVerts[j+4]=botColr[0]; 
        snailHeadVerts[j+5]=botColr[1]; 
        snailHeadVerts[j+6]=botColr[2]; 
      }
      else {
        var color = Math.random();
        if (color > 0.5) {
          // light green 
          snailHeadVerts[j+4]=topColr[0]; ;// equColr[0]; // red
          snailHeadVerts[j+5]=topColr[1]; ;// equColr[1];  //g
          snailHeadVerts[j+6]=topColr[2]; ;// equColr[2];   //b 
        } 
        else{
          // light blue
          snailHeadVerts[j+4]=topColr[0]; ;// equColr[0]; // red
          snailHeadVerts[j+5]=topColr[1]; ;// equColr[1];  //g
          snailHeadVerts[j+6]=topColr[2]; ;// equColr[2];   //b 
        }
          snailHeadVerts[j+7]=0; 
        snailHeadVerts[j+8]=0; 
        snailHeadVerts[j+9]=1;
      }
    }
  }
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

  var xcount = 100;     // # of lines to draw in x,y to make the grid.
  var ycount = 100;   
  var xymax = 50.0;     // grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([1.0, 1.0, 0.3]);  // bright yellow
  var yColr = new Float32Array([0.5, 1.0, 0.5]);  // bright green.
  
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    gndVerts[j+4] = xColr[0];     // red
    gndVerts[j+5] = xColr[1];     // grn
    gndVerts[j+6] = xColr[2];     // blu
        gndVerts[j+7] = 0;     // red
    gndVerts[j+8] = 0;     // grn
    gndVerts[j+9] = 1;     // blu
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    gndVerts[j+4] = yColr[0];     // red
    gndVerts[j+5] = yColr[1];     // grn
    gndVerts[j+6] = yColr[2];     // blu
     gndVerts[j+7] = 0;     // red
    gndVerts[j+8] = 0;     // grn
    gndVerts[j+9] = 1;     // blu
  }
}

function  makeAxis() {
   axisVerts = new Float32Array([
  0.0, 0.0, 0.0, 1.0,     1,0,0,      0,0,1,  // x axis red
  2, 0.0, 0.0, 1.0,     1,0,0,        0,0,1,
  0.0,0.0,0.0,1.0,      0,1,0,        0,0,1,      // y axix green
  0.0,0.0,2,1.0,        0,1,0,        0,0,1,
  0.0,0.0,0.0,1.0,      0,0,1,        0,0,1,  // z axis blue
  0.0,1.0,0.0,1.0,      0,0,1,        0,0,1
  ]);
}

function  makeSphere(array,red,green,blue) {

  //==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeBaymaxCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  //var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray

  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

   
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        array[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        array[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        array[j+2] = cos0;   
        array[j+3] = 1.0;  
        array[j+4]=red; 
          array[j+5]=green;  
          array[j+6]=blue; 
           array[j+7] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        array[j+8] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        array[j+9] = cos0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        array[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        array[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        array[j+2] = cos1;                                       // z
        array[j+3] = 1.0;
        array[j+4]=red; 
          array[j+5]=green;  
          array[j+6]=blue;                                         // w.   
            array[j+7] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        array[j+8] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        array[j+9] = cos1;                                       // z
      }        
      
    }
  }
  
}

function initVertexBuffers(gl) {
//============================================================================== 

 makeLine();             // create, fill the lineVerts array 
  makeEye();             // create, fill eyeVerts array 
  makeBaymaxCylinder();   // create, fill the BcylVerts array
  makeBaymaxSphere();     // create, fill the BsphVerts array
  makeBaymaxCBody();      // create, fill the baymaxCBodyVerts array
  ///////////////////////////////////////////////////////
  makeRocketTop();  // create, fill the catbVerts array
  makeRocketBody();    // create, fill cathVerts array 
  makeRocketBottom(); 
  makeRocketBoosterBottom(); 
  makeRocketBoosterTop(); 
  ////////////////////////////////////////////////////
   makeBirdSphere(); 
  makeBeak(); 
  makeTail(); 
 makeLeg(); 
 ////////////////////////////////////////////////////
  makeSnailHead(); 
  makeSnailBody(); 
  makeSnailShell(); 
  ///////////////////////////////////////////////////////
  redVerts = new Float32Array(  ((13 * 2* 27) -2) * floatsPerVertex);
  greenVerts = new Float32Array(  ((13 * 2* 27) -2) * floatsPerVertex);
  blueVerts = new Float32Array(  ((13 * 2* 27) -2) * floatsPerVertex);
  makeSphere(redVerts,1,0,0);
  makeSphere(greenVerts,0,1,0); 
  makeSphere(blueVerts,0,0,1); 
  //////////////////////////////////////////////////////
 makeGroundGrid();
 makeAxis(); 

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	 var mySiz = (lineVerts.length + eyeVerts.length + BcylVerts.length + BsphVerts.length + baymaxCBodyVerts.length +
                RtopVerts.length + RbodyVerts.length
                + rocketBottomVerts.length + RboosterBotVerts.length + RboosterTopVerts.length
                + BirdsphereVerts.length + beakVerts.length + tailVerts.length + legVerts.length 
                + snailHeadVerts.length + snailBodyVerts.length + shellVerts.length 
                + gndVerts.length + axisVerts.length + redVerts.length + greenVerts.length + blueVerts.length 
          );    

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
lineStart = 0; 
  for(i=0,j=0; j< lineVerts.length; i++,j++) {
    colorShapes[i] = lineVerts[j];
  }
  eyeStart = i;
  for(j=0; j< eyeVerts.length; i++,j++) {
    colorShapes[i] = eyeVerts[j];
    }
  BcylStart = i;          
  for(j=0; j< BcylVerts.length; i++,j++) {
    colorShapes[i] = BcylVerts[j];
    }
  BsphStart = i;           
  for(j=0; j< BsphVerts.length; i++, j++) {
    colorShapes[i] = BsphVerts[j];
    }
    baymaxCBodyStart = i;          
  for(j=0; j< baymaxCBodyVerts.length; i++, j++) {
    colorShapes[i] = baymaxCBodyVerts[j];
    }
    RtopStart = i;            
  for(j=0; j< RtopVerts.length; i++, j++) {
    colorShapes[i] = RtopVerts[j];
    }
    RbodyStart = i;           // next we'll store the ground-plane;
  for(j=0; j< RbodyVerts.length; i++, j++) {
    colorShapes[i] = RbodyVerts[j];
    }
      RboosterBotStart = i;
  for (j=0; j < RboosterBotVerts.length; i++, j++) {
    colorShapes[i] = RboosterBotVerts[j];
  }
    RbottomStart = i;
  for (j=0; j < rocketBottomVerts.length; i++, j++) {
    colorShapes[i] = rocketBottomVerts[j];
  }
    RboosterTopStart = i;
  for (j=0; j < RboosterTopVerts.length; i++, j++) {
    colorShapes[i] = RboosterTopVerts[j];
  }
  BirdsphStart = i;        
  for(j=0; j< BirdsphereVerts.length; i++, j++) {
    colorShapes[i] = BirdsphereVerts[j];
    }
  beakStart = i; 
  for(j=0; j< beakVerts.length; i++,j++) {
    colorShapes[i] = beakVerts[j];
  }
  tailStart = i;              
  for(j=0; j< tailVerts.length; i++,j++) {
    colorShapes[i] = tailVerts[j];
    }
    legStart = i;        
  for(j=0; j< legVerts.length; i++, j++) {
    colorShapes[i] = legVerts[j];
    }
  shellStart = i;        
  for(j=0; j< shellVerts.length; i++, j++) {
    colorShapes[i] = shellVerts[j];
    }
  snailBodyStart = i;           
  for(j=0; j< snailBodyVerts.length; i++, j++) {
    colorShapes[i] = snailBodyVerts[j];
    }
    snailHeadStart = i;          
  for(j=0; j< snailHeadVerts.length; i++, j++) {
    colorShapes[i] = snailHeadVerts[j];
    }
    gndStart = i;         
  for(j=0; j< gndVerts.length; i++, j++) {
    colorShapes[i] = gndVerts[j];
    }
    axisStart = i;
    for(j=0; j< axisVerts.length; i++, j++) {
      colorShapes[i] = axisVerts[j]; 
    }
     redStart = i;
    for(j=0; j< redVerts.length; i++, j++) {
      colorShapes[i] = redVerts[j]; 
    }
     greenStart = i;
    for(j=0; j< greenVerts.length; i++, j++) {
      colorShapes[i] = greenVerts[j]; 
    }
     blueStart = i;
    for(j=0; j< blueVerts.length; i++, j++) {
      colorShapes[i] = blueVerts[j]; 
    }

  
  // Create a buffer object
  var vertexColorbuffer = gl.createBuffer();  
  if (!vertexColorbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write vertex information to buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT;
  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * floatsPerVertex, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 4);
  gl.enableVertexAttribArray(a_Color);

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 7);
  gl.enableVertexAttribArray(a_Normal);

  // Unbind buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null); 

  return nn;	// return # of vertices
}


var near=1.0, far=15.0; 

var lookatY=0.01, lookatX=0.01, lookatZ=0.01; 
var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 5.2; 

var movingvec = new Float32Array(3); 
movingvec[0] = 0;
movingvec[1] = 0;
movingvec[2] = 0;

var sidevec = new Float32Array(3); 
sidevec[0] = 0;
sidevec[1] = 0;
sidevec[2] = 0;

var up = new Float32Array(3); 
up[0] = 0;
up[1] = 1;
up[2] = 0; 

function keydown(ev, gl, u_viewMatrix, viewMatrix) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:
movingvec[0] = (g_EyeX - lookatX)/6;
movingvec[1] =  (g_EyeY - lookatY)/6;
movingvec[2] = (g_EyeZ - lookatZ)/6;

// cross product 
sidevec[0] = movingvec[1] * up[2] - movingvec[2] * up[1]; 
sidevec[1] = movingvec[2] * up[0] - movingvec[0] * up[2]; 
sidevec[2] = movingvec[0] * up[1] - movingvec[1] * up[0]; 

    switch(ev.keyCode) {
      case 13:
        document.getElementById('Instructions').innerHTML = 
          'Instructions: The arrow keys and 7 and 1 from the keypad change the eyepoint; the keypad numbers 8,4,1,6,9, and 3 change the look-at point; w, a, s, and z allow diagonal camera movement, and the view (near and far) can be changed by p, l, o, and k.';
        break;
      case 37:  // left
        g_EyeX -= 0.1;  
        break;
      case 39: // right
        g_EyeX += 0.1;  
        break;
      case 38:  /// up
        g_EyeY += 0.1;
        break;
      case 40: // down
        g_EyeY -= 0.1;
        break; 
      case 103: // 7
        g_EyeZ -= 0.1;
        break;
      case 97: // 1
        g_EyeZ += 0.1; 
        break; 
      case 104: // 8 up 
        lookatY += 0.1;
        break;
      case 98: // 2 down
        lookatY -= 0.1;
        break;
      case 100: // 4 left
        lookatX -= 0.1;
        break;
      case 102: // 6 right
        lookatX += 0.1; 
        break; 
      case 105: // 9 
        lookatZ += 0.1;
        break;
      case 99: // 3
        lookatZ -= 0.1;
        break
      case 80: // p
        near += .1;
        break;
      case 76: // l
          near -= .1;
        break;
      case 79: // o
        far += .1;
        break;
      case 75: // k
          far -= .1;
        break; 
        case 65: // a: left 
          lookatX += sidevec[0]; 
          lookatY += sidevec[1];
          lookatZ += sidevec[2]; 

          g_EyeX += sidevec[0];
          g_EyeY += sidevec[1];
          g_EyeZ += sidevec[2];
          break;
        case 90: // z: backward diagonally
          lookatX += movingvec[0];
          lookatY += movingvec[1];
          lookatZ += movingvec[2]; 

          g_EyeX += movingvec[0];
          g_EyeY += movingvec[1];
          g_EyeZ += movingvec[2]; 
          break;
        case 87: // w: forward diagonally
          lookatX -= movingvec[0]; 
          lookatY -= movingvec[1];
          lookatZ -= movingvec[2]; 

          g_EyeX -= movingvec[0];
          g_EyeY -= movingvec[1];
          g_EyeZ -= movingvec[2];
          break;
        case 83: // s: right
          lookatX -= sidevec[0]; 
          lookatY -= sidevec[1];
          lookatZ -= sidevec[2]; 

          g_EyeX -= sidevec[0];
          g_EyeY -= sidevec[1];
          g_EyeZ -= sidevec[2];
          break; 
      default:
        break;
    }   
}

function draw(gl, u_viewMatrix, viewMatrix, u_ProjMatrix, projMatrix) {
//==============================================================================
  
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Using OpenGL/ WebGL 'viewports':
  // these determine the mapping of CVV to the 'drawing context',
	
  // Draw in the FIRST of several 'viewports'  --- right -- orthographic

    gl.viewport(canvas.width/2,                              // Viewport lower-left corner
              canvas.height/4,                             // (x,y) location(in pixels)
              canvas.width/2,        // viewport width, height.
               canvas.height/2); 

projMatrix.setOrtho(-2.5,2.5,-2.5,2.5,near,far); 
gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);



 viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ,  // eye position
                        lookatX, lookatY, lookatZ,                 // look-at point
                        0, 1, 0);               // up vector (+y)

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

	// Draw the scene:
	drawMyScene(gl, u_viewMatrix, viewMatrix);

        // Draw in the'viewports'   perspective
  //------------------------------------------
  var vpAspect = (gl.drawingBufferWidth) / (gl.drawingBufferHeight); 

//projMatrix.setPerspective(40, canvas.width/canvas.height, near, far);
projMatrix.setPerspective(40, vpAspect, near, far);  
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

	gl.viewport(0										, 				// Viewport lower-left corner
							canvas.height/4, 		// location(in pixels)
  						canvas.width/2, 				// viewport width, height.
  						canvas.height/2);

	// but use a different 'view' matrix:
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position,
  											lookatX,lookatY , lookatZ, 								// look-at point,
  											0, 1, 0);								// 'up' vector.

  // Pass the view projection matrix to our shaders:
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  
	// Draw the scene:
	drawMyScene(gl, u_viewMatrix, viewMatrix);
}

function drawMyScene(gl, u_viewMatrix, viewMatrix) {
//===============================================================================
// Called ONLY from within the 'draw()' function
// Assumes already-correctly-set View matrix and Proj matrix; 
// draws all items in 'world' coords.

	// DON'T clear <canvas> or you'll WIPE OUT what you drew 
	// in all previous viewports!
	// myGL.clear(gl.COLOR_BUFFER_BIT);  						
  
  for (i = 0; i < 8; i++) {
    pushMatrix(viewMatrix); 
  }

   // Rotate to make a new set of 'world' drawing axes: 
 // old one had "+y points upwards", but
  viewMatrix.rotate(-90.0, 1,0,0); // new one has "+z points upwards",
                                      // made by rotating -90 deg on +x-axis.
  viewMatrix.translate(0.0, 0.0, -1.2);  
  viewMatrix.scale(0.5, 0.5,0.5);    // shrink the drawing axes 
  // Pass the modified view matrix to our shaders:
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                gndStart/floatsPerVertex, // start at this vertex number, and
                gndVerts.length/floatsPerVertex);   // draw this many vertices

  viewMatrix = popMatrix(); 
///////////////////Draw 3D axis 
  viewMatrix.translate(-1.8,-1,-1);
  viewMatrix.scale(1.3,1.3,1.3); 
   gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);   // draw this many vertices

  viewMatrix = popMatrix(); 
  
  //-------Draw cylindrical part of Baymax 
  viewMatrix.translate(0.4,-.25, -0.2);  


  quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w); // Quaternion-->Matrix
  viewMatrix.concat(quatMatrix); // apply that matrix.
 
  viewMatrix.scale(0.37, 0.37, 0.37);
  viewMatrix.rotate(-90,1,0,0); 
  viewMatrix.rotate(180,0,0,1);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.
  pushMatrix(viewMatrix);

// top cylinder arm left  
  viewMatrix.translate(-0.94,0,0.8);  
 viewMatrix.scale(.6,.6,.6);
 viewMatrix.rotate(222,0,1,0); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// elbow joint 
viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 viewMatrix.rotate(currentAngle,1,0,0);
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

pushMatrix(viewMatrix); 

// axis at moving elbow 

  viewMatrix.scale(1.5,1.5,1.5); 
   gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);   // draw this many vertices


viewMatrix = popMatrix(); 
  // rest of arm
  viewMatrix.translate(0,0.8,1.3);
  viewMatrix.scale(1.4,1.4,1.4);
  viewMatrix.rotate(-30,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// hand
viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
pushMatrix(viewMatrix);
pushMatrix(viewMatrix);

// axis at moving joint 

  viewMatrix.scale(1.5,1.5,1.5); 
   gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);   // draw this many vertices
  viewMatrix = popMatrix(); 
  // Draw finger 
   for (x=0; x < 3; x++)
   {

      viewMatrix.translate(.4 - x*.44,-.3,1);
    viewMatrix.scale(0.4,0.4,0.4);
   
      viewMatrix.rotate(fingerAngle * .5,-1,0,0);
    gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BcylStart/floatsPerVertex, // start at this vertex number, and
                  BcylVerts.length/floatsPerVertex);  // draw this many vertices.
     
    // finger tip 
    viewMatrix.translate( 0, 0, 1); 
    viewMatrix.scale(0.7,0.7,0.7);
   gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BsphStart/floatsPerVertex,  // start at this vertex number, and 
                  BsphVerts.length/floatsPerVertex);  // draw this many vertices.
    viewMatrix = popMatrix(); 
   pushMatrix(viewMatrix); 
   }
 
viewMatrix = popMatrix(); 
// thumb 
  viewMatrix.translate(.7,.2,.9);
  viewMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
 // finger tip 
  viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

viewMatrix = popMatrix();
pushMatrix(viewMatrix); 

// top cylinder arm right   
  viewMatrix.translate(0.94,0,0.8);  
 viewMatrix.scale(.6,.6,.6);
 viewMatrix.rotate(-222,0,1,0); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// elbow joint right
viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
  // rest of arm right
  viewMatrix.translate(0,0.8,1.3);
  viewMatrix.scale(1.4,1.4,1.4);
  viewMatrix.rotate(-30,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
// hand right
viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  pushMatrix(viewMatrix);

  // Draw fingers
   for (x=0; x < 3; x++)
   {  
      viewMatrix.translate(.6 - x*.44,-.3,1);
    viewMatrix.scale(0.4,0.4,0.4);
    gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BcylStart/floatsPerVertex, // start at this vertex number, and
                  BcylVerts.length/floatsPerVertex);  // draw this many vertices.
     
    // finger tip 
    viewMatrix.translate( 0, 0, 1); 
    viewMatrix.scale(0.7,0.7,0.7); 
   gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BsphStart/floatsPerVertex,  // start at this vertex number, and 
                  BsphVerts.length/floatsPerVertex);  // draw this many vertices.
    viewMatrix = popMatrix(); 
   pushMatrix(viewMatrix); 
   }
 
viewMatrix = popMatrix(); 
// thumb 
viewMatrix.translate(-.5,.2,.9);
  viewMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
 // finger tip 
  viewMatrix.translate( 0, 0, 1); 
viewMatrix.scale(0.7,0.7,0.7); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  viewMatrix = popMatrix();
  pushMatrix(viewMatrix); 

// bottom circular part of body 
 viewMatrix.translate( 0, 0, -0.5); 
 viewMatrix.scale(1.22,1.22,1.22); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  viewMatrix = popMatrix();
  pushMatrix(viewMatrix); 

// bottom circular part of body 
 viewMatrix.translate( 0, 0, -0.5); 
 viewMatrix.scale(1.22,1.22,1.22); 
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

pushMatrix(viewMatrix); 

  // right leg cylinder 
  viewMatrix.translate(0.338,0,-1);  
 viewMatrix.scale(0.33, 0.33, 0.33);
 viewMatrix.rotate(180,0,1,0); 
  viewMatrix.rotate(currentAngle * .9,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw right foot  
  viewMatrix.translate( 0, 0, 1); 
 viewMatrix.rotate(90,0,0,1);                                        
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  viewMatrix = popMatrix();

  // left leg 
  viewMatrix.translate(-0.338,0,-1);  
 viewMatrix.scale(0.33, 0.33, 0.33);
 viewMatrix.rotate(180,0,1,0); 
 viewMatrix.rotate(currentAngle * -.9,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw left foot  
  viewMatrix.translate( 0, 0, 1); 
 viewMatrix.rotate(90,0,0,1);                                        
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  viewMatrix = popMatrix();
  pushMatrix(viewMatrix); 
   //--------Draw top part of the body 
  viewMatrix.translate( 0, 0, 1); // 'set' means DISCARD old matrix,
 viewMatrix.rotate(90,0,0,1);                                        
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
//////////////////////////////////////////////////////////////////////////////
// head cylinder
  viewMatrix.translate(0,0,1.2);  
  viewMatrix.scale(0.3, 0.3, 0.3);
 viewMatrix.rotate(90,0,1,0); 
 viewMatrix.rotate(90,1,0,0); 
    
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

pushMatrix(viewMatrix);
  //--------Draw right part of head 
  viewMatrix.translate( 0, 0, .6); // 'set' means DISCARD old matrix,
 viewMatrix.rotate(90,0,0,1);                                        
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
  viewMatrix = popMatrix(); 
  pushMatrix(viewMatrix); 
    //--------Draw left part of head 
  viewMatrix.translate( 0, 0, -.6); // 'set' means DISCARD old matrix,
 viewMatrix.rotate(90,0,0,1);                                        
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
  viewMatrix = popMatrix(); 
  pushMatrix(viewMatrix); 

  // Draw right eye 
    viewMatrix.translate( 0, 1, 0.7); // 'set' means DISCARD old matrix,
 viewMatrix.rotate(90,0,0,1);                    
 viewMatrix.scale(0.2,0.2,0.2);                    
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.
  viewMatrix = popMatrix(); 


  // Draw left eye 
    viewMatrix.translate( 0, 1, -0.7); // 'set' means DISCARD old matrix,
 viewMatrix.rotate(90,0,0,1);                    
 viewMatrix.scale(0.2,0.2,0.2);                    
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

  // connecting line
  viewMatrix.translate(0,0,8); 
  viewMatrix.scale(15,15,15); 
  viewMatrix.rotate(90,0,1,0)
    gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
    gl.drawArrays(gl.LINES,
                lineStart/floatsPerVertex, 
                lineVerts.length/floatsPerVertex);

viewMatrix = popMatrix(); 
viewMatrix = popMatrix(); 
//////////////////////---------------------------------///////////////////
///////////////////////////// ROCKET ///////////////////////////////////
/////------------------------------------------------------------


   //--------Draw rocket top 
  viewMatrix.translate( 1.65, .5, -2); // 'set' means DISCARD old matrix,
                          // to match WebGL display canvas.
  viewMatrix.scale(.5, .5, .5);
              // Make it smaller:
  viewMatrix.rotate(90, 1,0,0);
  viewMatrix.rotate(25,0,1,0);

  //viewMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);

  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.

//  rocket cylindrical body
  viewMatrix.translate(0,0,1.9);
 // viewMatrix.rotate(150,1,0,0);
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RbodyStart/floatsPerVertex, // start at this vertex number, and
                RbodyVerts.length/floatsPerVertex); // draw this many vertices.
pushMatrix(viewMatrix); 

// rocket bottom
 viewMatrix.translate(0,0,1.1);
 // viewMatrix.rotate(150,1,0,0);
 viewMatrix.scale(.2,.2,.2); 
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RbottomStart/floatsPerVertex, // start at this vertex number, and
                rocketBottomVerts.length/floatsPerVertex);  // draw this many vertices.
viewMatrix = popMatrix(); 
pushMatrix(viewMatrix); 
// rocket booster right
 viewMatrix.translate(1,0,0.64);
 viewMatrix.rotate(180,0,1,0);
 viewMatrix.scale(0.35,0.35,0.35); 
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.
// top booster part right 
viewMatrix.translate( 0, 0, 1); 
viewMatrix.rotate(45,1,0,0); 
//viewMatrix.scale(0.8,0.8,0.9); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  
viewMatrix = popMatrix(); 
pushMatrix(viewMatrix); 

// rocket booster left
 viewMatrix.translate(-1,0,0.64);
 viewMatrix.rotate(180,0,1,0);
 viewMatrix.scale(0.35,0.35,0.35); 
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.

// top booster part right 
viewMatrix.translate( 0, 0, 1); 
viewMatrix.rotate(45,1,0,0); 
//viewMatrix.scale(0.8,0.8,0.9); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  
viewMatrix = popMatrix(); 
pushMatrix(viewMatrix);

// rocket booster back
 viewMatrix.translate(0,1,0.64);
 viewMatrix.rotate(180,0,1,0);
 viewMatrix.scale(0.35,0.35,0.35); 
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                 RboosterBotStart/floatsPerVertex,  // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.

// top booster part right 
viewMatrix.translate( 0, 0, 1); 
viewMatrix.rotate(45,1,0,0); 
//viewMatrix.scale(0.8,0.8,0.9); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  
viewMatrix = popMatrix(); 
//pushMatrix(viewMatrix);

// rocket booster front
 viewMatrix.translate(0,-1,0.64);
 viewMatrix.rotate(180,0,1,0);
 viewMatrix.scale(0.35,0.35,0.35); 
 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.
// top booster part right 
viewMatrix.translate( 0, 0, 1); 
viewMatrix.rotate(45,1,0,0); 
//viewMatrix.scale(0.8,0.8,0.9); 
 gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); 

viewMatrix = popMatrix(); 


/////////////////////--------------------------------///////////////////////////////////
  //--------------------- Bird--------------------------------------------------
  ////////////////////////////////////////////////////////////////////////////////////////

      //--------Draw Head
  viewMatrix.translate( -2, 1.5, -2); // 'set' means DISCARD old matrix,
  viewMatrix.scale(.4,.4,.4); 
  viewMatrix.rotate(180,0,1,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BirdsphStart/floatsPerVertex, // start at this vertex number, and 
                BirdsphereVerts.length/floatsPerVertex);  // draw this many vertices.

pushMatrix(viewMatrix);

   //--------Draw Eye 
  viewMatrix.translate( -0.3, 0.3, 1.0); 
  viewMatrix.scale(0.17, 0.17, 0.17);
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 
pushMatrix(viewMatrix); 
   //--------Draw Eye 
  viewMatrix.translate( -0.3, 0.3, -1.0);                  
  viewMatrix.scale(0.17, 0.17, 0.17);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 
pushMatrix(viewMatrix); 

 // Draw Beak  
 viewMatrix.translate( -1.1, .18, 0.1);
 viewMatrix.scale(0.34,0.34,0.34);
 viewMatrix.rotate(80,0,1,0);
 viewMatrix.rotate(15,1,0,0);

  viewMatrix.translate(0.7,0,0);

 gl.uniformMatrix4fv(u_viewMatrix,false,viewMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  

 viewMatrix = popMatrix(); 
pushMatrix(viewMatrix); 
 // Draw beak: moving part 
 viewMatrix.translate( -1.1, .4, 0.1);
 viewMatrix.scale(0.34,0.34,0.34);
 viewMatrix.rotate(80,0,1,0);
 viewMatrix.rotate(15,1,0,0);

 // viewMatrix.rotate(currentAngle * 1.5, 1, 0, 0);  // spin around y axis.
  viewMatrix.translate(0.7,0,0);

 gl.uniformMatrix4fv(u_viewMatrix,false,viewMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  

viewMatrix = popMatrix(); 
  //--------Draw Body
  viewMatrix.translate( 0.8, -2.2, 0); 
  viewMatrix.scale(1.7,1.7,1.7);             
  viewMatrix.translate(.3,0,0.1)
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BirdsphStart/floatsPerVertex, // start at this vertex number, and 
                BirdsphereVerts.length/floatsPerVertex);  // draw this many vertices.

  //-------Draw tail 
  viewMatrix.translate(1,-0.6, -0.4); 
  viewMatrix.rotate(-90, 0,1,0);
  viewMatrix.translate(0.4,0.6,0.1);
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                tailStart/floatsPerVertex, // start at this vertex number, and
                tailVerts.length/floatsPerVertex);  // draw this many vertices.


pushMatrix(viewMatrix); 
////JOINTED LEGS by successively moving drawing axes /////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

  //--------Draw Upper Leg: left
  viewMatrix.translate(0.2, -1.1, 1.1); 
  viewMatrix.scale(0.4,0.4,0.4);             
  viewMatrix.rotate(90,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw Lower Leg left
  viewMatrix.translate(0,0.39,1.8);
  viewMatrix.rotate(150,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix.translate(-.5,.2,-.98);

    
      //--------Draw top Claw part1: left
  viewMatrix.rotate(0,1,0,0);    
 viewMatrix.rotate(70,0,1,0);
 viewMatrix.rotate(90,0,0,1);  
  viewMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.


pushMatrix(viewMatrix); 
 //--------Draw top Claw part2: left
 viewMatrix.translate(-0.6,0,0.2);
viewMatrix.rotate(40,0,1,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 
  
 //--------Draw top Claw part3: left
 viewMatrix.translate(-1.05,-0.2,.7);
    
viewMatrix.rotate(80,0,1,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 

  //--------Draw Upper Leg: right
  viewMatrix.translate(0, -1.1, 0.8); 
  viewMatrix.scale(0.4,0.4,0.4);            
  viewMatrix.rotate(90,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw Lower Leg left
  viewMatrix.translate(0,0.39,1.8);
  viewMatrix.rotate(150,1,0,0);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix.translate(-0.2,.3,-1);

      //--------Draw top Claw part1: left
  viewMatrix.rotate(0,1,0,0);    
 viewMatrix.rotate(70,0,1,0);
 viewMatrix.rotate(90,0,0,1);  
  viewMatrix.scale(0.4,0.4,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.


pushMatrix(viewMatrix); 
 //--------Draw top Claw part2: left
 viewMatrix.translate(-0.6,0,0.2);
    
viewMatrix.rotate(40,0,1,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 
  
 //--------Draw top Claw part3: left
 viewMatrix.translate(-1.05,-0.2,.7);
    
viewMatrix.rotate(80,0,1,0.4);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

viewMatrix = popMatrix(); 

///////////////////////////-----------------------------///////////////////////////////
//------------------------------ Snail----------------------
//////////////////////////////////////////////////////////////////////////////////////////

//--------Draw Head
 viewMatrix.translate(-2.3 ,-1, -5); 
  viewMatrix.rotate(180,0,0,1);                   
  viewMatrix.scale(0.1,0.1,0.1); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailHeadStart/floatsPerVertex, // start at this vertex number, and 
                snailHeadVerts.length/floatsPerVertex); // draw this many vertices.

  // section 1
  viewMatrix.translate(-1,.1,0);  
  viewMatrix.rotate(90,0,1,0); 
  
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

  for (i=0; i < 7; i++) {

viewMatrix.translate(0,0,-0.9); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

  }


// snail middle section 
viewMatrix.translate(0,0,-0.9); 

  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.
pushMatrix(viewMatrix); 

// shell 
viewMatrix.translate(0,-7,-1.2);
viewMatrix.scale(6,6,6);  
viewMatrix.rotate(90,0,1,0);  

  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                shellStart/floatsPerVertex, // start at this vertex number, and
                shellVerts.length/floatsPerVertex);

  for (i = 0; i < 18; i++) {
  // inner shell
viewMatrix.translate(0,0,0);
viewMatrix.scale(.8,.8,.8);   

  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                shellStart/floatsPerVertex, // start at this vertex number, and
                shellVerts.length/floatsPerVertex);

}
viewMatrix = popMatrix(); 

  for (i=0; i < 5; i++) {

viewMatrix.translate(0,0,-0.9); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

  }


// snail section 18
viewMatrix.translate(0,0,-0.9); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

// snail section 19
viewMatrix.translate(0,0,-0.9); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

// snail section 20
viewMatrix.translate(0,0,-0.9); 
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.

// snail section 21
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailBodyStart/floatsPerVertex, // start at this vertex number, and
                snailBodyVerts.length/floatsPerVertex); // draw this many vertices.


// snail rear 
  viewMatrix.translate(0,0,-1);
  viewMatrix.scale(1.1, 1.1, 1.1);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                snailHeadStart/floatsPerVertex, // start at this vertex number, and 
                snailHeadVerts.length/floatsPerVertex); // draw this many vertices.

  ///////////////////////////////////////////////////////
  //----------------------spheres-----------------------//
  /////////////////////////////////////////////////////////////
  viewMatrix = popMatrix(); 

     viewMatrix.translate( -1 + currentAngle * .01, -1, 0); 
   viewMatrix.rotate(fullAngle,1,0,0);                 
 viewMatrix.scale(0.2,0.2,0.2);                    
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.
  pushMatrix(viewMatrix); 

  viewMatrix.translate(-.8, 0, 1.7);                                       
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                greenStart/floatsPerVertex, // start at this vertex number, and 
                greenVerts.length/floatsPerVertex); // draw this many vertices.

   viewMatrix.translate(-2, 0, 0);                                       
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                greenStart/floatsPerVertex, // start at this vertex number, and 
                greenVerts.length/floatsPerVertex); // draw this many vertices.

      viewMatrix.translate(1.2, 0, 1.7);                                       
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                blueStart/floatsPerVertex, // start at this vertex number, and 
                blueVerts.length/floatsPerVertex); // draw this many vertices.


  viewMatrix = popMatrix(); 

  for (i=0; i<2;i++) {
   viewMatrix.translate( -2, 0, 0);                                     
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.
}
  
}

//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
//                  (Which button?    console.log('ev.button='+ev.button);   )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = true;                      // set our mouse-dragging flag
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);

  // find how far we dragged the mouse:
  xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
  yMdragTot += (y - yMclik);
  // AND use any mouse-dragging we found to update quaternions qNew and qTot.
  dragQuat(x - xMclik, y - yMclik);
  
  xMclik = x;                         // Make NEXT drag-measurement from here.
  yMclik = y;
   
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
//  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

  // AND use any mouse-dragging we found to update quaternions qNew and qTot;
  dragQuat(x - xMclik, y - yMclik);

};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
  var res = 5;
  var qTmp = new Quaternion(0,0,0,1);
  
  var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
  // console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
  qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
  // (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
              // why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
              // -- to rotate around +x axis, drag mouse in -y direction.
              // -- to rotate around +y axis, drag mouse in +x direction.
              
  qTmp.multiply(qNew,qTot);     // apply new rotation to current rotation. 
  qTot.copy(qTmp);

};


function winResize(u_viewMatrix, viewMatrix, u_ProjMatrix, projMatrix) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

  var nuCanvas = document.getElementById('webgl');  // get current canvas
  var nuGL = getWebGLContext(nuCanvas);             // and context:

  //Report our current browser-window contents:

  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);   
 console.log('Browser window: innerWidth,innerHeight=', 
                                innerWidth, innerHeight); // http://www.w3schools.com/jsref/obj_window.asp

  
  //Make canvas fill the top 3/4 of our browser window:
  if (innerWidth < innerHeight)
  {
    nuCanvas.width = innerWidth; 
    nuCanvas.height = innerWidth; 
  }
  else 
  {
    nuCanvas.width = innerHeight;
    nuCanvas.height = innerHeight; 
  //nuCanvas.width = innerWidth;                                         
  //nuCanvas.height = innerHeight * 3/4;   
  }                                  
  //IMPORTANT!  need to re-draw screen contents
  draw(nuGL, u_viewMatrix, viewMatrix, u_ProjMatrix, projMatrix);  

}

var g_last = Date.now();
var g_last2 = Date.now();
var g_last3 = Date.now(); 

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  if(angle >  30 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle < -30 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animate2(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last2;
  g_last2 = now;
  
  var newAngle = angle + (10 * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animate3(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last3;
  g_last3 = now;

  if(angle >  15 && ANGLE_STEP2 > 0) ANGLE_STEP2 = -ANGLE_STEP2;
  if(angle < 0 && ANGLE_STEP2 < 0) ANGLE_STEP2 = -ANGLE_STEP2;

  
  var newAngle = angle + (5 * elapsed) / 1000.0;
  return newAngle %= 360;
}