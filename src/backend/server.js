const express = require('express');
const app = express();
const port = 8080;

// Define a route
app.get('/', (req, res) => {
    res.send("Yo");
});

// Start the server
app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
});
