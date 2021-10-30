const socket = io('https://salty-chamber-63270.herokuapp.com/', { transports : ['websocket'] });
// const socket = io('http://localhost:3000/', { transports : ['websocket'] });
socket.on('startState', onStartState);
socket.on('gameState', onGameState);
socket.on('newState', onNewState);
socket.on('startBarriersStateChange', onStartBarriersStateChange);
socket.on('join', onJoin);
socket.on('leave', onLeave);
socket.on('pong', onPong);

var canvas = $e("canvas");
var ctx = canvas.getContext("2d");
var world;

var staticBodies;
var carWorld;
var stats;
var allControls;
var startBarriers;
var finishLine;
var state;//"wait", "countdown", "started", "ended"
var timer;
var COUNT_TIME;
var END_TIME;

var newParticlesIdx;
var myId;
var dt;
var draftPeriod;
var d;

var lastRecieve;
var physicsTime;
var timeDiff = 0;
var ping = 0;
function startGame(){
  world = new Physics.World();
  staticBodies = [];
  carWorld = new Car.World();
  stats = new Car.Stats();
  newParticlesIdx = [];
  socket.emit('joinGame');
}
function onStartState(e){
  myId = e.id;
  for (var i = 0; i < e.staticBodies.length; i++){
    staticBodies[i] = Physics.Body.generateBody(e.staticBodies[i]);
  }
  for (var i in e.cars){
    carWorld.addCar(e.cars[i]);
  }
  for (var i = 0; i < e.particles.length; i++){
    var p = e.particles[i];
    var idx = carWorld.pWorld.addParticle(new Car.Particle(p));
    sceneAddParticle(idx, p);
  }
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
  for (var i in carWorld.cars){
    world.addBody(carWorld.getCar(i).body);
  }
  finishLine = new Car.FinishLine(e.finishLine);
  startBarriers = new Car.BarrierWorld(e.startBarriers);
  if (startBarriers.enabled){
    for (var i = 0; i < startBarriers.bodies.length; i++){
      var body = startBarriers.bodies[i];
      world.addBody(body);
    }
  }
  allControls = {};
  for (var i in e.controls){
    if (i != myId){
      allControls[i] = new UserControls(e.controls[i]);
    }
  }
  dt = e.dt;
  draftPeriod = e.draftPeriod;
  d = e.d;
  timeDiff = Date.now() - e.serverTime;
  state = e.state;
  controlsQueue.start(dt);
  setInterval(()=>{
    socket.emit("ping", Date.now());
  }, 500);
  initScene(canvas, staticBodies, finishLine, startBarriers);
  for (var i in e.cars){
    addCar(e.cars[i]);
  }
  frameStep();
}
function onGameState(e){
  physicsTime = e.time;
  for (var i in e.cars){
    var c = carWorld.getCar(i);
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
  allControls = {};
  for (var i in e.controls){
    if (i != myId){
      allControls[i] = new UserControls(e.controls[i]);
    }
  }
  for (var i = 0; i < newParticlesIdx.length; i++){
    var idx = newParticlesIdx[i];
    carWorld.pWorld.removeParticle(idx);
    sceneRemoveParticle(idx);
  }
  newParticlesIdx = [];
  for (var i = 0; i < e.newParticles.length; i++){
    var particleToAdd = e.newParticles[i];
    var idx = carWorld.pWorld.addParticle(new Car.Particle(particleToAdd));
    sceneAddParticle(idx, particleToAdd);
  }
  d = e.d;
}
function onNewState(e){
  state = e;
}
function onStartBarriersStateChange(e){
  if (e){
    startBarriers.enable(world);
    sceneAddBarriers();
  } else{
    startBarriers.disable(world);
    sceneRemoveBarriers();
  }
}
function onJoin(e){
  var id = e.id;
  if (id == myId){
    return;
  }
  carWorld.addCar(e.car);
  addCar(e.car);
  world.addBody(carWorld.getCar(id).body);
}
function onLeave(e){
  var id = e.id;
  if (id == myId){
    return;
  }
  if (carWorld.getCar(id)){
    world.removeBody(carWorld.getCar(id).body);
  }
  carWorld.removeCar(id);
  removeCar(id);
}
function onPong(e){
  var t = Date.now();
  ping += 0.3 * ((t - e.cTime) - ping);
  var equivCTime = (t + e.cTime)/2;
  timeDiff += 0.3 * ((equivCTime - e.sTime) - timeDiff);
}
function frameStep(){
  requestAnimationFrame(frameStep);

  var sDispTime = Date.now() - timeDiff - ping/2;
  while (physicsTime < sDispTime){
    step(dt);
    physicsTime += dt*1000;
  }
  clearCanvas();
  var lerpTime = (sDispTime - physicsTime)/1000;
  display(lerpTime);
  var camState = carWorld.getCar(myId).body.lerpedState(lerpTime);
  updateCamera(camState);
  setCarPositions(carWorld, lerpTime);
  sceneUpdateParticles(carWorld.pWorld);
  render();
}
function display(timeDiff){
  var myCar = carWorld.getCar(myId);
  var state = myCar.body.lerpedState(timeDiff);
  // world.transform(ctx, ()=> {
  //   ctx.save();
  //   var translate = state.position;
  //   var dim = world.dimensionsInMeters();
  //   var halfDim = new Vector(dim.x/2, dim.y/2);
  //   ctx.translate(halfDim.x, halfDim.y);
  //   // ctx.rotate(-Math.PI/2 - state.angle);
  //   ctx.translate(-translate.x, -translate.y);
  //   var min = state.position.subtract(world.dimensionsInMeters().multiply(0.72));
  //   var max = state.position.add(world.dimensionsInMeters().multiply(0.72));

  //   ctx.lineWidth = 0.2;
  //   ctx.fillStyle = "rgba(255,0,255,0.5)";
  //   ctx.strokeStyle = "#f0f";
  //   finishLine.display(ctx);
  //   ctx.fillStyle = "rgba(0,255,0,0.5)";
  //   ctx.strokeStyle = "#0f0";
  //   world.displayRectStatic(ctx, min, max, timeDiff);
  //   ctx.fillStyle = "#fff";
  //   carWorld.pWorld.displayRect(ctx, min, max);
  //   ctx.strokeStyle = "#f00";
  //   myCar.displayDirection(ctx, timeDiff);
  //   for (var i in carWorld.cars){
  //     var c = carWorld.getCar(i);
  //     ctx.strokeStyle = "#fff";
  //     ctx.fillStyle = "#fff";
  //     c.displayWheels(ctx, timeDiff);
  //     ctx.strokeStyle = (i == myId ? "#0ff" : "#f80");
  //     ctx.fillStyle = (i == myId ? "rgba(0,255,255,0.5)" : "rgba(255,128,0,0.5)");
  //     c.displayBody(ctx, timeDiff);
  //   }

  //   ctx.restore();
  // });
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.save();
  ctx.translate(innerWidth/2, innerHeight - 100);
  stats.displaySteeringWheel(ctx);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.save();
  ctx.translate(100, innerHeight - 100);
  stats.displaySpeed(ctx);
  ctx.restore();
}
function step(dt){
  for (var i in allControls){
    var c = allControls[i];
    carWorld.getCar(i).updateInputs(c, dt);
  }
  carWorld.getCar(myId).updateInputs(controlsQueue.q.get(Math.min(Math.floor(ping /(1000*dt)), controlsQueue.q.size() - 1)), dt);

  carWorld.step(dt);
  stats.update(carWorld.getCar(myId), dt);
  d++;
  if (d >= draftPeriod){
    d = 0;
    var addIdx = carWorld.addCarParticles();
    for (var i = 0; i < addIdx.length; i++){
      var idx = addIdx[i];
      newParticlesIdx.push(idx);
      sceneAddParticle(idx, carWorld.pWorld.particles[idx]);
    }
  }
  world.step(dt);
}
function clearCanvas(){
  setCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
