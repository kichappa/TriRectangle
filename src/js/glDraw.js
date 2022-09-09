import {
  createProgramInfo,
  createBufferInfoFromArrays,
  resizeCanvasToDisplaySize,
  drawBufferInfo,
  setUniforms,
  setBuffersAndAttributes,
  createTextures,
  createTexture,
  createFramebufferInfo,
  bindFramebufferInfo,
} from 'twgl.js';

var WebGLDebugUtil = require('webgl-debug');

const renderCanvas = (setup, canvas, points, radius, thickness) => {
  // console.log(countEdges(points));
  // console.log(getEdges(points));
  // console.log(points);
  const getVertexShader = () => {
    const vs = `#version 300 es
      in vec2 a_position;
      precision highp float;    
      uniform vec2 u_resolution;    
      out vec4 v_texPosition;    
      void main(){
        gl_Position = vec4(a_position/u_resolution * 2.-1., 0, 1);
      }`;
    return vs;
  };
  const getFragmentShader = (length) => {
    const fs = `#version 300 es
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_points[${length}];
      uniform float u_thickness;
      uniform vec2 u_resolution; 
      uniform bool u_init;

      out vec4 outColor;
      bool shouldIColour(vec2 v_position){
        for (int i = 0; i < ${length}; i++){
          if(distance(vec2(v_position.x, u_resolution.y-v_position.y), u_points[i])<=u_thickness) return true;
        }
        return false;
      }
      void main(){
        outColor = vec4(0., 0., 0., 0.);
        if(shouldIColour(gl_FragCoord.xy)){
          outColor = vec4(1.0, 1.0, 1.0, 1.0);
        }
      }
  
      `;
    return fs;
  };
  let shouldIReturnASetup = false;
  if (setup == null) {
    // console.log('Hi');
    setup = {};
    shouldIReturnASetup = true;
    setup.gl = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    const ctx = WebGLDebugUtil.makeDebugContext(setup.gl);
    // resizing canvas context to canvas width set by CSS
    canvas.width = canvas.offsetWidth * 1;
    canvas.height = canvas.offsetHeight * 1;
    console.log(canvas.width, canvas.height);

    setup.programInfo = createProgramInfo(setup.gl, [
      getVertexShader(),
      getFragmentShader(points.length),
    ]);
  }
  const arrays = {
    a_position: {
      numComponents: 2,
      // prettier-ignore
      data: [
                       0, canvas.height, 
            canvas.width, 0, 
            canvas.width, canvas.height, 
                       0, 0, 
            canvas.width, 0, 
                       0, canvas.height
        ]
    },
  };
  const bufferInfo = createBufferInfoFromArrays(setup.gl, arrays);
  // if (shouldIReturnASetup) return setup;

  resizeCanvasToDisplaySize(setup.gl.canvas);
  setup.gl.viewport(0, 0, setup.gl.canvas.width, setup.gl.canvas.height);
  if (shouldIReturnASetup) setup.gl.useProgram(setup.programInfo.program);
  const uniforms = {
    u_resolution: [canvas.width, canvas.height],
    u_points: points ? getXY(points).flat() : [100, 100],
    u_thickness: thickness,
    u_init: shouldIReturnASetup,
  };
  setBuffersAndAttributes(setup.gl, setup.programInfo, bufferInfo);
  setUniforms(setup.programInfo, uniforms);
  setup.gl.viewport(0, 0, setup.gl.canvas.width, setup.gl.canvas.height);
  setup.gl.clearColor(0, 0, 0, 0);
  setup.gl.clear(setup.gl.COLOR_BUFFER_BIT | setup.gl.DEPTH_BUFFER_BIT);
  drawBufferInfo(setup.gl, bufferInfo, setup.gl.TRIANGLES);
  if (shouldIReturnASetup) return setup;
};

const getXY = (points) => {
  let XYs = [];
  for (let i in points) {
    XYs[i] = [points[i].x, points[i].y];
  }
  return XYs;
};
const countEdges = (points) => {
  let nEdges = 0;
  for (let i in points) {
    nEdges += points[i].neighbours.length;
  }
  return nEdges / 2;
};
const includesArray = (data, arr) => {
  return data.some(
    (e) => Array.isArray(e) && e.every((o, i) => Object.is(arr[i], o))
  );
};
const getEdges = (points) => {
  let edges = [];
  for (let i in points) {
    for (let n in points[i].neighbours) {
      let edge = [Number(i), Number(points[i].neighbours[n])].sort((a, b) => {
        if (b > a) return -1;
        else if (a > b) return 1;
        else return 0;
      });
      if (!includesArray(edges, edge)) edges.push(edge);
    }
  }
  return edges;
};

export default renderCanvas;
