var canvas = $e("canvas");
var ctx = canvas.getContext("2d");
var world;
var cars = {};
var myId;
var startGame = function(){
  world = new Physics.World();
  myId = 0;
  for (var i = 0; i< 20; i++){
    cars[i] = new Car();
    world.addBody(cars[i].body);
  }
  for (var i = 0; i < 100000; i++){
    var x = 5 * i;
    var boundary = new Physics.RectBody({
      length: 10, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, 20)
    });
    world.addBody(boundary);
    boundary = new Physics.RectBody({
      length: 10, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, 0)
    });
    world.addBody(boundary);
  }
  // world.step(0.001);
  frameStep();
}
var time = Date.now();
function frameStep(){
  var now = Date.now();
  var dt = Math.max((now - time)/1000,0.001);
  time = now;
  requestAnimationFrame(frameStep);
  // console.log(car.body.velocity);
  for (var i in cars){
    var c = cars[i];
    c.updateInputs(controls,dt);
    c.step(dt);
  }
  var substeps = 2;
  for (var i = 0; i < substeps; i++){
    world.step(dt/substeps);
  }
  clearCanvas();
  var centered = cars[myId].body.position;
  world.transform(ctx, ()=> {
    ctx.save();
    var translate = centered.subtract(world.dimensionsInMeters().multiply(0.5));
    ctx.translate(-translate.x, -translate.y);
    var min = centered.subtract(world.dimensionsInMeters().multiply(0.5));
    var max = centered.add(world.dimensionsInMeters().multiply(0.5));

    world.displayRect(ctx, min, max);
    for (var i in cars){
      var c = cars[i];
      c.display(ctx);
    }
    cars[myId].displayDirection(ctx);
    ctx.restore();
  });
}
function clearCanvas(){
  canvas.width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  canvas.height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
