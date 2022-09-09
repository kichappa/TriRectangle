import React from 'react';
import Point from './Point';
import { useEffect } from 'react';

const Points = ({ points, onRender }) => {
  // console.log(points);
  useEffect(() => {
    onRender();
  });
  var Points = [];
  try {
    for (let i in points) {
      // console.log(i, points.length - 1);
      // if (i == points.length - 1) continue;
      Points.push(
        <Point
          points={points}
          index={i}
          // onChangeColor={onChangeColor}
          // onPickerButton={onPickerButton}
        />
      );
    }
  } catch {
    console.log('error occured');
  }
  return Points;
};

export default Points;
