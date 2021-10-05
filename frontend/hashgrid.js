var HashGrid = class{
  obj;
  constructor(){
    this.obj = {};
  }
  key(x, y){
    return x + " " + y;
  }
  clear(){
    this.obj = {};
  }
  add(x, y, elem){
    var hash = this.key(x,y);
    if (!this.obj[hash]){
      this.obj[hash] = new Set();
    }
    this.obj[hash].add(elem);
  }
  remove(x, y, elem){
    var hash = this.key(x,y);
    if (!this.obj[hash]){
      return false;
    }
    var successful = this.obj[hash].delete(elem);
    if (this.obj[hash].size == 0){
      delete this.obj[hash];
    } return successful;
  }
  get(x,y){
    var hash = this.key(x,y);
    return this.obj[hash];
  }
}
