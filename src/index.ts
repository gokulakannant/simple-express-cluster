import os from "os";
import cluster from "cluster";
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import { Express, Request, Response } from "express";
import { IWorker, ClusterOptions, WorkerData, SessionData } from "./types";

class Master {
    /**
     * Contains spawned workers
     */
    private workers: Map<number, cluster.Worker> = new Map();
    /**
     * Contains spawned workers data along with statuses
     */
    private _sessionData = <SessionData> {};

    /**
     * Create Master instance
     * @param simpleExpCluster
     */
    constructor(private simpleExpCluster: SimpleExpressCluster) {
        this._sessionData = <SessionData> {
            cluster_size: this.simpleExpCluster.options.cpus,
            master_process_id: process.pid,
            cluster_status: "running",
            workers: []
        };
    }

    /**
     * Create worker process based on given number of cpus count
     *
     * @returns Master
     */
    public get(): this {
        this.emitOutput(
            `Master started on pid ${process.pid}, forking ${this.simpleExpCluster.options.cpus} processes`
        );
        for (let index = 0; index < this.simpleExpCluster.options.cpus; index++) {
            this.emitOutput("Forking a new worker...!");
            const worker: IWorker = cluster.fork();
            worker.restartCount = 0;
            this.workers.set(worker.id, worker);
        }
        this.handleClusterEvents();
        this.storeProcessData();
        return this;
    }

    /**
     * A method to prepare the current session data for saving
     * @returns void
     */
    private storeProcessData(): void {
        if (!this.simpleExpCluster.options.has_express_instance) {
            return;
        }
        this._sessionData.workers = [];
        this.workers.forEach((eachWorker: IWorker) => {
            const workerInfo = <WorkerData> {
                "worker_id": eachWorker.id,
                "pid": eachWorker.process.pid,
                "status": eachWorker.status || "",
            };
            if (eachWorker.status == "exit") {
                workerInfo["reason"] = eachWorker.diedReason || "";
            }
            this._sessionData.workers.push(workerInfo);
        });
        this.writeFile(JSON.stringify(this._sessionData));
    }

    /**
     * A helper method to write the json file.
     * @param content Contains the data to store
     */
    private writeFile(content: string): void {
        fs.writeFile(this.simpleExpCluster._storageJson, content, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }

    /**
     * Attach the listeners for the cluster online, disconnect, exit, uncaughtException, SIGQUIT events
     */
    private handleClusterEvents(): void {
        cluster.on("online", (worker: IWorker) => {
            this.emitOutput(`Worker ${worker.process.pid} is online`);
            worker.status = "online";
            this.workers.set(worker.id, worker);
            this.storeProcessData();
        });

        cluster.on("disconnect", (worker: IWorker) => {
            this.emitOutput(`Worker ${worker.id} with PID ${worker.process.pid} disconnected.`);
            worker.status = "disconnect";
            this.workers.set(worker.id, worker);
            this.storeProcessData();
        });

        cluster.on("exit", (worker: IWorker, code: number, signal: string) => {
            this.emitOutput(`${worker.id} died with ${(signal || ("exit code " + code))} ${(this.simpleExpCluster.options.auto_restart ? ", Restarting...!" : "")}`);
            if (this.workers.has(worker.id)) {
                this.workers.delete(worker.id);
            }

            worker.status = "exit";
            worker.diedReason = `The worker died with exit code ${code}, and signal ${signal}`;
            this.workers.set(worker.id, worker);
            this.storeProcessData();

            if (this.simpleExpCluster.options.auto_restart &&
                this.simpleExpCluster.options.auto_restart_limit > worker.restartCount) {
                const newWorker: IWorker = cluster.fork();
                newWorker.restartCount = worker.restartCount + 1;
                this.workers.set(newWorker.id, newWorker);
            } else {
                this.emitOutput(`Maximum restart limit reached for worker ${worker.id}`);
            }

            this.storeProcessData();
        });

        process.on("uncaughtException", (error) => {
            this.emitOutput(`Uncaught exception: ${error.message}`);
            cluster.worker.disconnect();
        });

        process.on("SIGQUIT", () => {
            this.simpleExpCluster.options.auto_restart = false;
            this.emitOutput("QUIT received, will exit once all workers have finished current requests");
            this.workers.forEach((worker) => {
                worker.send("quit");
            });
        });
    }

    /**
     * Emit the output event to client instance.
     *
     * @param message String
     */
    private emitOutput(message: string) {
        this.simpleExpCluster.emit("output", `${new Date().toISOString()} :: ${message}` );
    }
}

class Worker {
    /**
     * Construct the Worker process instance
     * @param mainFunction
     */
    constructor(private mainFunction: Function) { }

    /**
     * Call the callback function with the current cluster worker
     * @returns Worker
     */
    public get() {
        this.mainFunction(cluster.worker);
        return this;
    }
}

class SimpleExpressCluster extends EventEmitter {
    /**
     * Contains cluster options
     */
    public options: ClusterOptions;
    /**
     * Denotes the path of the data.json file
     */
    public _storageJson: string = path.resolve(__dirname, "data.json");

    /**
     * Construct SimpleExpressCluster
     *
     * @param options ClusterOptions
     */
    constructor(options: ClusterOptions) {
        super();
        this.options = {
            cpus: os.cpus().length,
            auto_restart: false,
            auto_restart_limit: 3,
            has_express_instance: false,
            ...options
        };
    }

    /**
     * A initial method to invoke master or slave based on the cluster process
     *
     * @param callback Function
     * @returns {Master | Worker}
     */
    public run(callback?: Function): Master | Worker {
        if (cluster.isMaster) {
            return new Master(this).get();
        } else {
            let mainFunction: Function = function (worker: cluster.Worker) { };
            if (typeof callback === "function") {
                mainFunction = callback;
            }
            return new Worker(mainFunction).get();
        }
    }

    /**
     * The method is used to attach the healthcheck and stats apis
     *
     * @param express
     */
    public setExpress(express: Express): void {
        this.options.has_express_instance = true;
        express.get("/cluster/healthcheck", (req: Request, res: Response) => {
            res.send("Simple express cluster is runnging...!");
        });

        express.get("/cluster/stats", (req: Request, res: Response) => {
            fs.readFile(this._storageJson, (error, content: string | any) => {
                if (error) throw error;
                res.send(JSON.parse(content));
            });
        });
    }
}

export { SimpleExpressCluster };
export default SimpleExpressCluster;
