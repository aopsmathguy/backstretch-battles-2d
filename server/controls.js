const { Vector } = require('./vector.js');
var UserControls = class{
  keys;
  mouse;
  mouseDown;
  constructor(){
    this.keys = {};
    this.mouse = new Vector(0,0);
    this.mouseDown = false;
  }
  keyDown(key){
    this.keys[key] = true;
  }
  keyUp(key){
    delete this.keys[key];
  }
  mouseDown(){
    this.mouse = true;
  }
  mouseUp(){
    this.mouse = false;
  }
  mouseMove(x,y){
    this.mouse.x = x;
    this.mouse.y = y;
  }
};
module.exports = {
  UserControls
}
