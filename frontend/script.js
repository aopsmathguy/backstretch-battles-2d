const socket = io('https://salty-chamber-63270.herokuapp.com/', { transports : ['websocket'] });
// const socket = io('http://localhost:3000/', { transports : ['websocket'] });

socket.on('startState', onStartState);
socket.on('gameState', onGameState);
socket.on('join', onJoin);
socket.on('leave', onLeave);
socket.on('pong', onPong);

var canvas = $e("canvas");
var ctx = canvas.getContext("2d");
var world;
var staticBodies;
var carWorld;
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
  }
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
  for (var i in carWorld.cars){
    world.addBody(carWorld.getCar(i).body);
  }
  dt = e.dt;
  draftPeriod = e.draftPeriod;
  d = e.d;
  controlsQueue.start(dt);
  setInterval(()=>{
    socket.emit("ping", Date.now());
  }, 500);
  frameStep();
}
function onGameState(e){
  physicsTime = e.time;
  for (var i in carWorld.cars){
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
  for (var i = 0; i < newParticlesIdx.length; i++){
    var idx = newParticlesIdx[i];
    carWorld.pWorld.removeParticle(idx);
  }
  newParticlesIdx = [];
  for (var i = 0; i < e.newParticles.length; i++){
    var particleToAdd = e.newParticles[i];
    var idx = carWorld.pWorld.addParticle(new Car.Particle(particleToAdd));
  }
  d = e.d;
}
function onJoin(e){
  var id = e.id;
  if (id == myId){
    return;
  }
  carWorld.addCar(e.car);
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
}
function onPong(e){
  var t = Date.now();
  if (ping){
    ping += 0.3 * ((t - e.cTime) - ping);
  } else{
    ping = (t - e.cTime);
  }
  var equivCTime = (t + e.cTime)/2;
  if (timeDiff){
    timeDiff += 0.3 * ((equivCTime - e.sTime) - ping);
  } else{
    timeDiff = (equivCTime - e.sTime);
  }
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
  var state = carWorld.getCar(myId).body.lerpedState(dt);
  world.transform(ctx, ()=> {
    ctx.save();
    var translate = state.position.subtract(world.dimensionsInMeters().multiply(0.5));
    ctx.translate(-translate.x, -translate.y);
    var min = state.position.subtract(world.dimensionsInMeters().multiply(0.5));
    var max = state.position.add(world.dimensionsInMeters().multiply(0.5));

    ctx.lineWidth = 0.3;
    ctx.fillStyle = "rgba(128,128,255,0)";
    ctx.strokeStyle = "#0f0";
    world.displayRectStatic(ctx, min, max, dt);
    ctx.fillStyle = "#fff";
    carWorld.pWorld.displayRect(ctx, min, max);
    ctx.strokeStyle = "#f00";
    carWorld.getCar(myId).displayDirection(ctx, dt);
    for (var i in carWorld.cars){
      var c = carWorld.getCar(i);
      ctx.strokeStyle = "#fff";
      ctx.fillStyle = "#fff";
      c.displayWheels(ctx, dt);
      ctx.strokeStyle = (i == myId ? "#0ff" : "#f80");
      ctx.fillStyle = "rgba(192,192,192,0)";
      c.displayBody(ctx, dt);
    }
    ctx.restore();
  });
}
function step(dt){
  carWorld.getCar(myId).updateInputs(controlsQueue.q.get(Math.min(Math.floor(ping /(1000*dt)), controlsQueue.q.size() - 1)), dt);
  carWorld.step(dt);
  d++;
  if (d >= draftPeriod){
    d = 0;
    var addIdx = carWorld.addCarParticles();
    for (var i = 0; i < addIdx.length; i++){
      var idx = addIdx[i];
      newParticlesIdx.push(idx);
    }
  }
  world.step(dt);
}
function clearCanvas(){
  canvas.width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  canvas.height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
