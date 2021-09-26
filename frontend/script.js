const socket = io('http://localhost:3000', { transports : ['websocket'] });

socket.on('startState', onStartState);
socket.on('gameState', onGameState);
socket.on('join', onJoin);

var canvas = $e("canvas");
var ctx = canvas.getContext("2d");
var world;
var staticBodies;
var cars;
var myId;
function startGame(){
  world = new Physics.World();
  staticBodies = [];
  cars = {};
  socket.emit('joinGame');
}
function onStartState(e){
  myId = e.id;
  for (var i = 0; i < e.staticBodies.length; i++){
    staticBodies[i] = Physics.Body.generateBody(e.staticBodies[i]);
  }
  for (var i in e.cars){
    cars[i] = new Car(e.cars[i]);
  }
  for (var i = 0; i < staticBodies.length; i++){
    console.log(staticBodies[i]);
    world.addBody(staticBodies[i]);
  }
  for (var i in cars){
    world.addBody(cars[i].body);
  }
  frameStep();
}
function onGameState(e){
  for (var i in cars){
    var c = cars[i];
    var o = e[i];
    c.gas = o.gas;
    c.brake = o.brake;
    c.eBrake = o.eBrake;
    c.steerAngle = o.steerAngle;
    c.netWheelForce = Vector.copy(o.netWheelForce);
    c.body.position = Vector.copy(o.body.position);
    c.body.velocity = Vector.copy(o.body.velocity);
    c.body.angle = o.body.angle;
    c.body.angleVelocity = o.body.angleVelocity;
  }
}
function onJoin(e){
  var id = e.id;
  if (id == myId){
    return;
  }
  cars[id] = new Car(e.car);
  world.addBody(cars[id].body);
}
function frameStep(){
  requestAnimationFrame(frameStep);
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
