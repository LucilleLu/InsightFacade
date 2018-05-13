import Server from "../src/rest/Server";
import fs = require("fs");
import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import { expect } from "chai";
import Log from "../src/Util";

import chaiHttp = require("chai-http");

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        return server.start().then(function (result: any) {
            if (result) {
                Log.trace("Server Start");
            }
        }).catch(function (err: any) {
            Log.trace("Failed to start server" + err);
        });
    });

    after(function () {
        // TODO: stop server here once!
        return server.stop().then(function (result: any) {
            if (result) {
                Log.trace("Server Stop");
            }
        }).catch(function (err: any) {
            Log.trace("Failed to stop server" + err);
        });
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    it("Server has started", function () {
        return chai.request("http://localhost:4321").get("/echo/310").then(function (response) {
            expect(response.body.result).to.equal("310...310");
        }).catch(function (err) {
            expect.fail();
            Log.trace("no good");
        });
    });

    // TODO: read your courses and rooms datasets here once!

    // Hint on how to test PUT requests
    it("PUT test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res: any) {
                    Log.trace("then:" + res.body);
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err: any) {
                    Log.trace("catch:" + err.body);
                });
        } catch (err) {
            expect.fail();
            Log.trace("try:catch:" + err.body);
        }
    });

    it("Should be able to get dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: any) {
                    Log.trace("then:" + res.body);
                    expect(res.status).to.equal(200);
                })
                .catch(function (err: any) {
                    Log.trace("catch:" + err);
                    expect.fail();
                });
        } catch (err) {
            expect.fail();
            Log.trace(err.body);
        }
    });
    it("Should be able to echo", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/echo/:msg").then(function (res: any) {
                    Log.trace("then:" + res.body);
                    expect(res.status).to.equal(200);
                })
                .catch(function (err: any) {
                    Log.trace("catch:" + err);
                    expect.fail();
                });
        } catch (err) {
            expect.fail();
            Log.trace(err.body);
        }
    });

    it("Should not be able to echo", function () {
        const res = Server.performEcho(null);
        Log.trace("then:" + res.body);
        expect(res.code).to.equal(400);
    });

    it("Should get item", function () {
        return chai.request("http://localhost:4321")
            .get("/")
            .then(function (res: any) {
                Log.trace("then" + res.body);
                expect(res.send).not.to.be.equal(500);
            })
            .catch(function (err: any) {
                Log.trace("catch" + err.body);
            });
    });

    it("POST 200", function () {
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send({
                    WHERE: {
                        GT: {
                            courses_avg: 97,
                        },
                    },
                    OPTIONS: {
                        COLUMNS: [
                            "courses_dept",
                            "courses_avg",
                        ],
                        ORDER: "courses_avg",
                        FORM: "TABLE",
                    },
                })
                .then(function (res: any) {
                    Log.trace("then:");
                    // some assertions
                    Log.trace(res.body);
                    expect(res.status).to.equal(200);
                })
                .catch(function (err: any) {
                    Log.trace("catch:" + err);
                    expect.fail();
                });
        } catch (err) {
            expect.fail();
            Log.trace(err.body);
        }
    });

    it("POST 400", function () {
        return chai.request("http://localhost:4321")
            .post("/query")
            .send({
                WHERE: {
                    GT: {
                    },
                },
                OPTIONS: {
                    COLUMNS: [
                        "courses_dept",
                        "courses_avg",
                    ],
                    ORDER: "courses_avg",
                    FORM: "TABLE",
                },
            })
            .then(function (res: any) {
                Log.trace("then:" + res);
                expect.fail();
            })
            .catch(function (err: any) {
                Log.trace("catch:" + err.body);
                expect(err.status).to.equal(400);

            });
    });

    it("del 204", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: any) {
                    expect(res.status).to.equal(204);
                    Log.trace("then:" + res.body);
                }).catch(function (err: any) {
                    Log.trace("catch:" + err);
                    expect.fail();
                });
        } catch (err) {
            expect.fail();
            Log.trace(err.body);
        }
    });

    // keep at the bottom, setting condition for query testing
    it("PUT test for courses dataset, set test environmen", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res: any) {
                    Log.trace("then " + res.body);
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err: any) {
                    Log.trace("catch " + err.body);
                });
        } catch (err) {
            expect.fail();
            Log.trace("try:catch:" + err.body);
        }
    });
    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
