# Simple Express Cluster

A simple and light weight library to implement the cluster for your node apps.

## Why use simple-express-cluster?

* Simple and easy to use.
* Works for both express and native node servers.
* Auto restart workers during uncaught exception until reach the maximum limit of restart count.
* Displaying running cluster status. (i.e) Healthcheck, stats.
* Zero dependancy.
* Typescript supported.

## Installation

To install the stable version:

Using [npm](https://www.npmjs.com/) as your package manager.

```bash
  npm install --save simple-express-cluster
```

Using [yarn](https://yarnpkg.com/en/) as your package manager.

```bash
  yarn add simple-express-cluster
```

## Usage

### Basic Usage

#### Example 1

```js
const express = require('express');
const SimpleExpressCluster = require('simple-express-cluster').SimpleExpressCluster;
const simpleExpCluster = new SimpleExpressCluster();
const app = express()
const port = 3000
app.get('/', function (req, res) {
    res.send('Hello World...!').end();
});
simpleExpCluster.run((worker) => {
    console.log(worker.process.pid)
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
});
```

#### Example 2

```js
const express = require('express');
const SimpleExpressCluster = require('simple-express-cluster').SimpleExpressCluster;
const simpleExpCluster = new SimpleExpressCluster({ cpus:2,  auto_restart: true, auto_restart_limit: 3 });
simpleExpCluster.on('output', (message) => console.log(message));
const app = express()
const port = 3000
app.get('/', function (req, res) {
    res.send('Hello World...!').end();
});
simpleExpCluster.setExpress(app);
simpleExpCluster.run((worker) => {
    console.log(worker.process.pid)
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
});
```

### API

#### **Config**

we can configure the default values by passing the config object to simple express cluster contructor

* `cpus` - Number of workers.
* `auto_restart` - Restart the worker on the process exit
* `auto_restart_limit` - Restart limit to avoid the round robin

```js
{
    cpus: 4,                // defaults to os.cpus().length
    auto_restart: false,    // defaults to false
    auto_restart_limit: 3   // defaults to 3
}
```

#### **run**

The run method will initialize cluster based on configuration. The current worker will be received in the argument callback itself.

```js
simpleExpCluster.run((worker) => {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
});
```

Note: Ensure that you have invoked the server `listen` method in the callback method

#### **setExpress**

Set the current express instance in simple express cluster. so that, the healthcheck and stats api will be attached in the given express instance.

```js
simpleExpCluster.setExpress(app);
```

Note: The `setExpress` method is only applicable for express servers.

#### ***/cluster/healthcheck***

Gives the cluster status

```bash
curl localhost:3000/cluster/healthcheck
> Simple express cluster is runnging...!

```

#### ***/cluster/stats***

Gives the cluster stats. (i.e) Number of worker, worker process ids..etc.

```bash
curl localhost:3000/cluster/stats
> {"cluster_size":2,"master_process_id":32183,"cluster_status":"running","workers":[{"worker_id":2,"pid":32191,"status":"online"},{"worker_id":1,"pid":32190,"status":"exit","reason":"The worker died with exit code 0, and signal null"},{"worker_id":3,"pid":32209,"status":"online"}]}
```

### Event

A customer event to notify the verbose logs

```js
simpleExpCluster.on('output', (message) => console.log(message));
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
