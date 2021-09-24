var Vector = class {
  constructor(x, y){
    this.x = x;
    this.y = y;
  }
  projX(){
    return new Vector(this.x, 0);
  }
  projY(){
    return new Vector(0, this.y);
  }
  floor(){
    return new Vector(Math.floor(this.x), Math.floor(this.y));
  }
  rotate(theta) {
    return new Vector(this.x * Math.cos(theta) - this.y * Math.sin(theta), this.y * Math.cos(theta) + this.x * Math.sin(theta));
  }
  dot(o){
    return o.x * this.x + o.y * this.y;
  }
  cross(o){
    return this.x * o.y - o.x * this.y;
  }
  crossZ(c){
    return new Vector(c * this.y, -c * this.x);
  }
  rCrossZ(c){
    return new Vector(-c * this.y, c * this.x);
  }
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  abs(){
    return new Vector(Math.abs(this.x), Math.abs(this.y));
  }
  normalize() {
    var mag = this.magnitude();
    if (mag != 0){
      return this.multiply(1 / this.magnitude());
    }
    return new Vector(1,0);
  }
  normal(to){
    return this.subtract(to).normalize().rotate(-Math.PI/2);
  }
  multiplyV(v){
    return new Vector(this.x * v.x - this.y * v.y, this.x * v.y + this.y * v.x);
  }
  multiply(n) {
    return new Vector(this.x * n, this.y * n);
  }
  ang() {
    return Math.atan2(this.y, this.x);
  }
  add(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }
  subtract(v) {
    return new Vector(this.x - v.x, this.y - v.y);
  }
  distanceTo(v) {
    return (this.subtract(v)).magnitude();
  }
  angTo(v) {
    return (this.subtract(v)).ang();
  }
  onSegment(v1, v2) {
    var buffer = 0.001;
    return Math.min(v1.x, v2.x) - buffer <= this.x && this.x <= Math.max(v1.x, v2.x) + buffer && Math.min(v1.y, v2.y) - buffer <= this.y && this.y <= Math.max(v1.y, v2.y) + buffer;
  }
  closestToLine(v1, v2) {
    var x1 = v1.x;
    var y1 = v1.y;
    var x2 = v2.x;
    var y2 = v2.y;

    var e1x = x2 - x1;
    var e1y = y2 - y1;
    var area = e1x * e1x + e1y * e1y;
    var e2x = this.x - x1;
    var e2y = this.y - y1;
    var val = e1x * e2x + e1y * e2y;
    var on = (val > 0 && val < area);

    var lenE1 = Math.sqrt(e1x * e1x + e1y * e1y);
    var lenE2 = Math.sqrt(e2x * e2x + e2y * e2y);
    var cos = val / (lenE1 * lenE2);

    var projLen = cos * lenE2;
    var px = x1 + (projLen * e1x) / lenE1;
    var py = y1 + (projLen * e1y) / lenE1;
    return new Vector(px, py);
  }
  orientation(v1, v2) {
    var epsilon = 0.001;
    var val = (v2.y - v1.y) * (this.x - v2.x) - (v2.x - v1.x) * (this.y - v2.y);
    if (Math.abs(val) < epsilon) {
      return 0;
    }
    return (val > 0 ? 1 : -1);
  }
  copy() {
    return new Vector(this.x, this.y);
  }
};