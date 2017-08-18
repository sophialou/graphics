// Project C: Exploration of Shading and Lighting in the Virtual World
///////////////////////////////////////////////////////////
// Credits to:
// Kouichi Matsude and Rodger Lea
// from "WebGL Programming Guide: Interactive 3D Graphics Programming with WebGL" 
// from all the programmers that put together Dat.gui 
/// and 
// Northwestern Univ Jack Tumblin
// Inspiration from the movie Big Hero 6  
////// .js and .html MODIFIED for EECS 351-1 

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +  
  'attribute vec4 a_Normal;\n' + 

  'uniform vec3 u_Kd;\n' +    // Phong diffuse reflectance for entire shape 

  'uniform mat4 u_modelMatrix;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix; \n' + 

 'varying vec3 v_Kd; \n' + 
  'varying vec4 v_Position;\n' + 
  'varying vec3 v_Normal;\n' + 
 
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * u_modelMatrix * a_Position;\n' +
  ' v_Position = u_modelMatrix * a_Position;\n' +   
  ' v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' + 
    '  v_Kd = u_Kd; \n' +       
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +

  // one light source 
  'uniform vec4 u_Lamp0Pos;\n' +    // Phong Illum: position 
  'uniform vec3 u_Lamp0Amb;\n' +    // Phong Illum: ambient
  'uniform vec3 u_Lamp0Diff;\n' +   // Phong Illum: diffuse
  'uniform vec3 u_Lamp0Spec;\n' +   // Phong Illum: specular 

  // light source 2
  'uniform vec4 u_Lamp1Pos;\n' + // Phong Illum: position 
  'uniform vec3 u_Lamp1Amb;\n' +    // Phong Illum: ambient
  'uniform vec3 u_Lamp1Diff;\n' +   // Phong Illum: diffuse
  'uniform vec3 u_Lamp1Spec;\n' +   // Phong Illum: specular 

  'uniform vec4 spotlightPosition;\n' +

  // material definition 
  'uniform vec3 u_Ke;\n' +              // Phong Reflectance: emissive
  'uniform vec3 u_Ka;\n' +              // Phong Reflectance: ambient
    // Phong Reflectance: diffuse -- use v_Kd instead for per-pixel value
  'uniform vec3 u_Ks;\n' +               // Phong Reflectance: specular
  'uniform int u_Kshiny;\n' +           // Phong Reflectance: 1 < shiny < 200

  'uniform vec4 u_eyePosWorld;\n' + 

  'varying vec3 v_Normal;\n' +
  'varying vec4 v_Position;\n' + 
    'varying vec3 v_Kd; \n' +     


  'void main() {\n' +
  ' vec3 normal = normalize(v_Normal);\n' + 

  '  vec3 lightDirection = normalize(u_Lamp0Pos.xyz - v_Position.xyz);\n' +    
  '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' + 
'  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
'  vec3 H = normalize(lightDirection + eyeDirection); \n' +
  '  float nDotH = max(dot(H, normal), 0.0); \n' +

    ////////////////////////
  ' vec3 lightDirection1 = normalize(u_Lamp1Pos.xyz - spotlightPosition.xyz);\n' + 
  ' float nDotL1 = max(dot(lightDirection1, normal), 0.0);\n' + 
  ' vec3 eyeDirection1 = normalize(u_eyePosWorld.xyz - spotlightPosition.xyz);\n' +
  ' vec3 H1 = normalize(lightDirection1 + eyeDirection1);\n' + 
  ' float nDotH1 = max(dot(H1, normal), 0.0);\n' + 

  ///////////////////////////

  ' float exp = float(u_Kshiny);\n' + 
  ' float e0x = pow(nDotH,exp);\n' + 
  ' float e0xx = pow(nDotH1, exp);\n' +  

 '   vec3 emissive = u_Ke;\n' +            
 ' vec3 emissive1 = u_Ke\n;' +  
'  vec3 ambient = u_Lamp0Amb * u_Ka;\n' +
' vec3 ambient1 = u_Lamp1Amb * u_Ka;\n' + 
'  vec3 diffuse = u_Lamp0Diff * v_Kd * nDotL;\n' +
' vec3 diffuse1 = u_Lamp1Diff * v_Kd * nDotL1;\n' + 
'   vec3 speculr = u_Lamp0Spec * u_Ks * e0x * e0x;\n' +
' vec3 speculr1 = u_Lamp1Spec * u_Ks * e0xx * e0xx;\n' + 
  '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr + emissive1 + ambient1 + diffuse1 + speculr1, 1.0);\n' +    //////////////////
  '}\n';
  
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + normal vector coordinates 

/////// Quaternion- rotation variables 
qNew = new Quaternion(0,0,0,1); // most recent drag rotation
qTot = new Quaternion(0,0,0,1); 
var quatMatrix = new Matrix4(); 
var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

//// Movement variables 
var ANGLE_STEP = 8.0;
var ANGLE_STEP2 = 15.0; 
var currentAngle = 0.0; 
var fullAngle = 0.0; 
var fingerAngle = 0.0; 

// Canvas 
var canvas; 

// Create the matrices
var normalMatrix = new Matrix4();
var modelMatrix = new Matrix4();
var mvpMatrix = new Matrix4();

// Lighting variables 
var u_Lamp0Pos; 
var u_Lamp0Amb;
var u_Lamp0Diff;
var u_Lamp0Spec; 

var u_Lamp1Pos; 
var u_Lamp1Amb;
var u_Lamp1Diff;
var u_Lamp1Spec; 

var u_eyePosWorld;

var spotlightPosition; 

// material variables 
var u_Ke;
var u_Ka;
var u_Kd;
var u_Ks; 
var u_Kshiny; 

// dat.gui object variables 
var gui;
var controls; 

function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');
  
  // print instructions onto the console 

    console.log("Instructions:  The arrow keys and 7 and 1 from the keypad change the eyepoint. ");
    console.log("The keypad numbers 8,4,1,6,9, and 3 change the look-at point. ");
    console.log("W, a, s, and z allow diagonal camera movement. ");
    console.log("The view (near and far) can be changed by p, l, o, and k. ");
    console.log("Use the onscreen sliders/ inputs to make lighting adjustments. "); 

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


// Create adjustable lighting variables for the controls object 
  controls = new function() {
    this.positionX = 0.0; 
    this.positionY = 0.0; 
    this.positionZ = 0.0; 
    this.focusX = 0.0;
    this.focusY = 0.0;
    this.focusZ = 0.0; 
    this.AmbientRed = 0.2;
    this.AmbientGreen = 0.0;
    this.AmbientBlue = 0.0;
    this.DiffuseRed = 0.2;
    this.DiffuseGreen = 0.0;
    this.DiffuseBlue = 0.0;
    this.SpecularRed = 0.3;
    this.SpecularGreen = 0.0;
    this.SpecularBlue = 0.0; 

    this.cameraAmbientRed = 0.4;
    this.cameraAmbientGreen = 0.4;
    this.cameraAmbientBlue = 0.4;
    this.cameraDiffuseRed = 1.0;
    this.cameraDiffuseGreen = 1.0;
    this.cameraDiffuseBlue = 1.0;
    this.cameraSpecularRed = 1.0;
    this.cameraSpecularGreen = 1.0;
    this.cameraSpecularBlue = 1.0; 
  }

// Organize the sliders to change lighting parameters within folders and subfolders 
  gui = new dat.GUI(); 
  var f1 = gui.addFolder('Spotlight Lighting Adjustments'); 
  var f11 = f1.addFolder('Positioning'); 
  var f111 = f11.addFolder('Lamp Position');
  f111.add(controls, 'positionX',-20,20); 
  f111.add(controls, 'positionY',-20,20); 
  f111.add(controls, 'positionZ',-20,20); 
  var f112 = f11.addFolder('Focus Point'); 
  f112.add(controls, 'focusX',-20,20); 
  f112.add(controls, 'focusY',-20,20); 
  f112.add(controls, 'focusZ',-20,20); 
  var f12 = f1.addFolder('Ambient Lighting'); 
  f12.add(controls,'AmbientRed',0,1.0); 
  f12.add(controls,'AmbientGreen',0,1.0);
  f12.add(controls,'AmbientBlue',0,1.0); 
  var f13 = f1.addFolder('Diffuse Lighting'); 
  f13.add(controls,'DiffuseRed',0,1.0); 
  f13.add(controls,'DiffuseGreen',0,1.0);
  f13.add(controls,'DiffuseBlue',0,1.0); 
  var f14 = f1.addFolder('Specular Lighting'); 
  f14.add(controls,'SpecularRed',0,1.0); 
  f14.add(controls,'SpecularGreen',0,1.0);
  f14.add(controls,'SpecularBlue',0,1.0); 

  var f2 = gui.addFolder('Camera Lighting Adjustments'); 
  var f21 = f2.addFolder('Ambient Lighting'); 
  f21.add(controls,'cameraAmbientRed',0,1.0); 
  f21.add(controls,'cameraAmbientGreen',0,1.0);
  f21.add(controls,'cameraAmbientBlue',0,1.0); 
  var f22 = f2.addFolder('Diffuse Lighting'); 
  f22.add(controls,'cameraDiffuseRed',0,1.0); 
  f22.add(controls,'cameraDiffuseGreen',0,1.0);
  f22.add(controls,'cameraDiffuseBlue',0,1.0); 
  var f23 = f2.addFolder('Specular Lighting'); 
  f23.add(controls,'cameraSpecularRed',0,1.0); 
  f23.add(controls,'cameraSpecularGreen',0,1.0);
  f23.add(controls,'cameraSpecularBlue',0,1.0); 


  // Get the storage locations of uniforms 
  var u_modelMatrix = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');   
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix'); 
  if (!u_modelMatrix || !u_MvpMatrix || !u_NormalMatrix) {  
    console.log('Failed to get u_modelMatrix or u_MvpMatrix');
    return;
  }

  // Phong light source 
   u_Lamp0Pos  = gl.getUniformLocation(gl.program,  'u_Lamp0Pos');
   u_Lamp0Amb  = gl.getUniformLocation(gl.program,   'u_Lamp0Amb');
   u_Lamp0Diff = gl.getUniformLocation(gl.program,   'u_Lamp0Diff');
   u_Lamp0Spec = gl.getUniformLocation(gl.program,   'u_Lamp0Spec');
  if( !u_Lamp0Pos || !u_Lamp0Amb  ) {//|| !u_Lamp0Diff  ) { // || !u_Lamp0Spec  ) {
    console.log('Failed to get the Lamp0 storage locations');
    return;
  }

// light source 2
u_Lamp1Pos  = gl.getUniformLocation(gl.program,  'u_Lamp1Pos');
   u_Lamp1Amb  = gl.getUniformLocation(gl.program,   'u_Lamp1Amb');
   u_Lamp1Diff = gl.getUniformLocation(gl.program,   'u_Lamp1Diff');
   u_Lamp1Spec = gl.getUniformLocation(gl.program,   'u_Lamp1Spec');
   spotlightPosition = gl.getUniformLocation(gl.program, 'spotlightPosition'); 
  if( !u_Lamp0Pos || !u_Lamp0Amb  ) {//|| !u_Lamp0Diff  ) { // || !u_Lamp0Spec  ) {
    console.log('Failed to get the Lamp0 storage locations');
    return;
  }

// get location of material uniforms 
  u_Ke = gl.getUniformLocation(gl.program, 'u_Ke');
  u_Ka = gl.getUniformLocation(gl.program, 'u_Ka');
  u_Kd = gl.getUniformLocation(gl.program, 'u_Kd');
  u_Ks = gl.getUniformLocation(gl.program, 'u_Ks');
  u_Kshiny = gl.getUniformLocation(gl.program, 'u_Kshiny');
  
  if(!u_Ke || !u_Ka || !u_Kd 
//     || !u_Ks || !u_Kshiny
     ) {
    console.log('Failed to get the Phong Reflectance storage locations');
    return;
  }


 winResize(u_modelMatrix, u_MvpMatrix);   // (HTML file also calls it on browser-resize events)

  // Register the event handlers
 document.onkeydown = function(ev){ keydown(ev, gl, u_modelMatrix, modelMatrix); };
	 canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas) }; 
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };         
  canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

 
   // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    fullAngle = animate2(fullAngle); 
    fingerAngle = animate3(fingerAngle); 

    draw(gl, u_modelMatrix, u_MvpMatrix, u_NormalMatrix, u_eyePosWorld);  

    requestAnimationFrame(tick, canvas);   
                      // Request that the browser re-draw the webpage
  };
  tick();             // start (and continue) animation: draw current image
}

// face line
function makeLine() {
 lineVerts = new Float32Array([
  0.0, 0.0, 0.0, 1.0,        1,0,0,
  0.5, 0.0, 0.0, 1.0,        1,0,0
  ]);
}

function makeBaymaxCylinder() {

 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 //////////////////////////////////////////////////////////
 var botRadius = .7;    // radius
 
 // Create a (global) array to hold this cylinder's vertices;
 BcylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                  
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      BcylVerts[j  ] = 0.0;       // x,y,z,w == 0,0,1,1
      BcylVerts[j+1] = 0.0; 
      BcylVerts[j+2] = 0.5; 
      BcylVerts[j+3] = 0.5;     
      BcylVerts[j+4]=0.0;
      BcylVerts[j+5]=0.0;
      BcylVerts[j+6]=1.0;
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
      BcylVerts[j+4]=0.0; 
      BcylVerts[j+5]=0.0; 
      BcylVerts[j+6]=1.0;     
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
        BcylVerts[j+4]=botRadius * Math.cos(Math.PI*(v)/capVerts);    // x
        BcylVerts[j+5]=botRadius * Math.sin(Math.PI*(v)/capVerts);    // y
        BcylVerts[j+6]=0.0;      
    }
    else    // position all odd# vertices along the bottom cap:
    {
        BcylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        BcylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        BcylVerts[j+2] =-1.0; // z
        BcylVerts[j+3] = 1.0; // w.
      BcylVerts[j+4]=botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
      BcylVerts[j+5]=botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y 
      BcylVerts[j+6]=0.0;      
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
      BcylVerts[j+4]=0.0; 
      BcylVerts[j+5]=0.0; 
      BcylVerts[j+6]=-1.0;    
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      BcylVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      BcylVerts[j+1] = 0.0; 
      BcylVerts[j+2] =-1.0; 
      BcylVerts[j+3] = 1.0;     // r,g,b = botColr[]
      BcylVerts[j+4]=0.0; 
      BcylVerts[j+5]=0.0;
      BcylVerts[j+6]=-1.0; 
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
            BsphVerts[j+4]=sin0 * Math.cos(Math.PI*(v)/sliceVerts);   
          BsphVerts[j+5]=sin0 * Math.sin(Math.PI*(v)/sliceVerts);
          BsphVerts[j+6]= cos0;    
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        BsphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        BsphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        BsphVerts[j+2] = cos1;                                        // z
        BsphVerts[j+3] = 1.0;                                       // w.   
            BsphVerts[j+4]=sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x 
          BsphVerts[j+5]=sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
          BsphVerts[j+6]= cos1;                                        // z
      }
       
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
          eyeVerts[j+4]=sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
          eyeVerts[j+5]=sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
          eyeVerts[j+6]=cos0;  
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        eyeVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        eyeVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        eyeVerts[j+2] = cos1;                                       // z
        eyeVerts[j+3] = 1.0;                                        // w.   
          eyeVerts[j+4]=sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
          eyeVerts[j+5]=sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
          eyeVerts[j+6]=cos1;                                       // z
      }  
             
    }
  }
}

function makeBaymaxCBody() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
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
       baymaxCBodyVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+5] = 0.0;  
      baymaxCBodyVerts[j+6] = 1.0;
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
     baymaxCBodyVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+5] = 0.0;  
      baymaxCBodyVerts[j+6] = 1.0;
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
             baymaxCBodyVerts[j+4] = 1 * Math.cos(Math.PI*(v)/capVerts);   // x
      baymaxCBodyVerts[j+5] = 1 * Math.sin(Math.PI*(v)/capVerts);   // y
      baymaxCBodyVerts[j+6] = 0.0;    
    }
    else    // position all odd# vertices along the bottom cap:
    {
        baymaxCBodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        baymaxCBodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        baymaxCBodyVerts[j+2] =-1.0;  // z
        baymaxCBodyVerts[j+3] = 1.0;  // w.    
             baymaxCBodyVerts[j+4] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
      baymaxCBodyVerts[j+5] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y 
      baymaxCBodyVerts[j+6] = 0.0;
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
           baymaxCBodyVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+5] = 0.0;  
      baymaxCBodyVerts[j+6] = -1.0;
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      baymaxCBodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      baymaxCBodyVerts[j+1] = 0.0;  
      baymaxCBodyVerts[j+2] =-1.0; 
      baymaxCBodyVerts[j+3] = 1.0;      // r,g,b = botColr[]
           baymaxCBodyVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      baymaxCBodyVerts[j+5] = 0.0;  
      baymaxCBodyVerts[j+6] = -1.0;
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
           RtopVerts[j+4]= sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
          RtopVerts[j+5]= sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
          RtopVerts[j+6]= cos0;
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        RtopVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        RtopVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        RtopVerts[j+2] = cos1;                                        // z
        RtopVerts[j+3] = 1.0;                                       // w. 
           RtopVerts[j+4]=sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
          RtopVerts[j+5]= sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
          RtopVerts[j+6]= cos1;     
      }
          
    }
  }

}  

function makeRocketBody() {

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
      RbodyVerts[j+3] = 0.5;      
        RbodyVerts[j+4] = 0.0;      
      RbodyVerts[j+5] = 0.0;  
      RbodyVerts[j+6] = 1.0; 
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

      RbodyVerts[j+4] = 0.0;      
      RbodyVerts[j+5] = 0.0;  
      RbodyVerts[j+6] = 1.0;     
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
    
        RbodyVerts[j+4] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x   
        RbodyVerts[j+5] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y 
        RbodyVerts[j+6] = 0.0; 
    }
    else    // position all odd# vertices along the bottom cap:
    {
        RbodyVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        RbodyVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        RbodyVerts[j+2] =-1.0;  // z
        RbodyVerts[j+3] = 1.0;  // w. 
          RbodyVerts[j+4] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x    
      RbodyVerts[j+5] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
      RbodyVerts[j+6] = 0.0;    
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
        RbodyVerts[j+4] = 0.0;      
      RbodyVerts[j+5] = 0.0;  
      RbodyVerts[j+6] = -1.0;  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      RbodyVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      RbodyVerts[j+1] = 0.0;  
      RbodyVerts[j+2] =-1.0; 
      RbodyVerts[j+3] = 1.0;     
      RbodyVerts[j+4] = 0.0;      
      RbodyVerts[j+5] = 0.0;  
      RbodyVerts[j+6] = -1.0; 
    }
  }
}

function makeRocketBottom() {
  
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
       rocketBottomVerts[j+4] = 0.0;     
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0; 
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
  
        rocketBottomVerts[j+4] = 0.0;      
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0;      
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

          rocketBottomVerts[j+4] = 0.0;       
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0;       
    }
    else    // position all odd# vertices along the bottom cap:
    {
        rocketBottomVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        rocketBottomVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        rocketBottomVerts[j+2] =-1.0; // z
        rocketBottomVerts[j+3] = 1.0; // w.
;   
          rocketBottomVerts[j+4] = 0.0;      
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0;    
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
  
        rocketBottomVerts[j+4] = 0.0;       
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0;  
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      rocketBottomVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      rocketBottomVerts[j+1] = 0.0; 
      rocketBottomVerts[j+2] =-1.0; 
      rocketBottomVerts[j+3] = 1.0;     // r,g,b = botColr[]

        rocketBottomVerts[j+4] = 0.0;      
      rocketBottomVerts[j+5] = 0.0; 
      rocketBottomVerts[j+6] = 1.0; 
    }
  }
}

function makeRocketBoosterBottom() {

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

       RboosterBotVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+5] = 0.0;  
      RboosterBotVerts[j+6] = 1.0; 
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

       RboosterBotVerts[j+4] = 0.0;      
      RboosterBotVerts[j+5] = 0.0;  
      RboosterBotVerts[j+6] = 1.0;     
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
   
         RboosterBotVerts[j+4] = Math.cos(Math.PI*(v)/capVerts);   // x    
      RboosterBotVerts[j+5] = Math.sin(Math.PI*(v)/capVerts);   // y 
      RboosterBotVerts[j+6] = 0.0;   
    }
    else    // position all odd# vertices along the bottom cap:
    {
        RboosterBotVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        RboosterBotVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        RboosterBotVerts[j+2] =-1.0;  // z
        RboosterBotVerts[j+3] = 1.0;  // w.
 
         RboosterBotVerts[j+4] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
      RboosterBotVerts[j+5] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
      RboosterBotVerts[j+6] = 0.0;      
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

       RboosterBotVerts[j+4] = 0.0;      // x,y,z,w == 0,0,1,1
      RboosterBotVerts[j+5] = 0.0;  
      RboosterBotVerts[j+6] = -1.0;    
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      RboosterBotVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      RboosterBotVerts[j+1] = 0.0;  
      RboosterBotVerts[j+2] =-1.0; 
      RboosterBotVerts[j+3] = 1.0;      // r,g,b = botColr[]

       RboosterBotVerts[j+4] = 0.0;      
      RboosterBotVerts[j+5] = 0.0;  
      RboosterBotVerts[j+6] = -1.0; 
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
          RboosterTopVerts[j+4]=sin0 * Math.cos(Math.PI*(v)/sliceVerts); 
          RboosterTopVerts[j+5]=sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
          RboosterTopVerts[j+6]= cos0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        RboosterTopVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        RboosterTopVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        RboosterTopVerts[j+2] = cos1;                                       // z
        RboosterTopVerts[j+3] = 1.0;                                        // w.  
          RboosterTopVerts[j+4]= sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
          RboosterTopVerts[j+5]=sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y 
          RboosterTopVerts[j+6]= cos1;                                       // z 
      }
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
        BirdsphereVerts[j+4]=sin0 * Math.cos(Math.PI*(v)/sliceVerts); 
          BirdsphereVerts[j+5]=sin0 * Math.sin(Math.PI*(v)/sliceVerts); 
          BirdsphereVerts[j+6]=cos0;   
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        BirdsphereVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        BirdsphereVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        BirdsphereVerts[j+2] = cos1;                                        // z
        BirdsphereVerts[j+3] = 1.0;                                       // w.   
        BirdsphereVerts[j+4]=sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
          BirdsphereVerts[j+5]=sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
          BirdsphereVerts[j+6]=cos1;                                        // z
      }
        
    }
  }
}

function makeBeak() {
//==============================================================================

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

      beakVerts[j+4] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+5] = 0.0; 
      beakVerts[j+6] = 1.0; 
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
 
          beakVerts[j+4] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+5] = 0.0; 
      beakVerts[j+6] = 1.0;      
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
 
            beakVerts[j+4] = Math.cos(Math.PI*(v)/capVerts);    // x
      beakVerts[j+5] = Math.sin(Math.PI*(v)/capVerts);    // y
      beakVerts[j+6] = 0.0;      
    }
    else    // position all odd# vertices along the bottom cap:
    {
        beakVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
        beakVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y
        beakVerts[j+2] =-1.0; // z
        beakVerts[j+3] = 1.0; // w.

            beakVerts[j+4] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);    // x
      beakVerts[j+5] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);    // y 
      beakVerts[j+6] = 0.0;      
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
 
          beakVerts[j+4] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+5] = 0.0; 
      beakVerts[j+6] = -1.0;    
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      beakVerts[j  ] = 0.0;       // x,y,z,w == 0,0,-1,1
      beakVerts[j+1] = 0.0; 
      beakVerts[j+2] =-1.0; 
      beakVerts[j+3] = 1.0;     // r,g,b = botColr[]

          beakVerts[j+4] = 0.0;       // x,y,z,w == 0,0,1,1
      beakVerts[j+5] = 0.0; 
      beakVerts[j+6] = -1.0; 
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
        tailVerts[j+4]=sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
          tailVerts[j+5]=sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
          tailVerts[j+6]=cos0;   
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        tailVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x
        tailVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
        tailVerts[j+2] = cos1;                                        // z
        tailVerts[j+3] = 1.0;                                       // w.   
        tailVerts[j+4]=sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);   // x 
          tailVerts[j+5]=sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);   // y
          tailVerts[j+6]=cos1;                                        // z  
      } 
       
    }
  }
}

function makeLeg() {
//==============================================================================
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

      legVerts[j+4] = 0.0;     
      legVerts[j+5] = 0.0;  
      legVerts[j+6] = 1.0;
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

        legVerts[j+4] = 0.0;   
      legVerts[j+5] = 0.0;  
      legVerts[j+6] = 1.0;    
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
  
          legVerts[j+4] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x    
      legVerts[j+5] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      legVerts[j+6] = 0.0;  
    }
    else    // position all odd# vertices along the bottom cap:
    {
        legVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        legVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        legVerts[j+2] =-1.0;  // z
        legVerts[j+3] = 1.0;  // w.
     
          legVerts[j+4] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x    
      legVerts[j+5] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x 
      legVerts[j+6] = 0.0; 
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
  
        legVerts[j+4] = 0.0;    
      legVerts[j+5] = 0.0;  
      legVerts[j+6] = -1.0;
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      legVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      legVerts[j+1] = 0.0;  
      legVerts[j+2] =-1.0; 
      legVerts[j+3] = 1.0;      // r,g,b = botColr[]

        legVerts[j+4] = 0.0;      
      legVerts[j+5] = 0.0;  
      legVerts[j+6] = -1.0;
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

        gndVerts[j+4] = 0;     // red
    gndVerts[j+5] = 0;     // grn
    gndVerts[j+6] = 1;     // blu
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

     gndVerts[j+4] = 0;     // red
    gndVerts[j+5] = 0;     // grn
    gndVerts[j+6] = 1;     // blu
  }
}


function  makeSphere() {

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

  redVerts = new Float32Array(  ((13 * 2* 27) -2) * floatsPerVertex);
                    
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
        redVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        redVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        redVerts[j+2] = cos0;   
        redVerts[j+3] = 1.0;  

           redVerts[j+4] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        redVerts[j+5] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        redVerts[j+6] = cos0;     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        redVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        redVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        redVerts[j+2] = cos1;                                       // z
        redVerts[j+3] = 1.0;
                                             // w.   
          redVerts[j+4] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        redVerts[j+5] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        redVerts[j+6] = cos1;                                       // z
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
  ///////////////////////////////////////////////////////
  
  makeSphere();

  //////////////////////////////////////////////////////
 makeGroundGrid();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	 var mySiz = (lineVerts.length + eyeVerts.length + BcylVerts.length + BsphVerts.length + baymaxCBodyVerts.length +
                RtopVerts.length + RbodyVerts.length
                + rocketBottomVerts.length + RboosterBotVerts.length + RboosterTopVerts.length
                + BirdsphereVerts.length + beakVerts.length + tailVerts.length + legVerts.length 
                + gndVerts.length + redVerts.length 
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
    gndStart = i;         
  for(j=0; j< gndVerts.length; i++, j++) {
    colorShapes[i] = gndVerts[j];
    }
     redStart = i;
    for(j=0; j< redVerts.length; i++, j++) {
      colorShapes[i] = redVerts[j]; 
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

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 4);
  gl.enableVertexAttribArray(a_Normal);

  // Unbind buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null); 

  return nn;	// return # of vertices
}

// Create camera variables 
var near=1.0, far=15.0; 

var lookatY=0.0, lookatX=0.0, lookatZ=0.0; 
var g_EyeX = 0.0, g_EyeY = 0.0, g_EyeZ = 5.0; 

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

function keydown(ev, gl, u_modelMatrix, modelMatrix) {
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

function draw(gl, u_modelMatrix, u_MvpMatrix, u_NormalMatrix, u_eyePosWorld) {
//==============================================================================
  
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  var vpAspect = canvas.width / (canvas.height); 
    gl.viewport(0,                          // Viewport lower-left corner
              0,     // location(in pixels)
              canvas.width,        // viewport width, height.
              canvas.height );

mvpMatrix.setPerspective(40, vpAspect, near, far);  
 

	// but use a different 'view' matrix:
  mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position,
  											lookatX,lookatY , lookatZ, 								// look-at point,
  											0, 1, 0);							// 'up' vector.
  modelMatrix.setRotate(90,0,1,0);
       
  // Pass the  matrix to our shaders:
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);


  // Pass the eye position to u_eyePosWorld
 gl.uniform4f(u_eyePosWorld, g_EyeX,g_EyeY,g_EyeZ, 1);

// update camera lamp parameters 
 gl.uniform4f(u_Lamp0Pos, g_EyeX, g_EyeY, g_EyeZ, 1.0);            // lamp position looked at camera 
gl.uniform3f(u_Lamp0Amb,  controls.cameraAmbientRed, controls.cameraAmbientGreen, controls.cameraAmbientBlue);   // ambient
gl.uniform3f(u_Lamp0Diff, controls.cameraDiffuseRed, controls.cameraDiffuseGreen, controls.cameraDiffuseBlue);   // diffuse
gl.uniform3f(u_Lamp0Spec, controls.cameraSpecularRed, controls.cameraSpecularGreen, controls.cameraSpecularBlue);   // Specular

// Update spotlight parameters 
gl.uniform4f(u_Lamp1Pos, controls.positionX, controls.positionY, controls.positionZ, 1.0); 
gl.uniform3f(u_Lamp1Amb,  controls.AmbientRed, controls.AmbientGreen, controls.AmbientBlue);   // ambient
gl.uniform3f(u_Lamp1Diff, controls.DiffuseRed, controls.DiffuseGreen, controls.DiffuseBlue);   // diffuse
gl.uniform3f(u_Lamp1Spec, controls.SpecularRed, controls.SpecularGreen, controls.SpecularBlue);   // Specular
gl.uniform4f(spotlightPosition, controls.focusX, controls.focusY,controls.focusZ,0); 


	// Draw the scene:
	drawMyScene(gl, u_modelMatrix, u_NormalMatrix, u_MvpMatrix);
}

function drawMyScene(gl, u_modelMatrix, u_NormalMatrix, u_MvpMatrix) {
//===============================================================================	
// create materials 
var materialrp = new Material(MATL_GRN_PLASTIC);
var materialp = new Material(MATL_PEARL); 		
var materials = new Material(MATL_SILVER_SHINY); 
var materialb = new Material(MATL_BRASS); 
var materialbp = new Material(MATL_BLACK_PLASTIC); 
var materialr = new Material(MATL_RUBY); 
var materialg = new Material(MATL_GOLD_SHINY); 
var materialc = new Material(MATL_COPPER_SHINY); 
  
  for (i = 0; i < 8; i++) {
    pushMatrix(modelMatrix); 
  }

  /////////////////////////////////////////////////////////////////////
/////------------- GROUND GRID ---------------------------------------

  gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.6, 0.9, 0.2);        // Ka ambient
  gl.uniform3f(u_Kd, 0.0, 0.4, 0.1);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.8, 0.8, 0.8);        // Ks specular
  gl.uniform1i(u_Kshiny,64); 

   // Rotate to make a new set of 'world' drawing axes: 
 // old one had "+y points upwards", but
  modelMatrix.rotate(-90.0, 1,0,0); // new one has "+z points upwards",
                                      // made by rotating -90 deg on +x-axis.
  modelMatrix.translate(0.0, 0.0, -1.2);  
  modelMatrix.scale(0.5, 0.5,0.5);    // shrink the drawing axes 
  // Pass the modified view matrix to our shaders:
  normalMatrix.setInverseOf(modelMatrix);  
  normalMatrix.transpose();  
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                gndStart/floatsPerVertex, // start at this vertex number, and
                gndVerts.length/floatsPerVertex);   // draw this many vertices

///////////////////////////////////////////////////////////////
///// ------------------ GREEN BALL ---------------------------

modelMatrix = popMatrix(); 

gl.uniform3f(u_Ke, materialrp.emissive[0], materialrp.emissive[1], materialrp.emissive[2]);        // Ke emissive
gl.uniform3f(u_Ka, materialrp.ambient[0], materialrp.ambient[1], materialrp.ambient[2]);        // Ka ambient
gl.uniform3f(u_Kd, materialrp.diffuse[0], materialrp.diffuse[1], materialrp.diffuse[2]);        // Kd diffuse
gl.uniform3f(u_Ks, materialrp.specular[0], materialrp.specular[1], materialrp.specular[2]);        // Ks specular
gl.uniform1i(u_Kshiny,materialrp.shiny); 

modelMatrix.scale(.5,.5,.5); 
modelMatrix.translate(1,-.5,6); 

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw thi

  modelMatrix = popMatrix(); 

  /////////////////////////////////////////////////////////////////////////////
////////////-----------  BAYMAX -------------------------------------------
 gl.uniform3f(u_Ke, materialp.emissive[0], materialp.emissive[1], materialp.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialp.ambient[0], materialp.ambient[1], materialp.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialp.diffuse[0], materialp.diffuse[1], materialp.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialp.specular[0], materialp.specular[1], materialp.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialp.shiny); 
 //-------Draw cylindrical part of Baymax 
  modelMatrix.translate(1.6,0, -3.0);  

  // Quaternion 
  quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w); // Quaternion-->Matrix
  modelMatrix.concat(quatMatrix); // apply that matrix.
 
  modelMatrix.scale(0.5, 0.5, 0.5);
  modelMatrix.rotate(-90,1,0,0); 
  modelMatrix.rotate(120,0,0,1);
  normalMatrix.setInverseOf(modelMatrix);  
  normalMatrix.transpose();  
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.
  pushMatrix(modelMatrix);

// top cylinder arm left  
modelMatrix.translate(-0.94,0,0.8);  
modelMatrix.scale(.6,.6,.6);
modelMatrix.rotate(222,0,1,0); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// elbow joint 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
modelMatrix.rotate(currentAngle,1,0,0);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  // rest of arm
modelMatrix.translate(0,0.8,1.3);
modelMatrix.scale(1.4,1.4,1.4);
modelMatrix.rotate(-30,1,0,0);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// hand
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
pushMatrix(modelMatrix);

  // Draw finger 
   for (x=0; x < 3; x++)
   {
    modelMatrix.translate(.4 - x*.44,-.3,1);
    modelMatrix.scale(0.4,0.4,0.4);
    modelMatrix.rotate(fingerAngle * .5,-1,0,0);
    normalMatrix.setInverseOf(modelMatrix);  
    normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BcylStart/floatsPerVertex, // start at this vertex number, and
                  BcylVerts.length/floatsPerVertex);  // draw this many vertices.
     
    // finger tip 
    modelMatrix.translate( 0, 0, 1); 
    modelMatrix.scale(0.7,0.7,0.7);
    normalMatrix.setInverseOf(modelMatrix);  
    normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BsphStart/floatsPerVertex,  // start at this vertex number, and 
                  BsphVerts.length/floatsPerVertex);  // draw this many vertices.
    modelMatrix = popMatrix(); 
    pushMatrix(modelMatrix); 
   }
 
modelMatrix = popMatrix(); 
// thumb 
  modelMatrix.translate(.7,.2,.9);
  modelMatrix.scale(0.4,0.4,0.4);
  normalMatrix.setInverseOf(modelMatrix);  
  normalMatrix.transpose();  
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
 // finger tip 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

modelMatrix = popMatrix();
pushMatrix(modelMatrix); 

// top cylinder arm right   
modelMatrix.translate(0.94,0,0.8);  
modelMatrix.scale(.6,.6,.6);
modelMatrix.rotate(-222,0,1,0);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.

// elbow joint right
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
// rest of arm right
  modelMatrix.translate(0,0.8,1.3);
  modelMatrix.scale(1.4,1.4,1.4);
  modelMatrix.rotate(-30,1,0,0);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
// hand right
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  pushMatrix(modelMatrix);

  // Draw fingers
   for (x=0; x < 3; x++)
   {  
    modelMatrix.translate(.6 - x*.44,-.3,1);
    modelMatrix.scale(0.4,0.4,0.4);
    normalMatrix.setInverseOf(modelMatrix);  
    normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BcylStart/floatsPerVertex, // start at this vertex number, and
                  BcylVerts.length/floatsPerVertex);  // draw this many vertices.
     
    // finger tip 
    modelMatrix.translate( 0, 0, 1); 
    modelMatrix.scale(0.7,0.7,0.7); 
    normalMatrix.setInverseOf(modelMatrix);  
    normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  BsphStart/floatsPerVertex,  // start at this vertex number, and 
                  BsphVerts.length/floatsPerVertex);  // draw this many vertices.
    modelMatrix = popMatrix(); 
    pushMatrix(modelMatrix); 
   }
 
modelMatrix = popMatrix(); 
// thumb 
modelMatrix.translate(-.5,.2,.9);
modelMatrix.scale(0.4,0.4,0.4);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BcylStart/floatsPerVertex, // start at this vertex number, and
                BcylVerts.length/floatsPerVertex);  // draw this many vertices.
// finger tip 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.scale(0.7,0.7,0.7); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix();
  pushMatrix(modelMatrix); 

// bottom circular part of body 
modelMatrix.translate( 0, 0, -0.5); 
modelMatrix.scale(1.22,1.22,1.22);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements); 
gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

modelMatrix = popMatrix();
pushMatrix(modelMatrix); 

// bottom circular part of body 
 modelMatrix.translate( 0, 0, -0.5); 
 modelMatrix.scale(1.22,1.22,1.22); 
 normalMatrix.setInverseOf(modelMatrix);  
 normalMatrix.transpose();  
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

pushMatrix(modelMatrix); 

  // right leg cylinder 
 modelMatrix.translate(0.338,0,-1);  
 modelMatrix.scale(0.33, 0.33, 0.33);
 modelMatrix.rotate(180,0,1,0); 
  modelMatrix.rotate(currentAngle * .9,1,0,0);
  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw right foot  
  modelMatrix.translate( 0, 0, 1); 
 modelMatrix.rotate(90,0,0,1);        
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);                                
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix();

  // left leg 
  modelMatrix.translate(-0.338,0,-1);  
 modelMatrix.scale(0.33, 0.33, 0.33);
 modelMatrix.rotate(180,0,1,0); 
 modelMatrix.rotate(currentAngle * -.9,1,0,0);
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw left foot  
  modelMatrix.translate( 0, 0, 1); 
 modelMatrix.rotate(90,0,0,1);    
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);                                    
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix();
  pushMatrix(modelMatrix); 
   //--------Draw top part of the body 
  modelMatrix.translate( 0, 0, 1); 
 modelMatrix.rotate(90,0,0,1);       
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);                                 
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
//////////////////////////////////////////////////////////////////////////////
// head cylinder
  modelMatrix.translate(0,0,1.2);  
  modelMatrix.scale(0.3, 0.3, 0.3);
 modelMatrix.rotate(90,0,1,0); 
 modelMatrix.rotate(90,1,0,0); 
    normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                baymaxCBodyStart/floatsPerVertex, // start at this vertex number, and
                baymaxCBodyVerts.length/floatsPerVertex); // draw this many vertices.

pushMatrix(modelMatrix);
  //--------Draw right part of head 
  modelMatrix.translate( 0, 0, .6); // 'set' means DISCARD old matrix,
 modelMatrix.rotate(90,0,0,1);      
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);                                  
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
  modelMatrix = popMatrix(); 
  pushMatrix(modelMatrix); 
    //--------Draw left part of head 
  modelMatrix.translate( 0, 0, -.6); // 'set' means DISCARD old matrix,
 modelMatrix.rotate(90,0,0,1);                            
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);            
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BsphStart/floatsPerVertex,  // start at this vertex number, and 
                BsphVerts.length/floatsPerVertex);  // draw this many vertices.
  modelMatrix = popMatrix(); 
  pushMatrix(modelMatrix); 

  gl.uniform3f(u_Ke, 0.0, 0.0, 0.0);        // Ke emissive
  gl.uniform3f(u_Ka, 0.0, 0.0, 0.0);        // Ka ambient
  gl.uniform3f(u_Kd, 0.0, 0.0, 0.0);        // Kd diffuse
  gl.uniform3f(u_Ks, 0.0, 0.0, 0.0);        // Ks specular
    gl.uniform1i(u_Kshiny,0); 

  // Draw right eye 
    modelMatrix.translate( 0, 1, 0.7); // 'set' means DISCARD old matrix,
 modelMatrix.rotate(90,0,0,1);                    
 modelMatrix.scale(0.2,0.2,0.2);        
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);            
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.
  modelMatrix = popMatrix(); 


  // Draw left eye 
    modelMatrix.translate( 0, 1, -0.7); // 'set' means DISCARD old matrix,
 modelMatrix.rotate(90,0,0,1);                    
 modelMatrix.scale(0.2,0.2,0.2); 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);                   
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

  // connecting line
  modelMatrix.translate(0,0,8); 
  modelMatrix.scale(15,15,15); 
  modelMatrix.rotate(90,0,1,0)
  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.LINES,
                lineStart/floatsPerVertex, 
                lineVerts.length/floatsPerVertex);

modelMatrix = popMatrix(); 
modelMatrix = popMatrix(); 
//////////////////////---------------------------------///////////////////
///////////////////////////// ROCKET ///////////////////////////////////
/////------------------------------------------------------------

gl.uniform3f(u_Ke, materials.emissive[0], materials.emissive[1], materials.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materials.ambient[0], materials.ambient[1], materials.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materials.diffuse[0], materials.diffuse[1], materials.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materials.specular[0], materials.specular[1], materials.specular[2]);        // Ks specular
    gl.uniform1i(u_Kshiny,materials.shiny); 
   //--------Draw rocket top 
  modelMatrix.translate( 2, 1, -0.4); // 'set' means DISCARD old matrix,
                          // to match WebGL display canvas.
  modelMatrix.translate(0,currentAngle * 0.02,0); 
  modelMatrix.scale(.5, .5, .5);
              // Make it smaller:
  modelMatrix.rotate(90, 1,0,0);
  modelMatrix.rotate(25,0,1,0);

  //modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.

//  rocket cylindrical body
  modelMatrix.translate(0,0,1.9);
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RbodyStart/floatsPerVertex, // start at this vertex number, and
                RbodyVerts.length/floatsPerVertex); // draw this many vertices.
pushMatrix(modelMatrix); 

// rocket bottom
gl.uniform3f(u_Ke, materialbp.emissive[0], materialbp.emissive[1], materialbp.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialbp.ambient[0], materialbp.ambient[1], materialbp.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialbp.diffuse[0], materialbp.diffuse[1], materialbp.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialbp.specular[0], materialbp.specular[1], materialbp.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialbp.shiny); 

 modelMatrix.translate(0,0,1.1);
 modelMatrix.scale(.2,.2,.2); 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RbottomStart/floatsPerVertex, // start at this vertex number, and
                rocketBottomVerts.length/floatsPerVertex);  // draw this many vertices.
modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 
/////////////////////////////////////////////////////////////
// rocket booster right
gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny);

 modelMatrix.translate(1,0,0.9);
  modelMatrix.translate(0,0,currentAngle * 0.009); 
 modelMatrix.rotate(180,0,1,0);
 modelMatrix.scale(0.35,0.35,0.35); 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.

    pushMatrix(modelMatrix); 

  // top flame
  gl.uniform3f(u_Ke, materialc.emissive[0], materialc.emissive[1], materialc.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialc.ambient[0], materialc.ambient[1], materialc.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialc.diffuse[0], materialc.diffuse[1], materialc.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialc.specular[0], materialc.specular[1], materialc.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialc.shiny); 

modelMatrix.translate( 0, 0, -.32); 
modelMatrix.scale(1.2,1.2,1.2); 
modelMatrix.translate(0,0,-currentAngle * .012); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.

  // bottom flame 
  modelMatrix.translate( 0, 0, -1); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix(); 
  gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
// top booster part right 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.rotate(45,1,0,0); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  

modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 
////////////////////////////////////////////////
// rocket booster left
 modelMatrix.translate(-1,0,0.9);
 modelMatrix.translate(0,0,currentAngle * 0.009); 
 modelMatrix.rotate(180,0,1,0);
 modelMatrix.scale(0.35,0.35,0.35); 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.

  pushMatrix(modelMatrix); 

  // top flame
  gl.uniform3f(u_Ke, materialc.emissive[0], materialc.emissive[1], materialc.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialc.ambient[0], materialc.ambient[1], materialc.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialc.diffuse[0], materialc.diffuse[1], materialc.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialc.specular[0], materialc.specular[1], materialc.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialc.shiny); 

modelMatrix.translate( 0, 0, -.32); 
modelMatrix.scale(1.2,1.2,1.2); 
modelMatrix.translate(0,0,-currentAngle * .012); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.

  // bottom flame 
  modelMatrix.translate( 0, 0, -1); // 'set' means DISCARD old matrix,
                          // to match WebGL display canvas. 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix(); 

// top booster part right 
  gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.rotate(45,1,0,0); 
//modelMatrix.scale(0.8,0.8,0.9); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  
modelMatrix = popMatrix(); 
pushMatrix(modelMatrix);
////////////////////////////////////
// rocket booster back
 modelMatrix.translate(0,1,0.9);
  modelMatrix.translate(0,0,currentAngle * 0.009); 
 modelMatrix.rotate(180,0,1,0);
 modelMatrix.scale(0.35,0.35,0.35); 
 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                 RboosterBotStart/floatsPerVertex,  // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.

pushMatrix(modelMatrix); 

// top flame
  gl.uniform3f(u_Ke, materialc.emissive[0], materialc.emissive[1], materialc.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialc.ambient[0], materialc.ambient[1], materialc.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialc.diffuse[0], materialc.diffuse[1], materialc.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialc.specular[0], materialc.specular[1], materialc.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialc.shiny); 

modelMatrix.translate( 0, 0, -.32); 
modelMatrix.scale(1.2,1.2,1.2); 
modelMatrix.translate(0,0,-currentAngle * .012); 
 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.
  // bottom flame 
  modelMatrix.translate( 0, 0, -1); // 'set' means DISCARD old matrix,
                          // to match WebGL display canvas. 

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.

  modelMatrix = popMatrix(); 

// top booster part right 
gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.rotate(45,1,0,0); 
//modelMatrix.scale(0.8,0.8,0.9); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); // draw this many vertices.
  
modelMatrix = popMatrix(); 

/////////////////////////////////////////////
gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
// rocket booster front
 modelMatrix.translate(0,-1,.9);
 modelMatrix.translate(0,0,currentAngle * 0.009); 
 modelMatrix.rotate(180,0,1,0);
 modelMatrix.scale(0.35,0.35,0.35); 
 
 normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
      // Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterBotStart/floatsPerVertex, // start at this vertex number, and
                RboosterBotVerts.length/floatsPerVertex); // draw this many vertices.
  pushMatrix(modelMatrix); 

  // top flame
  gl.uniform3f(u_Ke, materialc.emissive[0], materialc.emissive[1], materialc.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialc.ambient[0], materialc.ambient[1], materialc.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialc.diffuse[0], materialc.diffuse[1], materialc.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialc.specular[0], materialc.specular[1], materialc.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialc.shiny); 

modelMatrix.translate( 0, 0, -.32); 
modelMatrix.scale(1.2,1.2,1.2); 
modelMatrix.translate(0,0,-currentAngle * .012); 
 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                redStart/floatsPerVertex, // start at this vertex number, and 
                redVerts.length/floatsPerVertex); // draw this many vertices.
  // bottom flame 
  modelMatrix.translate( 0, 0, -1); // 'set' means DISCARD old matrix,
                          // to match WebGL display canvas. 

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RtopStart/floatsPerVertex, // start at this vertex number, and
                RtopVerts.length/floatsPerVertex);  // draw this many vertices.


  modelMatrix = popMatrix(); 
  gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
// top booster part right 
modelMatrix.translate( 0, 0, 1); 
modelMatrix.rotate(45,1,0,0); 
//modelMatrix.scale(0.8,0.8,0.9); 
normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);

      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                RboosterTopStart/floatsPerVertex, // start at this vertex number, and 
                RboosterTopVerts.length/floatsPerVertex); 

modelMatrix = popMatrix(); 


/////////////////////--------------------------------///////////////////////////////////
  //--------------------- Bird--------------------------------------------------
  ////////////////////////////////////////////////////////////////////////////////////////
gl.uniform3f(u_Ke, materialr.emissive[0], materialr.emissive[1], materialr.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialr.ambient[0], materialr.ambient[1], materialr.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialr.diffuse[0], materialr.diffuse[1], materialr.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialr.specular[0], materialr.specular[1], materialr.specular[2]);        // Ks specular
    gl.uniform1i(u_Kshiny,materialr.shiny); 
      //--------Draw Head
  modelMatrix.translate( 1.0, 1.5, 2.0); // 'set' means DISCARD old matrix,
  modelMatrix.scale(.4,.4,.4); 
  modelMatrix.rotate(60,0,1,0);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BirdsphStart/floatsPerVertex, // start at this vertex number, and 
                BirdsphereVerts.length/floatsPerVertex);  // draw this many vertices.

pushMatrix(modelMatrix);

   //--------Draw Eye 
   gl.uniform3f(u_Ke, materialbp.emissive[0], materialbp.emissive[1], materialbp.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialbp.ambient[0], materialbp.ambient[1], materialbp.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialbp.diffuse[0], materialbp.diffuse[1], materialbp.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialbp.specular[0], materialbp.specular[1], materialbp.specular[2]);        // Ks specular
    gl.uniform1i(u_Kshiny,materialbp.shiny); 
  modelMatrix.translate( -0.3, 0.3, 1.0); 
  modelMatrix.scale(0.17, 0.17, 0.17);
  // Pass our current matrix to the vertex shaders:

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 
   //--------Draw Eye 
  modelMatrix.translate( -0.3, 0.3, -1.0);                  
  modelMatrix.scale(0.17, 0.17, 0.17);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                eyeStart/floatsPerVertex, // start at this vertex number, and 
                eyeVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 

gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
 // Draw Beak  
 modelMatrix.translate( -1.1, .18, 0.1);
 modelMatrix.scale(0.34,0.34,0.34);
 modelMatrix.rotate(80,0,1,0);
 modelMatrix.rotate(15,1,0,0);

  modelMatrix.translate(0.7,0,0);

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix,false,modelMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  

 modelMatrix = popMatrix(); 
pushMatrix(modelMatrix); 
 // Draw beak: moving part 
 modelMatrix.translate( -1.1, .4, 0.1);
 modelMatrix.scale(0.34,0.34,0.34);
 modelMatrix.rotate(80,0,1,0);
 modelMatrix.rotate(15,1,0,0);

 modelMatrix.rotate(currentAngle * .6, 1, 0, 0);  // spin around y axis.
  modelMatrix.translate(0.7,0,0);

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
 gl.uniformMatrix4fv(u_modelMatrix,false,modelMatrix.elements);
 gl.drawArrays(gl.TRIANGLE_STRIP, (beakStart)/floatsPerVertex, beakVerts.length/floatsPerVertex);  

modelMatrix = popMatrix(); 
  //--------Draw Body
  gl.uniform3f(u_Ke, materialr.emissive[0], materialr.emissive[1], materialr.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialr.ambient[0], materialr.ambient[1], materialr.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialr.diffuse[0], materialr.diffuse[1], materialr.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialr.specular[0], materialr.specular[1], materialr.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialr.shiny); 
  modelMatrix.translate( 0.8, -2.2, 0); 
  modelMatrix.scale(1.7,1.7,1.7);             
  modelMatrix.translate(.3,0,0.1)
  // Pass our current matrix to the vertex shaders:

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                BirdsphStart/floatsPerVertex, // start at this vertex number, and 
                BirdsphereVerts.length/floatsPerVertex);  // draw this many vertices.

  //-------Draw tail 
   gl.uniform3f(u_Ks, 0, 0, 0); 
  modelMatrix.translate(1,-0.6, -0.4); 
  modelMatrix.rotate(-90, 0,1,0);
  modelMatrix.translate(0.4,0.6,0.1);
  // Pass our current matrix to the vertex shaders:

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                tailStart/floatsPerVertex, // start at this vertex number, and
                tailVerts.length/floatsPerVertex);  // draw this many vertices.


pushMatrix(modelMatrix); 
gl.uniform3f(u_Ke, materialb.emissive[0], materialb.emissive[1], materialb.emissive[2]);        // Ke emissive
  gl.uniform3f(u_Ka, materialb.ambient[0], materialb.ambient[1], materialb.ambient[2]);        // Ka ambient
  gl.uniform3f(u_Kd, materialb.diffuse[0], materialb.diffuse[1], materialb.diffuse[2]);        // Kd diffuse
  gl.uniform3f(u_Ks, materialb.specular[0], materialb.specular[1], materialb.specular[2]);        // Ks specular
   gl.uniform1i(u_Kshiny,materialb.shiny); 
////JOINTED LEGS by successively moving drawing axes /////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

  //--------Draw Upper Leg: left
  modelMatrix.translate(0.2, -1.1, 1.1); 
  modelMatrix.scale(0.4,0.4,0.4);             
  modelMatrix.rotate(90,1,0,0);
  modelMatrix.rotate(currentAngle,1,0,0); 

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw Lower Leg left
  modelMatrix.translate(0,0.39,1.8);
  modelMatrix.rotate(150,1,0,0);
  modelMatrix.rotate(currentAngle * 0.1,1,0,0); 

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix.translate(-.5,.2,-.98);

    
      //--------Draw top Claw part1: left
  modelMatrix.rotate(0,1,0,0);    
 modelMatrix.rotate(70,0,1,0);
 modelMatrix.rotate(90,0,0,1);  
 modelMatrix.rotate(currentAngle,0,0,1); 
  modelMatrix.scale(0.4,0.4,0.4);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.


pushMatrix(modelMatrix); 
 //--------Draw top Claw part2: left
 modelMatrix.translate(-0.6,0,0.2);
modelMatrix.rotate(40,0,1,0.4);
modelMatrix.rotate(currentAngle,0,0,1); 

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 
  
 //--------Draw top Claw part3: left
 modelMatrix.translate(-1.05,-0.2,.7);
    
modelMatrix.rotate(80,0,1,0.4);
modelMatrix.rotate(currentAngle,0,0,1); 

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 

  //--------Draw Upper Leg: right
  modelMatrix.translate(0, -1.1, 0.8); 
  modelMatrix.scale(0.4,0.4,0.4);            
  modelMatrix.rotate(90,1,0,0);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

  //--------Draw Lower Leg left
  modelMatrix.translate(0,0.39,1.8);
  modelMatrix.rotate(150,1,0,0);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix.translate(-0.2,.3,-1);

      //--------Draw top Claw part1: left
  modelMatrix.rotate(0,1,0,0);    
 modelMatrix.rotate(70,0,1,0);
 modelMatrix.rotate(90,0,0,1);  
  modelMatrix.scale(0.4,0.4,0.4);

  normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.


pushMatrix(modelMatrix); 
 //--------Draw top Claw part2: left
 modelMatrix.translate(-0.6,0,0.2);
    
modelMatrix.rotate(40,0,1,0.4);

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 
  
 //--------Draw top Claw part3: left
 modelMatrix.translate(-1.05,-0.2,.7);
    
modelMatrix.rotate(80,0,1,0.4);

normalMatrix.setInverseOf(modelMatrix);  
normalMatrix.transpose();  
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                legStart/floatsPerVertex, // start at this vertex number, and
                legVerts.length/floatsPerVertex); // draw this many vertices.

modelMatrix = popMatrix(); 
  
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


function winResize(u_modelMatrix, u_MvpMatrix) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

  var nuCanvas = document.getElementById('webgl');  // get current canvas
  var nuGL = getWebGLContext(nuCanvas);             // and context:

  //Report our current browser-window contents:

//  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);   
// console.log('Browser window: innerWidth,innerHeight=', 
  //                              innerWidth, innerHeight); // http://www.w3schools.com/jsref/obj_window.asp

 
  nuCanvas.width = innerWidth;                                         
  nuCanvas.height = innerHeight;   

  draw(nuGL, u_modelMatrix, u_MvpMatrix);  

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