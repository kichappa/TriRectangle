import React, { useState, useRef, useEffect } from 'react';
import computeRectangle from '../js/glCompute.js';
import renderCanvas from '../js/glDraw.js';

const pointCentre = (vertex) => {
  let centre = {
    x: vertex.topleftPos.x + vertex.containerSize[0] / 2,
    y: vertex.topleftPos.y + vertex.containerSize[1] / 2,
  };
  return centre;
};

const getCVerts = (vertices, set) => {
  let cVerts = new Array(vertices.length);
  for (let i in vertices) {
    if (vertices[i].size) {
      let centre = pointCentre(vertices[i]);
      cVerts[i] = {
        x: centre.x,
        y: centre.y,
        neighbours: vertices[i].neighbours,
        connectingMode: vertices[i].connectingMode,
      };
    }
  }
  return cVerts;
};
const Canvas = ({ id, cVerts }) => {
  // const [points, setPoints] = useState([...getCVerts(cVerts, false)]);
  // console.log(points);
  const [canvas] = useState(useRef(null));
  const setup = useRef(null);
  //     if (!canvas.current.getContext("webgl2")) {
  //         console.log("WebGL2 not available, using CPU.");
  //         var ctx = canvas.current.getContext("2d");
  //         const imageData = ctx.createImageData(
  //             canvas.current.width,
  //             canvas.current.height
  //         );
  //         var imDataLength = imageData.data.length;
  //         // Calling worker
  //         worker.terminate();
  //         worker = new window.Worker("./gradientWorker.js");
  //         worker.postMessage({
  //             imageData: imageData,
  //             points: points,
  //             canvas: {
  //                 width: canvas.current.width,
  //                 height: canvas.current.height,
  //             },
  //         });
  //         worker.onerror = (err) => {
  //             console.log("error", err);
  //         };
  //         worker.onmessage = (e) => {
  //             if (imDataLength === e.data.imageData.data.length) {
  //                 window.requestAnimationFrame(() => draw(e.data.imageData));
  //             }
  //         };
  //     } else {
  //         window.requestAnimationFrame(() =>
  //             renderGradient(points, canvas.current)
  //         );
  //     }
  //

  function render(canvas_ref, points, mouse) {
    window.requestAnimationFrame(() => {
      // if (setup.current == null)
      //   setup.current = renderCanvas(
      //     setup.current,
      //     canvas_ref.current,
      //     points,
      //     mouse
      //   );
      // else
      renderCanvas(null, canvas_ref.current, points, mouse, 5);
    });
  }
  useEffect(() => {
    // console.log('Hello');
    render(canvas, getCVerts(cVerts, false), 0);
  }, [cVerts]);
  useEffect(() => {
    // console.log('Hello 2');
    if (!canvas.current.getContext('webgl2')) {
      alert(
        'WebGL not available in this browser/platform. Renders may be slower.'
      );
    } else {
      render(canvas, getCVerts(cVerts, false), 0);
    }
  }, []);
  return <canvas id={id} ref={canvas} />;
};

export default Canvas;
