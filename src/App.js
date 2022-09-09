import React, { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import Points from './components/Points';
import { FaPlus, FaMinus, FaUndoAlt, FaRedoAlt } from 'react-icons/fa';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { getMouseEventOptions } from '@testing-library/user-event/dist/utils';
import { Buffer } from 'buffer';
// The point size is 36. Sorry for not defining a global variable for that.
function App() {
  window.Buffer = Buffer;
  /**
   * @type {boolean} Potential change in the system is stored here.
   * Any function that changes the system changes this, and useEffect looks for this flagged to push to undo.
   */
  const [potChange, setPotChange] = useState(false);
  const [renderPage, setRenderPage] = useState(false);
  /**
   * @type {window.location} The URL of the current window.
   * Used to check for re-render requirement and prevent repeatitive pushState to the browser.
   */
  const [url, setUrl] = useState(window.location.origin);
  const location = useLocation();
  /** @type {object} Stores various mouse states */
  const [mouse, setMouse] = useState({
    /** @type {boolean} Is the mouse down or not? */
    down: false,
    /** @type {boolean} Not sure what went through my mind */
    stateSaved: false,
    /** @type {object} The clicked object */
    clicked: {
      /** @type {boolean} Is the mouse down or not? */
      status: false,
      /** @type {BigInteger} Index of the vertex that is in clicked mode. */
      index: undefined,
      /** @type {React.MutableRefObject} Reference of the vertex that is in clicked mode. */
      obj: undefined,
    },
    /** @type {boolean} Is radius of some vertex being shown or not? */
    // connectingMode: false, //rename to connectingMode??
    /** @type {boolean} Okay, this is like mouse.down, but it says if the mouse movement is actually an interaction with the vertices. */
    active: false,
    /** @type {object} The resizing object */
    // resizing: {
    //   /** @type {boolean} Is some vertex being resized or not? */
    //   mode: false,
    //   /** @type {object} ?? The start point of the resize event. */
    //   start: false,
    // },
    /** @type {object} The mouse target object. */
    target: {
      /** @type {React.MutableRefObject} Reference of the target vertex */
      obj: undefined,
      /** @type {BigInteger} Index of the vertex that is targetted. */
      index: undefined,
      /** @type {object} ?? Initial position of the targetted vertex before mouse events. */
      initialPosition: {
        x: 0,
        y: 0,
      },
      /** @type {BigInteger} Initial radius of the vertex that is targetted. */
      initialRadius: undefined,
    },
    /** @type {object} The mouse positions object */
    pos: {
      /** @type {object} XY coordinates of the mouse at the start of mouse events. */
      start: {
        x: 0,
        y: 0,
      },
      /** @type {object} XY coordinates of the mouse in the middle (admist) of mouse events. */
      middle: {
        x: 0,
        y: 0,
      },
      /** @type {object} XY coordinates of the mouse at the end of mouse events. */
      end: {
        x: 0,
        y: 0,
      },
      /** @type {object} Function to return the above coordinates as a [x, y] array. */
      getXY: function (from) {
        if (from === 'start') return [this.start.x, this.start.y];
        else if (from === 'middle') return [this.middle.x, this.middle.y];
        else if (from === 'end') return [this.end.x, this.end.y];
      },
    },
  });
  /**
   * @type {Array} DOM stripped version of vertices that can be pushed to undo redo stacks.
   * Maintained to push to undo redo without hassle and for comparison before any push.
   */
  const [view, setView] = useState([]);
  const [undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);
  /**
   * @type {boolean} Was an undo/redo button pressed recently?
   */
  const [undoRedo, setUndoRedo] = useState(false);
  let paramsHash = new URLSearchParams(window.location.search);
  let params = {};
  let initVerts;
  try {
    // console.log('params try');
    for (let pair of paramsHash.entries()) {
      params[pair[0]] = JSON.parse(Buffer.from(pair[1], 'base64').toString());
      // try {
      //   params[pair[0]] = JSON.parse(pair[1]);
      // } catch {
      //   params[pair[0]] = pair[1]
      // }
    }
    if ('points' in params) initVerts = params['points'];
    // 'points' param-pair is somehow missing in params, force trip an error to escape in to the catch sequence.
    else throw new Error('force trip');
  } catch {
    console.log('params error');
    initVerts = [
      {
        /** @type {React.MutableRefObject} The reference to the `dragItem` DOM item. */
        pointRef: null,
        /** @type {React.MutableRefObject} The reference to the `dragIContainer` DOM item. */
        containerRef: null,
        /** @type {{x:number, y:number}} controls the location of the `dragIContainer`, relative to the `outerContainer`. */
        topleftPos: { x: 50, y: 50 },
        /** @type {Array} The CSS size of `dragItem`. <possibly> they are undefined in the init so that CSS can control the size irrespective of the code. </possibly> */
        size: undefined,
        /** @type {boolean} Is this vertex in connectingMode? (Connect to neighbours) */
        connectingMode: false,
        /** @type {Array} The CSS size of `div` inside `dragIContainer`. */
        containerSize: undefined,
        /** @type {Array} The indices of neighbouring vertices of this vertex. Usually, the size of this is 2 (unless some new idea comes up in my mind). */
        neighbours: [],
      },
    ];
  }
  /**
   * @type {Array} The functional array driving Vertices, Point, cVerts, view and everything else. The last vertex is the mouse vertex (unrendered); This vertex is a place holder that is used when a vertex is in connectingMode.
   */
  const [vertices, setVertices] = useState(initVerts);
  /**
   * Function to convert `vertices[]` array to `cVerts[]` state that the renderer expects.
   *
   * @param {boolean} set Set the cVerts state or not?
   * @return {{x, y, colour:object colourArr:Array, radius: number}[]} cVerts if not `set`.
   */

  const [cVerts, setCVerts] = useState([]);
  /**
   * Function to add a new vertex with random colour and position. The function sets the `vertices[]` state and flags `potChange` at exit.
   */
  const addVert = () => {
    let topleftPos = { x: 50, y: 50 };
    if (vertices.length > 0) {
      let boundXY = [
        [0, 0],
        [0, 0],
      ];
      boundXY[1] = [
        boundXY[0][0] +
          vertices[0].containerRef.current.parentNode.clientWidth -
          vertices[0].size[0],
        boundXY[0][1] +
          vertices[0].containerRef.current.parentNode.clientHeight -
          vertices[0].size[1],
      ];
      let x, y;
      x = Math.floor(Math.random() * boundXY[1][0] + boundXY[0][0]);
      y = Math.floor(Math.random() * boundXY[1][1] + boundXY[0][1]);
      topleftPos = { x: x, y: y };
    }
    const newVert = {
      /** @type {React.MutableRefObject} The reference to the `dragItem` DOM item. */
      pointRef: null,
      /** @type {React.MutableRefObject} The reference to the `dragIContainer` DOM item. */
      containerRef: null,
      /** @type {{x:number, y:number}} controls the location of the `dragIContainer`, relative to the `outerContainer`. */
      topleftPos: topleftPos,
      /** @type {Array} The CSS size of `dragItem`. <possibly> they are undefined in the init so that CSS can control the size irrespective of the code. </possibly> */
      size: undefined,
      /** @type {boolean} Is this vertex in connectingMode? (Connect to neighbours) */
      connectingMode: false,
      /** @type {Array} The CSS size of `div` inside `dragIContainer`. */
      containerSize: undefined,
      /** @type {Array} The indices of neighbouring vertices of this vertex. Usually, the size of this is 2 (unless some new idea comes up in my mind). */
      neighbours: [],
    };

    setVertices([...vertices, newVert]);
    // setPotChange(true);
    setRenderPage(true);
  };
  /**
   * Function to remove the vertex of specified index. The function sets the `vertices[]` state and flags `potChange` at exit.
   *
   * @param {number} index the index of the vertex to be removed.
   */
  const removeVert = (index) => {
    if (index === -1) {
      index = vertices.length - 1;
    }
    // console.log('Removing point with key ' + index);
    let newVerts = vertices;
    newVerts.splice(index, 1);
    setVertices([...newVerts]);
    // setPotChange(true);
    setRenderPage(true);
    // console.log('New points are ', vertices);
  };
  /**
   * Pointer down event handler that enables modification of DragItems.
   *
   * @param {MouseEvent} e The mouse event letiable.
   */
  const dragStart = (e) => {
    mouse.down = true; // pointer is down
    // acquire pointer target
    mouse.target.obj = document.elementFromPoint(
      ...objToList(getPointerLocation(e))
    );
    // index of the target in the vertices[] array
    let index = getIndex(mouse.target.obj);
    // console.log(index);
    if (index) mouse.target.index = index;
    else mouse.target.index = undefined;

    // Unhide hideButtons that were hidden previously when target is not a dragItem
    if (!mouse.target.obj.classList.contains('vertex')) {
      hideButton(false, 0, '0.3s');
    }

    // moving a point or making it clicked (highlighted)...
    // if (
    //   // if pointerdown on the a dragItem and...
    //   mouse.target.obj.classList.contains('vertex') &&
    //   (!mouse.clicked.status || // if none is clicked, ...
    //   (mouse.clicked.status && // or clicked item is not pointerdown item...
    //     mouse.clicked.index !== mouse.target.index) || // or radius is not being modified (or shown).
    //     !mouse.connectingMode)
    // )
    if (index) {
      // console.log('hello vertex');
      mouse.pos.start = getPointerLocation(e); // getting pointer location
      // console.log('Going to move');
      // this if is just to catch the error "vertices[index] is undefined" that appears for some fucking reason.
      // save the initial location of the target before it is moved.
      mouse.target.init = {
        x: vertices[mouse.target.index].topleftPos.x - mouse.pos.start.x,
        y: vertices[mouse.target.index].topleftPos.y - mouse.pos.start.y,
      };
      // mouse.active = true; // set mouse.active to indicate some point is starting to be moved (technically moved is set in drag where the mouse movement is checked to be isClick() or not).
      // set mouse to be active and bring it to top in CSS.
      vertices[mouse.target.index].tags = { active: true };
      vertices[mouse.target.index].containerRef.current.style.zIndex = 2;
    }

    // start resizing the clicked (highlighted) point
    // else if (
    //   mouse.clicked.status && // some item is clicked...
    //   mouse.clicked.index === mouse.target.index && // and clicked item is pointerdown item...
    //   vertices[mouse.clicked.index]?.tags?.connectingMode // and clicked item is in connectingMode mode, not colour picker mode.
    // ) {
    //   // console.log('Going to resize');
    //   // console.log(mouse.clicked.obj, mouse.target.obj);
    //   // console.log(mouse);
    //   mouse.resizing.mode = true; // enable resizing mode, but not start it yet.
    //   mouse.connectingMode = true; // show it's radius
    //   mouse.target.initialRadius = vertices[mouse.clicked.index].radius; // set initial radius of the object
    // }
    setMouse(mouse);
    setVertices([...vertices]);
    setRenderPage(true);
  };
  const drag = (e) => {
    mouse.pos.middle = getPointerLocation(e);
    // console.log(mouse.pos.middle);
    // console.log(
    //   mouse.down,
    //   !isClick(mouse.pos.start, mouse.pos.middle),
    //   mouse.target.index
    // );
    if (
      mouse.down &&
      !isClick(mouse.pos.start, mouse.pos.middle) &&
      mouse.target.index
    ) {
      mouse.active = true;
      // console.log('follow me, vertex');
      closeVert();
      let index = mouse.target.index;
      if (index) {
        e.preventDefault();
        hideButton(true, 0);
        try {
          vertices[index].containerRef.current.style.zIndex = 2; // bringing item to top
        } catch {}
        let topleftPos = { x: 0, y: 0 }; // saving the position to a letiable (used to bound...)
        topleftPos.x = mouse.pos.middle.x + mouse.target.init.x;
        topleftPos.y = mouse.pos.middle.y + mouse.target.init.y;
        // finding the bounds of the dragPalette element
        // this is done so that the points stay inside
        // the palette even if cursor is outside
        let boundXY = getBounds(index);
        vertices[index].topleftPos.x = Math.max(
          Math.min(topleftPos.x, boundXY[1][0]),
          boundXY[0][0]
        );
        vertices[index].topleftPos.y = Math.max(
          Math.min(topleftPos.y, boundXY[1][1]),
          boundXY[0][1]
        );
      }
      // }
      // // resizing
      // else if (mouse.resizing?.mode) {
      //   if (mouse.clicked.index) {
      //     let r = dist(pointCentre(mouse.clicked.index), {
      //       x: mouse.pos.middle.x - 20,
      //       y: mouse.pos.middle.y - 20,
      //     });
      //     if (mouse.resizing.start) {
      //       vertices[mouse.clicked.index].radius = Math.max(Math.abs(r) - 25, 0);
      //     } else if (r - 25 >= mouse.target.initialRadius) {
      //       vertices[mouse.clicked.index].tags
      //         ? (vertices[mouse.clicked.index].tags.resizing = true)
      //         : (vertices[mouse.clicked.index].tags = {
      //             resizing: true,
      //           });
      //       mouse.resizing.start = true;
      //     }
      //   }
    } else if (mouse.down && !mouse.active && !mouse.target.index) {
      // console.log('drag 2');
      // console.log('Attempting a new dragStart');
      dragStart(e);
    } else if (mouse.clicked.status) {
      // console.log('drag 3');
      // make mouse point from mouse.clicked.target to pointer
    }
    if (mouse.down) setVertices([...vertices]);
    setMouse(mouse);
    setRenderPage(true);
  };
  const dragEnd = (e) => {
    // e.preventDefault();
    mouse.pos.end = getPointerLocation(e);
    let index = mouse.target.index;
    if (index) {
      let target = document.elementFromPoint(e.clientX, e.clientY);
      let tIndex = getIndex(target);
      // let target = mouse.target.obj;
      // a vertex was being moved
      console.log(
        '(',
        target.classList.contains('vertex'),
        '||',
        target.classList.contains('dragIWeight'),
        ') &&',
        isClick(mouse.pos.start, mouse.pos.end),
        '&& (',
        !mouse.clicked.status,
        '|| (',
        mouse.clicked.status,
        '&&',
        mouse.clicked.index === tIndex,
        ')) == ',
        (target.classList.contains('vertex') ||
          target.classList.contains('dragIWeight')) &&
          isClick(mouse.pos.start, mouse.pos.end) &&
          (!mouse.clicked.status ||
            (mouse.clicked.status && mouse.clicked.index === tIndex))
      );
      if (mouse.active) {
        hideButton(false);
        closeVert();
        mouse.active = false;
        try {
          vertices[index].containerRef.current.style.zIndex = 1;
        } catch {}
        mouse.target.obj = undefined;
        mouse.target.index = undefined;
      } else if (
        // it is a click on a vertex and no vertex is presently clicked or clicked vertices are the same
        (target.classList.contains('vertex') ||
          target.classList.contains('dragIWeight')) &&
        isClick(mouse.pos.start, mouse.pos.end) &&
        (!mouse.clicked.status ||
          (mouse.clicked.status && mouse.clicked.index === tIndex))
      ) {
        // console.log('dragEnd 1,2');
        try {
          vertices[index].containerRef.current.style.zIndex = vertices[index]
            .clicked
            ? 1
            : 2;
        } catch {}
        vertices[index].connectingMode = !vertices[index].connectingMode;
        if (mouse.clicked.status) {
          mouse.clicked.obj = undefined;
          mouse.clicked.index = undefined;
          closeVert();
        } else {
          mouse.clicked.obj = target;
          mouse.clicked.index = tIndex;
          mouse.clicked.status = !mouse.clicked.status;
        }
      } else if (
        (target.classList.contains('vertex') ||
          target.classList.contains('dragIWeight')) &&
        isClick(mouse.pos.start, mouse.pos.end) &&
        mouse.clicked.status &&
        mouse.clicked.index !== tIndex
      ) {
        let neighbours = isNeighbour(vertices, mouse.clicked.index, tIndex);
        if (neighbours[0] === 1) {
          vertices[mouse.clicked.index].neighbours.splice(neighbours[1], 1);
          vertices[tIndex].neighbours.splice(neighbours[2], 1);
        } else if (neighbours[0] === -1) {
          vertices[mouse.clicked.index].neighbours.push(Number(tIndex));
          vertices[tIndex].neighbours.push(Number(mouse.clicked.index));
        } else if (neighbours[1] === -1)
          vertices[tIndex].neighbours.splice(neighbours[2], 1);
        else if (neighbours[2] === -1)
          vertices[mouse.clicked.index].neighbours.splice(neighbours[1], 1);
        closeVert();
        // // console.log('dragEnd 1,3');
        // // if (
        // //   // Nothing is already clicked or something is already clicked and the new click target is different.
        // //   !mouse.clicked.status ||
        // //   (mouse.clicked.obj && mouse.clicked.obj === target)
        // // ) {
        // try {
        //   vertices[index].tags = {
        //     clicked: true,
        //     showRadius: true,
        //   };
        // } catch {}
        // mouse.clicked.status = !mouse.clicked.status;
        // if (mouse.clicked.status) {
        //   mouse.clicked.obj = target;
        //   mouse.clicked.index = getIndex(target);
        //   closeVert(mouse.clicked.index);
        // } else closeVert();
        // mouse.connectingMode = !mouse.connectingMode;
        // //    ||
        // //   (mouse.clicked.obj && mouse.clicked.obj !== target)
        // // ) {
        // //   mouse.clicked.status = true;
        // //   mouse.clicked.obj = target;
        // //   mouse.clicked.index = getIndex(target);
        // //   closeVert(mouse.clicked.index);
        // //   mouse.connectingMode = true;
        // //   try {
        // //     vertices[mouse.clicked.index].tags = {
        // //       clicked: true,
        // //       connectingMode: true,
        // //     };
        // //   } catch {}
      }
      // } else if (mouse.resizing.start) {
      //   delete vertices[index].tags.resizing;
      setVertices([...vertices]);
    }
    mouse.down = false;
    // mouse.resizing.mode = false;
    // mouse.resizing.start = false;
    setMouse(mouse);
    // setPotChange(true);
    setRenderPage(true);
  };
  const closeVert = (index = undefined) => {
    // console.log('somebody called closeVert');
    !index && (mouse.clicked.status = false);
    for (let i in vertices) {
      if (index === i) {
        continue;
      }
      if (vertices[i].tags) delete vertices[i].tags;
      vertices[i].containerRef.current.style.zIndex = 1;
      vertices[i].connectingMode = false;
    }
    setVertices(vertices);
  };
  const copyVerts = (state) => {
    let copyState = JSON.parse(JSON.stringify(removeDOMItems(state)));
    return copyState;
  };
  const differentState = (newState, oldState) => {
    let diff =
      JSON.stringify(removeDOMItems(newState)) !=
      JSON.stringify(removeDOMItems(oldState));
    return diff;
  };
  const dist = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };
  const getBounds = (index) => {
    let boundXY = [
      [
        -(vertices[index].containerSize[0] - vertices[index].size[0]) / 2,
        -(vertices[index].containerSize[1] - vertices[index].size[1]) / 2,
      ], // min X, Y
      [0, 0], // max X, Y
    ];
    boundXY[1] = [
      boundXY[0][0] +
        vertices[index].containerRef.current.parentNode.clientWidth -
        vertices[index].size[0], // (- size) because anchor is at top left
      boundXY[0][1] +
        vertices[index].containerRef.current.parentNode.clientHeight -
        vertices[index].size[1],
    ];
    return boundXY;
  };
  const getCVerts = (vertices, set) => {
    // let cVerts = new Array(vertices.length);
    for (let i in vertices) {
      if (vertices[i].size) {
        let centre = pointCentre(i);
        cVerts[i] = {
          x: centre.x,
          y: centre.y,
          neighbours: vertices[i].neighbours,
          connectingMode: vertices[i].connectingMode,
        };
      }
    }
    if (set) {
      // console.log('setting cverts', cVerts);
      setCVerts([...cVerts]);
      // console.log(cVerts);
    } else return cVerts;
  };
  const getIndex = (obj) => {
    for (let i in vertices) {
      if (vertices[i].pointRef.current === obj) {
        return i;
      }
    }
    return undefined;
  };
  const getPointerLocation = (e) => {
    let position = { x: undefined, y: undefined };
    if (e.type.substr(0, 5) === 'touch') {
      position = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      position = { x: e.clientX, y: e.clientY };
    }
    return position;
  };
  async function hideButton(state, timeout, animTime) {
    if (!state && timeout === undefined) timeout = 700;
    if (animTime === undefined) {
      if (state) animTime = '0.15s';
      else animTime = '1s';
    }
    setTimeout(() => {
      let undoButton = document.getElementsByClassName('hideButton');
      for (let k in undoButton) {
        if (undoButton[k].classList)
          if (state) {
            undoButton[k].classList.add('hidden');
            undoButton[
              k
            ].style.transition = `all 0.5s cubic-bezier(0.39, 0.58, 0.57, 1), opacity ${animTime} ease-in-out`;
          } else {
            undoButton[k].classList.remove('hidden');
            undoButton[
              k
            ].style.transition = `all 0.5s cubic-bezier(0.39, 0.58, 0.57, 1), opacity ${animTime} ease-in-out`;
          }
      }
    }, timeout);
  }
  const isClick = (startXY, endXY) => {
    let tol = 10;
    let value = dist(endXY, startXY);
    return value <= tol;
  };
  const isNeighbour = (vertices, v1, v2) => {
    let v21 = vertices[v1].neighbours.findIndex((n) => n === v2);
    let v12 = vertices[v2].neighbours.findIndex((n) => n === v1);
    if (v21 === -1 && v12 === -1) return [-1, -1, -1];
    else if (v21 !== -1 && v12 !== -1) return [1, v21, v12];
    else return [0, v21, v12];
  };
  const mouseToVert = (mouse, vertices) => {
    let mVert = {
      /** @type {React.MutableRefObject} The reference to the `dragItem` DOM item. */
      pointRef: null,
      /** @type {React.MutableRefObject} The reference to the `dragIContainer` DOM item. */
      containerRef: null,
      /** @type {{x:number, y:number}} controls the location of the `dragIContainer`, relative to the `outerContainer`. */
      topleftPos: {
        x:
          mouse.pos.middle.x -
          vertices[vertices.length - 1].size[0] / 2 -
          36 / 2,
        y:
          mouse.pos.middle.y -
          vertices[vertices.length - 1].size[1] / 2 -
          36 / 2,
      },
      /** @type {Array} The CSS size of `dragItem`. <possibly> they are undefined in the init so that CSS can control the size irrespective of the code. </possibly> */
      size: undefined,
      /** @type {Array} The CSS size of `div` inside `dragIContainer`. */
      containerSize: undefined,
      /** @type {Array} The indices of neighbouring vertices of this vertex. Usually, the size of this is 2 (unless some new idea comes up in my mind). */
      neighbours: [],
    };
    // console.log(mVert);
    return mVert;
  };
  const objToList = (obj) => {
    let lst = [];
    for (let key in obj) {
      lst.push(obj[key]);
    }
    return lst;
  };
  const pointCentre = (index) => {
    let centre = {
      x: vertices[index].topleftPos.x + vertices[index].containerSize[0] / 2,
      y: vertices[index].topleftPos.y + vertices[index].containerSize[1] / 2,
    };
    return centre;
  };
  const pushNewURL = ({ state = vertices, push = true } = {}) => {
    let url_query =
      window.location.origin +
      '/?points=' +
      Buffer.from(JSON.stringify(removeDOMItems(state))).toString('base64');
    // let url_query =
    //   window.location.origin +
    //   '/?points=' +
    //   JSON.stringify(removeDOMItems(state));
    // console.log('Pushing new URL');
    // console.log({
    //   'old URL': window.location.href,
    //   'new URL': url_query,
    //   'location state': location,
    // });
    if (window.location.href !== url_query) {
      if (push) window.history.pushState(null, null, url_query);
      else window.history.replaceState(null, null, url_query);
      // } else {
      // console.log('Same URL, ignoring push.');
    }
    setUrl(url_query);
  };
  const pushToView = (state, dontCopyToRedo = false) => {
    if (dontCopyToRedo) {
      let newView = copyVerts(state);
      setView(newView);
    } else if (differentState(state, view)) {
      setUndo([...undo, view]);
      setRedo([]);
      let newView = copyVerts(state);
      setView(newView);
      pushNewURL(state);
    }
  };
  const removeDOMItems = (state) => {
    let minimalState = [];
    for (let i in state) {
      let item = { ...state[i] };
      try {
        item.pointRef = undefined;
        item.containerRef = undefined;
        delete item.tags;
      } catch (error) {
        console.error('Error in removing DOM elements.', error);
      }
      minimalState.push(item);
    }
    return minimalState;
  };
  const undoRedoClicked = (action) => {
    // if (action === 'undo' && undo.length) {
    //   setRedo([...redo, view]);
    //   setVertices(undo[undo.length - 1]);
    //   setUndo(undo.slice(0, undo.length - 1));
    //   setUndoRedo(true);
    //   setPotChange(true);
    //   setRenderPage(true);
    // } else if (action === 'redo' && redo.length) {
    //   setUndo([...undo, view]);
    //   setVertices(redo[redo.length - 1]);
    //   setRedo(redo.slice(0, redo.length - 1));
    //   setUndoRedo(true);
    //   setPotChange(true);
    //   setRenderPage(true);
    // }
    // mouse.down = false;
    // pushNewURL();
  };
  const updateSizes = (vertices) => {
    let update = false;
    for (let i in vertices) {
      if (!vertices[i].size) {
        update = true;
        vertices[i].size = [
          vertices[i].pointRef.current.offsetWidth,
          vertices[i].pointRef.current.offsetHeight,
        ];
        vertices[i].containerSize = [
          vertices[i].pointRef.current.parentNode.parentNode.offsetWidth,
          vertices[i].pointRef.current.parentNode.parentNode.offsetHeight,
        ];
      }
    }
    if (update) setVertices(vertices);
  };
  useEffect(() => {
    // console.log("I'm here");
    if (renderPage) {
      // console.log('renderPage is True');
      try {
        pushNewURL({ push: true });
        getCVerts(vertices, true);
        // console.log(cVerts);
      } catch (err) {
        console.error('Error in rendering page.', err);
      }
      setRenderPage(false);
    }
    // if (potChange) {
    //   pushToView(vertices, undoRedo);
    //   if (undoRedo) setUndoRedo(false);
    //   // setPotChange(false);
    // }
  }, [vertices]);
  useEffect(() => {
    var paramsHash = new URLSearchParams(window.location.search);
    var params = {};
    var reset = false;
    try {
      for (var pair of paramsHash.entries()) {
        params[pair[0]] = JSON.parse(Buffer.from(pair[1], 'base64').toString());
        // try {params[pair[0]] = JSON.parse(pair[1]);}
        // catch {params[pair[0]] = pair[1];}
      }
      // console.log(params);
      if (!('points' in params)) {
        reset = true;
        params['points'] = [
          {
            pointRef: null,
            containerRef: null,
            topleftPos: { x: 50, y: 50 },
            size: undefined,
            connectingMode: false,
            containerSize: undefined,
            neighbours: [],
          },
        ];
      }
      setVertices([...params['points']]);
      // setUndo([...undo, view]);
      // setRedo([]);
      // let newView = copyVerts(params['points']);
      // setView(newView);
      // setUndoRedo(true);
      // setPotChange(true);
      setRenderPage(true);
      pushNewURL({ push: reset });
    } catch (error) {
      console.log('Error occured while catching URL change: \n', error);
    }
  }, [location]);
  useEffect(() => {
    getCVerts(vertices, true);
    setRenderPage(false);
    // pushToView(vertices, true);
    // setPotChange(false);
    hideButton(false, 500);
    if (!('points' in params)) pushNewURL({ push: true });
  }, []);
  return (
    <div
      className="App"
      onPointerDown={(e) => dragStart(e)}
      onPointerMove={(e) => drag(e)}
      onPointerUp={(e) => dragEnd(e)}
    >
      <div id="outerContainer">
        <div id="vertPalette">
          <Canvas id={'gradientPalette'} cVerts={vertices} key={vertices} />
        </div>
        <Points points={vertices} onRender={() => updateSizes(vertices)} />
        <div id="point-manager">
          <button className="button plus hideButton hidden" onClick={addVert}>
            <FaPlus />
          </button>
          <button
            className="button minus hideButton hidden"
            onClick={() => removeVert(-1)}
          >
            <FaMinus />
          </button>
        </div>
        <div id="undo" className="undo-redo undoButton">
          <button
            className="button hideButton hidden"
            onClick={() => {
              undoRedoClicked('undo');
            }}
          >
            <FaUndoAlt className="undoButton" />
          </button>
        </div>
        <div id="redo" className="undo-redo">
          <button
            className="button hideButton hidden"
            onClick={() => {
              undoRedoClicked('redo');
            }}
          >
            <FaRedoAlt />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
