MyMath = {};
MyMath.clamp = function(a, min, max){
  return Math.min(max, Math.max(min, a));
}
MyMath.sign = function(a){
  if (a == 0){
    return 0;
  }
  else if (a > 0){
    return 1;
  }
  return -1;
}
//return equivalent angle from -180 to 180 degrees
// or -pi to pi radians
MyMath.anglify = function(ang){
  return ((ang) % (2 * Math.PI) + 3 * Math.PI ) % (2 * Math.PI) - Math.PI;
}