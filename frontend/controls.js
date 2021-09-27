var Queue = class{
  startIdx;
  endIdx;
  ob;
  constructor(){
    this.startIdx = 0;
    this.endIdx = 0;
    this.ob = {};
  }
  insert(a){
    this.ob[this.endIdx++] = a;
  }
  remove(){
    var t = this.ob[this.startIdx];
    delete this.ob[this.startIdx++];
    return t;
  }
  getLastInserted(){
    return this.ob[this.endIdx - 1];
  }
  get(i){
    return this.ob[this.endIdx - i - 1];
  }
  size(){
    return this.endIdx - this.startIdx;
  }
}
var UserControls = class{
  keys;
  mouse;
  mouseDown;
  constructor(opts){
    opts = opts || {};
    this.keys = (opts.keys != undefined ? JSON.parse(JSON.stringify(opts.keys)) : {});
    this.mouse = Vector.copy(opts.mouse);
    this.mouseDown = (opts.mouseDown == undefined ? false : opts.mouseDown);
  }
  isKeyDown(key){
    return this.keys[key] == true;
  }
  keyDown(key){
    this.keys[key] = true;
  }
  keyUp(key){
    this.keys[key] = false;
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
var controlsQueue = {
  start : function(dt){
    this.q = new Queue();
    this.q.insert(new UserControls());
    setInterval(() =>{
      controls = new UserControls(this.q.getLastInserted());
      this.q.insert(controls);
      var maxSize = Math.floor(5 * ping/(1000 * dt) + 10);
      if (this.q.size() > maxSize){
        for (var i = 0; i < this.q.size() - maxSize; i++){
          this.q.remove();
        }
      }
    }, 1000 * dt);
  }
}
var controls;
window.addEventListener('keydown', function(e) {
  if (controls && !controls.isKeyDown(e.key)) {
    controls.keyDown(e.key);
    socket.emit('keydown', e.key);
  }
});
window.addEventListener('keyup', function(e) {
  if (controls && controls.isKeyDown(e.key)) {
    controls.keyUp(e.key);
    socket.emit('keyup', e.key);
  }
});
// const rect = canvas.getBoundingClientRect();
// window.addEventListener('mousemove', function(e) {
//   controls.mouse = new Vector(e.clientX - rect.left, e.clientY - rect.top);
// });
// window.addEventListener('mousedown', function(e) {
//   if (e.button == 0) {
//     controls.mouseDown = true;
//   }
// });
// window.addEventListener('mouseup', function(e) {
//   if (e.button == 0) {
//     controls.mouseDown = false;
//   }
// });
