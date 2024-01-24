var koa = require('koa');
var app = module.exports = new koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');

app.use(bodyParser());

app.use(cors());

app.use(middleware);

function middleware(ctx, next) {
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;
    console.log(`${start.toLocaleTimeString()} ${ctx.response.status} ${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
  });
}

const activities = [
  { id: 1, date: "2024-01-24", type: "Running", duration: 30.5, calories: 300.75, category: "Cardio", description: "Morning jog in the park", },
  { id: 2, date: "2024-01-25", type: "Weightlifting", duration: 45.0, calories: 200.25, category: "Strength Training", description: "Upper body workout at the gym", },
  { id: 3, date: "2024-01-26", type: "Yoga", duration: 60.75, calories: 150.5, category: "Flexibility", description: "Vinyasa flow session at home", },
  { id: 4, date: "2024-01-24", type: "Cycling", duration: 40.0, calories: 250.0, category: "Cardio", description: "Biking in the countryside", },
  { id: 5, date: "2024-01-25", type: "Swimming", duration: 55.25, calories: 350.5, category: "Cardio", description: "Lap swimming at the pool", },
  { id: 6, date: "2024-01-26", type: "Pilates", duration: 35.5, calories: 180.25, category: "Flexibility", description: "Core strengthening Pilates workout", },
  { id: 7, date: "2024-01-24", type: "Hiking", duration: 75.0, calories: 400.75, category: "Outdoor", description: "Mountain trail hiking", },
  { id: 8, date: "2024-01-25", type: "Running", duration: 28.0, calories: 280.0, category: "Cardio", description: "Evening run in the neighborhood", },
  { id: 9, date: "2024-02-01", type: "Yoga", duration: 65.5, calories: 160.25, category: "Flexibility", description: "Power yoga session at the studio", },
  { id: 10, date: "2024-02-02", type: "Weightlifting", duration: 50.0, calories: 220.5, category: "Strength Training", description: "Leg day at the gym", },
  { id: 11, date: "2024-02-03", type: "Cycling", duration: 45.25, calories: 280.75, category: "Cardio", description: "City bike ride", },
  { id: 12, date: "2024-02-01", type: "Swimming", duration: 60.0, calories: 320.25, category: "Cardio", description: "Swimming drills in the pool", },
  { id: 13, date: "2024-02-02", type: "Pilates", duration: 40.5, calories: 200.5, category: "Flexibility", description: "Mat Pilates workout at home", },
  { id: 14, date: "2024-02-03", type: "Hiking", duration: 80.75, calories: 420.0, category: "Outdoor", description: "Nature trail hiking", },
  { id: 15, date: "2024-02-01", type: "Running", duration: 32.0, calories: 310.0, category: "Cardio", description: "Sprint intervals at the track", },
];

const router = new Router();
router.get('/dayData', ctx => {
  const dates = activities.map(activity => activity.date);
  const uniqueDates = new Set(dates);
  ctx.response.body = [...uniqueDates];
  ctx.response.status = 200;
});

router.get('/activities/:date', ctx => {
  // console.log("ctx: " + JSON.stringify(ctx));
  const headers = ctx.params;
  const date = headers.date;
  // console.log("category: " + JSON.stringify(category));
  ctx.response.body = activities.filter(activity => activity.date == date);
  // console.log("body: " + JSON.stringify(ctx.response.body));
  ctx.response.status = 200;
});

router.get('/allActivities', ctx => {
  ctx.response.body = activities;
  ctx.response.status = 200;
});

const broadcast = (data) =>
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

router.post('/activity', ctx => {
  // console.log("ctx: " + JSON.stringify(ctx));
  const headers = ctx.request.body;
  // console.log("body: " + JSON.stringify(headers));
  const date = headers.date;
  const type = headers.type;
  const duration = headers.duration;
  const calories = headers.calories;
  const category = headers.category;
  const description = headers.description;
  if (typeof date !== 'undefined'
    && typeof type !== 'undefined'
    && typeof duration !== 'undefined'
    && typeof calories !== 'undefined'
    && typeof category !== 'undefined'
    && typeof description !== 'undefined') {
    const index = activities.findIndex(activity => activity.date == date && activity.type == type);
    if (index !== -1) {
      const msg = "The entity already exists!";
      console.log(msg);
      ctx.response.body = { text: msg };
      ctx.response.status = 404;
    } else {
      let maxId = Math.max.apply(Math, activities.map(activity => activity.id)) + 1;
      let activity = {
        id: maxId,
        date,
        type,
        duration,
        calories,
        category,
        description
      };
      activities.push(activity);
      broadcast(activity);
      ctx.response.body = activity;
      ctx.response.status = 200;
    }
  } else {
    const msg = "Missing or invalid date: " + date + " type: " + type + " duration: " + duration
      + " calories: " + calories + " category: " + category + " description: " + description;
    console.log(msg);
    ctx.response.body = { text: msg };
    ctx.response.status = 404;
  }
});

router.del('/activity/:id', ctx => {
  // console.log("ctx: " + JSON.stringify(ctx));
  const headers = ctx.params;
  // console.log("body: " + JSON.stringify(headers));
  const id = headers.id;
  if (typeof id !== 'undefined') {
    const index = activities.findIndex(activity => activity.id == id);
    if (index === -1) {
      const msg = "No entity with id: " + id;
      console.log(msg);
      ctx.response.body = { text: msg };
      ctx.response.status = 404;
    } else {
      let activity = activities[index];
      activities.splice(index, 1);
      ctx.response.body = activity;
      ctx.response.status = 200;
    }
  } else {
    ctx.response.body = { text: 'Id missing or invalid' };
    ctx.response.status = 404;
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 2425;

server.listen(port, () => {
  console.log(`🚀 Server listening on ${port} ... 🚀`);
});