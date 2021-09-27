const socket = io('https://salty-chamber-63270.herokuapp.com/', { transports : ['websocket'] });

socket.on('startState', onStartState);
socket.on('gameState', onGameState);
socket.on('join', onJoin);
socket.on('leave', onLeave);
socket.on('pong', onPong);

var canvas = $e("canvas");
var ctx = canvas.getContext("2d");
var world;
var staticBodies;
var cars;
var myId;
var dt;

var lastRecieve;
var physicsTime;
var timeDiff = 0;
var ping = 0;
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
  dt = e.dt;
  setInterval(()=>{
    socket.emit("ping", Date.now());
  }, 5000);
  frameStep();
}
function onGameState(e){
  physicsTime = e.time;
  for (var i in cars){
    var c = cars[i];
    var o = e.cars[i];
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
function onLeave(e){
  var id = e.id;
  if (id == myId){
    return;
  }
  world.removeBody(cars[id].body);
  delete cars[id];
}
function onPong(e){
  var t = Date.now();
  ping = t - e.cTime;
  var equivCTime = (t + e.cTime)/2;
  timeDiff = equivCTime - e.sTime;
}
function frameStep(){
  requestAnimationFrame(frameStep);

  var sDispTime = Date.now() - timeDiff - ping/2;
  while (physicsTime < sDispTime){
    step(dt);
    physicsTime += dt*1000;
  }

  clearCanvas();
  display((sDispTime - physicsTime)/1000);
}
function display(dt){
  var state = cars[myId].body.lerpedState(dt);
  world.transform(ctx, ()=> {
    ctx.save();
    var translate = state.position.subtract(world.dimensionsInMeters().multiply(0.5));
    ctx.translate(-translate.x, -translate.y);
    var min = state.position.subtract(world.dimensionsInMeters().multiply(0.5));
    var max = state.position.add(world.dimensionsInMeters().multiply(0.5));

    world.displayRect(ctx, min, max, dt);
    for (var i in cars){
      var c = cars[i];
      c.display(ctx, dt);
    }
    cars[myId].displayDirection(ctx, dt);
    ctx.restore();
  });
}
function step(dt){
  cars[myId].updateInputs(controls, dt);
  for (var i in cars){
    cars[i].step(dt);
  }
  world.step(dt);
}
function clearCanvas(){
  canvas.width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  canvas.height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
