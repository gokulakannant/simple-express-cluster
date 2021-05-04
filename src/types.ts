import { Worker } from "cluster";

interface IWorker extends Worker {
    restartCount?: number;
    status?: string;
    diedReason?: string;
}

interface IClusterOptions {
    cpus?: number;
    auto_restart?: boolean;
    auto_restart_limit?: number;
    has_express_instance?: boolean;
}

interface IWorkerData {
    worker_id: number;
    pid: number;
    status: string;
    reason?: string;
}

interface ISessionData {
    cluster_size: number;
    master_process_id: number;
    cluster_status: string;
    workers: Array<IWorkerData>;
}

export {
    IWorker,
    IClusterOptions as ClusterOptions,
    IWorkerData as WorkerData,
    ISessionData as SessionData
};
