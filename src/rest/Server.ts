/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {InsightResponse} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        const IF = new InsightFacade();
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });

                that.rest.use(restify.bodyParser({
                    mapParams: true,
                    mapFiles: true,
                }));

                that.rest.use(
                    function crossOrigin(req, res, next) {
                        Log.trace(req.method + " " + req.url);
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // NOTE: your endpoints should go here

                // submit a zip file that will be parsed and used for future queries
                that.rest.put("/dataset/:id/:kind",
                    function (req: restify.Request, res: restify.Response, next: restify.Next) {
                        let dataContent = new Buffer(req.params.body).toString("base64");
                        IF.addDataset(req.params.id, dataContent, req.params.kind)
                            .then(function (response: InsightResponse) {
                                res.json(response.code, response.body);
                            }).catch(function (err: InsightResponse) {
                            res.json(err.code, err.body);
                        });
                        return next();
                    });

                // sends the query to the application
                that.rest.post("/query", function (req: restify.Request, res: restify.Response, next: restify.Next) {
                    IF.performQuery(req.body)
                        .then(function (response: InsightResponse) {
                            res.status(response.code);
                            res.json(response.body);
                        }).catch(function (err: InsightResponse) {
                        res.status(err.code);
                        res.json(err.code, err.body);
                    });
                    return next();
                });

                // deletes the existing dataset stored
                that.rest.del("/dataset/:id",
                    function (req: restify.Request, res: restify.Response, next: restify.Next) {
                        IF.removeDataset(req.params.id)
                            .then(function (response: InsightResponse) {
                            res.json(response.code, response.body);
                        }).catch(function (err: InsightResponse) {
                            res.json(err.code, err.body);
                        });
                        return next();
                    });

                // returns a list of datasets
                that.rest.get("/datasets", function (req: restify.Request, res: restify.Response, next: restify.Next) {
                    IF.listDatasets().then (function (response: InsightResponse) {
                        res.json(response.code, response.body);
                    }).catch(function (err: InsightResponse) {
                        res.json(err.code, err.body);
                    });
                    return next();
                });

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const result = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + result.code);
            res.json(result.code, result.body);
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err.message});
        }
        return next();
    }

    public static performEcho(msg: string): InsightResponse {
        if (typeof msg !== "undefined" && msg !== null) {
            return {code: 200, body: {result: msg + "..." + msg}};
        } else {
            return {code: 400, body: {error: "Message not provided"}};
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
