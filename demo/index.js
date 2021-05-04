const express = require('express');
const SimpleExpressCluster = require('..').SimpleExpressCluster;

const simpleExpCluster = new SimpleExpressCluster({ cpus:2,  auto_restart: true, auto_restart_limit: 3 });
simpleExpCluster.on('output', (message) => console.log(message));

const app = express()
const port = 3000
app.get('/', function (req, res) {
    console.log('PID', process.pid, ' Blocking CPU')
    var i = 0;
    while (i < 10e9) {
      i++;
    }
    console.log('PID', process.pid, ' Unblocked, responding')
    res.send('Process ' + process.pid + ' says hello!').end();
});
simpleExpCluster.setExpress(app);
simpleExpCluster.run((worker) => {
    setTimeout(() => {
        if (worker.id == 1) {
            worker.disconnect();
        }
    }, 3000);
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
});
