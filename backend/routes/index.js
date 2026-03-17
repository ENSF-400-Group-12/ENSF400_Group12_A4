import { Router } from 'express'

// Import all the routes
import { taskRouter } from './tasks' 
//import { another_router } from './anotherfile'

// Use all these routes in the router
let apiRouter = Router() 
  .use('/tasks', taskRouter)
//.use('/anotherpath', another_router) 

export { apiRouter }
